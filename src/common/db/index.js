const { Pool } = require('pg');
const {
  PG_CONNECTION_OBJ,
  PG_TENANT_CONNECTION_OBJ,
  TENANT_CONTEXT,
} = require('../util/config');
const logger = require('../util/logger');

// Shared connection pools — created once and reused for the process lifetime. Creating a
// new Pool per query defeats pooling and churns/exhausts Postgres connections.
const tenantPool = new Pool(PG_TENANT_CONNECTION_OBJ);
const superAdminPool = new Pool(PG_CONNECTION_OBJ);

const testConnection = async () => {
  try {
    const query = await superAdminPool.query('select 1');
    logger.info(
      `db connection successful! Response: ${JSON.stringify(query.rows)}`,
    );
  } catch (error) {
    logger.error(`db connection unsuccessful. ${error}`);
  }
};

testConnection();

// Executes a single SQL query and logs the query(without parameters) and its execution time.
const query = async (text, params, mode = 'tenant') => {
  // SuperAdmin queries run against the superAdmin pool and need no tenant RLS context.
  if (mode === 'superAdmin') {
    const start = Date.now();
    const res = await superAdminPool.query(text, params);
    const duration = Date.now() - start;
    logger.info(
      `executed query: ${JSON.stringify({ text, duration, rows: res.rowCount })}`,
    );
    return res;
  }

  // Tenant queries: check out a single client and run the RLS SETs and the query on that
  // SAME connection, so the SET reliably applies to the query (required now that the pool
  // is shared). RESET ALL before release prevents the connection from carrying tenant state
  // back to the pool.
  const client = await tenantPool.connect();
  try {
    // Set tenant id as context for current_setting function in postgres. This enforces the
    // Row level security policy based on tenant id.
    await client.query(`SET app.current_tenant = '${TENANT_CONTEXT.tenantInfo}'`);
    await client.query(`SET app.current_userid = '${TENANT_CONTEXT.userInfo}'`);
    logger.info('tenant context has been successfully set');

    const start = Date.now();
    const res = await client.query(text, params);
    const duration = Date.now() - start;
    logger.info(
      `executed query: ${JSON.stringify({ text, duration, rows: res.rowCount })}`,
    );
    return res;
  } finally {
    try {
      await client.query('RESET ALL');
    } catch (resetError) {
      logger.error(`Failed to RESET connection before release: ${resetError.message}`);
    }
    client.release();
  }
};

// Gets a client from the pool to run several queries a row as a transaction.
// The function also provides basic diagnostic information (last executed query)
// if client is idle for > 5 seconds, so that any leaks can be tracked down.
// NOTE: Tenant mode needs to be tested more extensively for bugs and edge cases
// before it is utilized by tenant routes
const getClient = async (mode = 'tenant') => {
  // Use the shared pools (created once) instead of a per-call pool.
  const pool = mode === 'superAdmin' ? superAdminPool : tenantPool;

  const client = await pool.connect();

  // Set tenant id and user id as context for current_setting function in postgres. This enforces
  // the Row level security policy based on tenant id.
  // The variable is valid for a db session (unless reassigned)
  if (mode === 'tenant') {
    const setTenantQuery = `SET app.current_tenant = '${TENANT_CONTEXT.tenantInfo}'`;
    await client.query(setTenantQuery);

    const setTenantUserQuery = `SET app.current_userid = '${TENANT_CONTEXT.userInfo}'`;
    await client.query(setTenantUserQuery);
  }
  // The variable name is 'originalQuery' because 'query' is already defined in upper scope.
  const originalQuery = client.query;
  const { release } = client;
  // set a timeout of 5 seconds, after which we will log this client's last query
  const timeout = setTimeout(() => {
    logger.error('A client has been checked out for more than 5 seconds!');
    logger.error(
      `The last executed query on this client was: ${JSON.stringify(
        client.lastQuery,
      )}`,
    );
  }, 5000);
  // monkey patch the query method to keep track of the last query executed
  client.query = (...args) => {
    client.lastQuery = args;
    return originalQuery.apply(client, args);
  };
  client.release = () => {
    // clear our timeout
    clearTimeout(timeout);
    // set the methods back to their old un-monkey-patched version
    client.query = originalQuery;
    client.release = release;
    return release.apply(client);
  };
  return client;
};

module.exports = {
  query,
  getClient,
};
