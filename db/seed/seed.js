/* eslint-disable no-console */

/*
 * Populates a migrated database with a realistic working dataset.
 *
 * Idempotent: global reference data is inserted only where a row of that name is
 * missing, and an org is skipped entirely if its name is already present
 * (org_details.org_name is unique). Running this twice leaves the same database, so
 * it is safe to point at an environment without first checking what is there.
 *
 * To rebuild the seeded tenants from scratch, use db:seed:reset, which deletes them
 * first. This script will not overwrite data that already exists.
 *
 * Run with: npm run db:seed
 */
const { connect, clearTenantContext } = require('./lib/connect');
const { seedOrg } = require('./orgSeed');
const { seedReference, loadReferences } = require('./reference');
const { ORGS } = require('./data/orgs');

const main = async () => {
  const client = await connect();
  const started = Date.now();

  try {
    const { rows } = await client.query('select current_database() as db, current_user as usr');
    console.log(`Seeding ${rows[0].db} as ${rows[0].usr}`);

    await client.query('BEGIN');

    await seedReference(client);
    const refs = await loadReferences(client);
    console.log('Reference data ready.');

    for (const spec of ORGS) {
      // eslint-disable-next-line no-await-in-loop
      const { rows: existing } = await client.query(
        'SELECT org_id FROM org_details WHERE org_name = $1',
        [spec.orgName],
      );

      if (existing.length > 0) {
        console.log(`  ${spec.orgName}: already present, skipped. Use db:seed:reset to rebuild.`);
        // eslint-disable-next-line no-continue
        continue;
      }

      console.log(`  ${spec.orgName}: seeding ${spec.contactCount} contacts...`);
      // eslint-disable-next-line no-await-in-loop
      const summary = await seedOrg(client, spec, refs);
      console.log(`    ${Object.entries(summary)
        .filter(([key]) => !['orgName', 'orgId'].includes(key))
        .map(([key, value]) => `${key}=${value}`)
        .join(' ')}`);
      console.log(`    sign in as: ${spec.demoEmail}`);
    }

    await clearTenantContext(client);
    await client.query('COMMIT');

    console.log(`Seed complete in ${((Date.now() - started) / 1000).toFixed(1)}s.`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
};

main().catch((error) => {
  console.error(`Seed failed: ${error.message}`);
  if (error.detail) console.error(`  detail: ${error.detail}`);
  process.exit(1);
});
