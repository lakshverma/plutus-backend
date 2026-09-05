/* eslint-disable no-console */

/*
 * Rebuilds the seeded tenants from scratch.
 *
 * db:seed deliberately refuses to touch an org that already exists, so it cannot
 * restore records that have been edited or deleted. This script removes the seeded
 * orgs and their data outright, then seeds them again. On a publicly reachable
 * environment it runs nightly, so anything a visitor changes lives for at most a day.
 *
 * It only ever deletes the orgs named in data/orgs.js. Any other tenant in the same
 * database is left alone, which is what makes it safe to run against an environment
 * that holds more than the seeded data.
 *
 * Run with: npm run db:seed:reset
 */
const { connect, setTenantContext, clearTenantContext } = require('./lib/connect');
const { seedOrg } = require('./orgSeed');
const { ORGS } = require('./data/orgs');
const { loadReferences, seedReference } = require('./reference');

/*
 * Child tables before their parents. contact is late because most activity tables
 * reference it, and the catalogue tables come after the rows that point at them.
 */
const DELETE_ORDER = [
  // tasks_meta reaches org data only through task, so it is filtered by subquery.
  { table: 'tasks_meta', where: 'task_task_id IN (SELECT task_id FROM task WHERE org_id = $1)' },
  { table: 'transaction', where: 'org_id = $1' },
  { table: 'deal_scheme', where: 'org_id = $1' },
  { table: 'deal', where: 'org_id = $1' },
  { table: 'task', where: 'org_id = $1' },
  { table: 'note', where: 'org_id = $1' },
  { table: 'call', where: 'org_id = $1' },
  { table: 'meeting', where: 'org_id = $1' },
  { table: 'email', where: 'org_id = $1' },
  { table: 'contact_product_preference', where: 'org_id = $1' },
  { table: 'contact_correspondence', where: 'org_id = $1' },
  { table: 'contact', where: 'org_id = $1' },
  { table: 'scheme_broker', where: 'org_id = $1' },
  { table: 'scheme', where: 'org_id = $1' },
  { table: 'company_product', where: 'org_id = $1' },
  { table: 'company', where: 'org_id = $1' },
  { table: 'product', where: 'org_id = $1' },
  { table: 'broker', where: 'org_id = $1' },
  { table: 'deal_stage', where: 'org_id = $1' },
  { table: 'transaction_mode', where: 'org_id = $1' },
  { table: 'contact_type', where: 'org_id = $1' },
  { table: 'group_codes', where: 'org_id = $1' },
  { table: 'org_user', where: 'org_id = $1' },
  { table: 'org_details', where: 'org_id = $1' },
];

// org_id is text on the audit tables rather than uuid: the trigger functions write it
// straight from current_setting('app.current_tenant'), which is a string.
const AUDIT_TABLES = [
  'audit.activity_contact_log',
  'audit.contact_property_log',
  'audit.other_activity_log',
];

const deleteOrg = async (client, orgId) => {
  let removed = 0;

  for (const step of DELETE_ORDER) {
    // eslint-disable-next-line no-await-in-loop
    const { rowCount } = await client.query(
      `DELETE FROM ${step.table} WHERE ${step.where}`,
      [orgId],
    );
    removed += rowCount;
  }

  // Last, and deliberately so: the deletes above fire the audit triggers, which write
  // a row for every record they remove. Clearing the audit tables first would leave
  // the tombstones of this very reset behind.
  for (const table of AUDIT_TABLES) {
    // eslint-disable-next-line no-await-in-loop
    const { rowCount } = await client.query(`DELETE FROM ${table} WHERE org_id = $1`, [orgId]);
    removed += rowCount;
  }

  return removed;
};

const main = async () => {
  const client = await connect();
  const started = Date.now();

  try {
    const { rows } = await client.query('select current_database() as db');
    console.log(`Resetting seeded tenants in ${rows[0].db}`);

    await client.query('BEGIN');

    await seedReference(client);
    const refs = await loadReferences(client);

    for (const spec of ORGS) {
      // eslint-disable-next-line no-await-in-loop
      const { rows: existing } = await client.query(
        'SELECT org_id FROM org_details WHERE org_name = $1',
        [spec.orgName],
      );

      if (existing.length > 0) {
        const orgId = existing[0].org_id;
        // The audit triggers raise without a tenant context, so the deletes need one
        // set even though the rows are on their way out.
        // eslint-disable-next-line no-await-in-loop
        await setTenantContext(client, orgId, '00000000-0000-0000-0000-000000000000');
        // eslint-disable-next-line no-await-in-loop
        const removed = await deleteOrg(client, orgId);
        console.log(`  ${spec.orgName}: removed ${removed} rows`);
      }

      // eslint-disable-next-line no-await-in-loop
      const summary = await seedOrg(client, spec, refs);
      console.log(`  ${spec.orgName}: reseeded ${summary.contacts} contacts`);
    }

    await clearTenantContext(client);
    await client.query('COMMIT');

    // Deleting and reinserting the same volume every night leaves the old row
    // versions behind as dead tuples. A plain VACUUM (outside the transaction, and
    // without the exclusive lock VACUUM FULL takes) marks that space reusable, so
    // the next run fills it rather than extending the files and the database settles
    // at a steady size instead of growing on every reset.
    await client.query('VACUUM');

    console.log(`Reset complete in ${((Date.now() - started) / 1000).toFixed(1)}s.`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
};

main().catch((error) => {
  console.error(`Reset failed: ${error.message}`);
  if (error.detail) console.error(`  detail: ${error.detail}`);
  process.exit(1);
});
