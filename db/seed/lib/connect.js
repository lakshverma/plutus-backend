/*
 * Database connection for the seed scripts.
 *
 * Shares the pure connection helpers with the application but not its config module,
 * which validates variables the seeds do not need (a JWT secret, for one) and refuses
 * to load without them; that would make seeding a bare database impossible.
 *
 * Seeds connect as plutus_admin from DATABASE_URL. That role bypasses row-level
 * security by owning the tables, which is what lets one connection insert rows for
 * several orgs. plutus_tenant could not: its policies would reject every row whose
 * org_id did not match the current context.
 */
const { Client } = require('pg');
const { buildSslOptions, stripSslParams } = require('../../../src/common/util/pgConnection');

require('dotenv').config();

const connect = async () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. See .env.example.');
  }

  const client = new Client({
    connectionString: stripSslParams(connectionString),
    ssl: buildSslOptions(),
  });
  await client.connect();
  return client;
};

/*
 * The audit triggers read app.current_tenant and app.current_userid through
 * current_setting() with no missing_ok argument, so they raise when it is unset.
 * Their exception handler swallows that and skips the audit row, which would leave
 * the timeline and audit views empty for seeded data. Setting the context makes the
 * triggers record the seeded rows exactly as they would record a user's edits.
 */
const setTenantContext = async (client, orgId, userId) => {
  await client.query('select set_config($1, $2, false)', ['app.current_tenant', orgId]);
  await client.query('select set_config($1, $2, false)', ['app.current_userid', userId]);
};

const clearTenantContext = async (client) => {
  await client.query('select set_config($1, $2, false)', ['app.current_tenant', '']);
  await client.query('select set_config($1, $2, false)', ['app.current_userid', '']);
};

/*
 * Inserts many rows in one statement per batch.
 *
 * The rows travel as a single JSON parameter rather than as a VALUES list of bind
 * placeholders, which matters more than it looks: the audit triggers record
 * current_query() against every row they fire for, and current_query() returns the
 * statement *text*. A thousand-row VALUES list is a hundred kilobytes of placeholder
 * tuples, and the triggers would store a copy of all of it once per row. Measured on
 * a full seed, that single effect accounted for 332 MB of a 347 MB database.
 *
 * jsonb_populate_recordset keeps the statement text short and constant whatever the
 * row count, and takes its column types from the table's own row type, so no type
 * annotations have to be maintained here.
 */
const insertMany = async (client, { table, columns, rows }, { returning = null } = {}) => {
  if (rows.length === 0) return [];

  // Batched so a single statement's JSON payload stays a reasonable size.
  const maxRowsPerStatement = 2000;
  const collected = [];
  const columnList = columns.join(', ');

  for (let start = 0; start < rows.length; start += maxRowsPerStatement) {
    const batch = rows.slice(start, start + maxRowsPerStatement).map((row) => {
      const record = {};
      columns.forEach((column, index) => {
        const value = row[index];
        record[column] = value instanceof Date ? value.toISOString() : value;
      });
      return record;
    });

    const sql = `INSERT INTO ${table} (${columnList})
       SELECT ${columnList} FROM jsonb_populate_recordset(NULL::${table}, $1::jsonb)${
  returning ? ` RETURNING ${returning}` : ''}`;

    // eslint-disable-next-line no-await-in-loop
    const { rows: returned } = await client.query(sql, [JSON.stringify(batch)]);
    if (returning) collected.push(...returned);
  }

  return collected;
};

module.exports = {
  connect, setTenantContext, clearTenantContext, insertMany,
};
