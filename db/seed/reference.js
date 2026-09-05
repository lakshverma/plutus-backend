/*
 * Global reference data, shared by db:seed and db:seed:reset.
 *
 * None of these tables has an org_id or a row-level security policy: they are lookups
 * every tenant reads, so they are inserted once and never removed by a tenant reset.
 */
const {
  CITIES, PROFESSIONS, RESIDENCE_STATUSES, REGISTRARS,
} = require('./data/india');

// Ids 1 to 4 are hardcoded in src/common/util/helper.js and in the frontend's route
// guard, so they cannot be left to the identity sequence.
const USER_ROLES = [
  [1, 'superAdmin'],
  [2, 'admin'],
  [3, 'standard'],
  [4, 'limited'],
];

const SUBSCRIPTION_PLANS = [
  ['Starter', 'monthly', 1499],
  ['Professional', 'monthly', 3999],
  ['Enterprise', 'annual', 39999],
];

// Inserts a row only when one of that name is absent, so every caller is idempotent
// without needing a unique constraint that the schema does not have.
const insertIfMissing = async (client, { table, columns, keyColumn }, values) => {
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  await client.query(
    `INSERT INTO ${table} (${columns.join(', ')})
     SELECT ${placeholders}
     WHERE NOT EXISTS (SELECT 1 FROM ${table} WHERE ${keyColumn} = $1)`,
    values,
  );
};

const seedReference = async (client) => {
  // user_roles.user_roles_id is GENERATED ALWAYS, so forcing the required ids needs
  // OVERRIDING SYSTEM VALUE. The identity sequence is advanced past them afterwards
  // so a later insert cannot collide.
  await client.query(
    `INSERT INTO user_roles (user_roles_id, role_type)
     OVERRIDING SYSTEM VALUE
     SELECT v.id, v.role FROM (VALUES ($1::int,$2::text),($3,$4),($5,$6),($7,$8)) AS v(id, role)
     WHERE NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_roles_id = v.id)`,
    USER_ROLES.flat(),
  );
  await client.query(
    `SELECT setval(pg_get_serial_sequence('user_roles','user_roles_id'),
       (SELECT MAX(user_roles_id) FROM user_roles))`,
  );

  for (const [name, type, cost] of SUBSCRIPTION_PLANS) {
    // eslint-disable-next-line no-await-in-loop
    await insertIfMissing(client, {
      table: 'subscription_plans',
      columns: ['plan_name', 'plan_type', 'plan_cost_inr'],
      keyColumn: 'plan_name',
    }, [name, type, cost]);
  }

  for (const city of CITIES) {
    // eslint-disable-next-line no-await-in-loop
    await insertIfMissing(client, {
      table: 'city',
      columns: ['city_name', 'country_name'],
      keyColumn: 'city_name',
    }, [city.name, 'India']);
  }

  for (const profession of PROFESSIONS) {
    // eslint-disable-next-line no-await-in-loop
    await insertIfMissing(client, {
      table: 'profession',
      columns: ['profession_name'],
      keyColumn: 'profession_name',
    }, [profession]);
  }

  for (const status of RESIDENCE_STATUSES) {
    // eslint-disable-next-line no-await-in-loop
    await insertIfMissing(client, {
      table: 'residence_status',
      columns: ['residence_status'],
      keyColumn: 'residence_status',
    }, [status]);
  }

  for (const registrar of REGISTRARS) {
    // eslint-disable-next-line no-await-in-loop
    await insertIfMissing(client, {
      table: 'registrar',
      columns: ['registrar_name', 'registrar_address', 'registrar_contact_number',
        'registrar_contact_person', 'registrar_email'],
      keyColumn: 'registrar_name',
    }, [registrar.name, registrar.address, registrar.contactNumber,
      registrar.contactPerson, registrar.email]);
  }
};

// Reads back the ids the org seeding points its foreign keys at.
const loadReferences = async (client) => {
  const [plans, cities, professions, residenceStatuses, registrars] = await Promise.all([
    client.query('SELECT plan_id, plan_name FROM subscription_plans ORDER BY plan_cost_inr'),
    client.query('SELECT city_id, city_name FROM city'),
    client.query('SELECT profession_id FROM profession'),
    client.query('SELECT residence_status_id, residence_status FROM residence_status'),
    client.query('SELECT registrar_id FROM registrar'),
  ]);

  const cityIdByName = {};
  cities.rows.forEach((row) => { cityIdByName[row.city_name] = row.city_id; });

  const residenceStatusByName = {};
  residenceStatuses.rows.forEach((row) => {
    residenceStatusByName[row.residence_status] = row.residence_status_id;
  });

  return {
    planId: plans.rows.find((p) => p.plan_name === 'Professional').plan_id,
    cityIds: cities.rows.map((r) => r.city_id),
    cityIdByName,
    professionIds: professions.rows.map((r) => r.profession_id),
    residenceStatusByName,
    registrarIds: registrars.rows.map((r) => r.registrar_id),
  };
};

module.exports = { seedReference, loadReferences };
