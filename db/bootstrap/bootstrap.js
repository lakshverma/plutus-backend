/* eslint-disable no-console */

/*
 * Creates the application's two database roles, once per database, before the
 * first migration. See roles.sql alongside this file for what each role is for and why
 * this is not itself a migration.
 *
 * Run with: npm run db:bootstrap
 *
 * Reads:
 *   DATABASE_URL_BOOTSTRAP  the role the provider created the database with; the
 *                           only step that ever uses it
 *   ADMIN_DB_PASSWORD       password to set on plutus_admin
 *   TENANT_DB_PASSWORD      password to set on plutus_tenant
 *
 * Afterwards, DATABASE_URL should point at plutus_admin and DATABASE_URL_TENANT at
 * plutus_tenant. The script prints both, with the passwords left as placeholders.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { buildSslOptions, stripSslParams } = require('../../src/common/util/pgConnection');

require('dotenv').config();

const ROLES_SQL = path.join(__dirname, 'roles.sql');

// The same host and database as the bootstrap URL, with the role swapped in and the
// password shown as the variable it should come from.
const describeUrlFor = (bootstrapUrl, role, passwordVar) => {
  try {
    const url = new URL(bootstrapUrl);
    url.username = role;
    url.password = '';
    return url.toString().replace(`${role}@`, `${role}:<${passwordVar}>@`);
  } catch (error) {
    return `(same host and database as DATABASE_URL_BOOTSTRAP, as ${role})`;
  }
};

const main = async () => {
  const bootstrapUrl = process.env.DATABASE_URL_BOOTSTRAP;
  const adminPassword = process.env.ADMIN_DB_PASSWORD;
  const tenantPassword = process.env.TENANT_DB_PASSWORD;

  const missing = [
    ['DATABASE_URL_BOOTSTRAP', bootstrapUrl],
    ['ADMIN_DB_PASSWORD', adminPassword],
    ['TENANT_DB_PASSWORD', tenantPassword],
  ].filter(([, value]) => !value).map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(`${missing.join(', ')} not set. See .env.example.`);
  }

  const client = new Client({
    connectionString: stripSslParams(bootstrapUrl),
    ssl: buildSslOptions(),
  });

  await client.connect();

  // Surface the NOTICEs from the DO block so the run says what it actually did.
  client.on('notice', (notice) => console.log(`  ${notice.message}`));

  try {
    const { rows } = await client.query('select current_database() as db, current_user as usr');
    console.log(`Bootstrapping ${rows[0].db} as ${rows[0].usr}`);

    // Bound parameters, so neither password ever appears in SQL text. roles.sql
    // reads them back with current_setting.
    await client.query('select set_config($1, $2, false)', ['plutus.admin_password', adminPassword]);
    await client.query('select set_config($1, $2, false)', ['plutus.tenant_password', tenantPassword]);
    await client.query(fs.readFileSync(ROLES_SQL, 'utf8'));

    console.log('');
    console.log('Bootstrap complete. Point the application at the new roles:');
    console.log(`  DATABASE_URL=${describeUrlFor(bootstrapUrl, 'plutus_admin', 'ADMIN_DB_PASSWORD')}`);
    console.log(`  DATABASE_URL_TENANT=${describeUrlFor(bootstrapUrl, 'plutus_tenant', 'TENANT_DB_PASSWORD')}`);
    console.log('Then: npm run db:migrate');
  } finally {
    await client.end();
  }
};

main().catch((error) => {
  console.error(`Bootstrap failed: ${error.message}`);
  if (/permission denied|must be superuser|CREATEROLE/i.test(error.message)) {
    console.error(
      'DATABASE_URL_BOOTSTRAP must be a role allowed to create roles: on a managed '
      + 'provider, the one the database was created with.',
    );
  }
  process.exit(1);
});
