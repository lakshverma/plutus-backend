const {
  PG_CONNECTION_OBJ,
  PG_TENANT_CONNECTION_OBJ,
  TENANT_CONTEXT,
} = require("../util/config");
const { Pool } = require("pg");
const logger = require("../util/logger");

const testConnection = async () => {
  const pool = new Pool(PG_CONNECTION_OBJ);
  try {
    const query = await pool.query("select 1");
    logger.info(
      `db connection successful! Response: ${JSON.stringify(query.rows)}`
    );
  } catch (error) {
    logger.error(`db connection unsuccessful. ${error}`);
  }
};

testConnection();

// Executes a single SQL query and logs the query(without parameters) and its execution time.
const query = async (text, params, mode = "tenant") => {
  let pool = null;

  // Conditionally change PG_CONNECTION_OBJ based on whether the user connecting is tenant or superadmin
  if ((mode = "superAdmin")) {
    pool = new Pool(PG_CONNECTION_OBJ);
  } else {
    pool = new Pool(PG_TENANT_CONNECTION_OBJ);

    // Set tenant id as context for current_setting function in postgres. This enforces the Row level security policy based on tenant id.
    // The variable is valid for a db session (unless reassigned)
    const setTenantContext = await pool.query("SET app.current_tenant = $1", [
      TENANT_CONTEXT.tenantInfo,
    ]);
  }

  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  logger.info(
    `executed query: ${JSON.stringify({ text, duration, rows: res.rowCount })}`
  );
  return res;
};

// Gets a client from the pool to run several queries a row as a transaction.
// The function also provides basic diagnostic information (last executed query)
// if client is idle for > 5 seconds so that any leaks can be tracked down.
// NOTE: Tenant mode needs to be tested more extensively for bugs and edge cases before it is utilized by tenant routes
const getClient = async (mode = "tenant") => {
  let pool = null;

  // Conditionally change PG_CONNECTION_OBJ based on whether the user connecting is tenant or superadmin
  if ((mode = "superAdmin")) {
    pool = new Pool(PG_CONNECTION_OBJ);
  } else {
    pool = new Pool(PG_TENANT_CONNECTION_OBJ);
  }

  const client = await pool.connect();

  // Set tenant id as context for current_setting function in postgres. This enforces the Row level security policy based on tenant id.
  // The variable is valid for a db session (unless reassigned)
  if (mode === "tenant") {
    await client.query("SET app.current_tenant = $1", [
      TENANT_CONTEXT.tenantInfo,
    ]);
  }
  const query = client.query;
  const release = client.release;
  // set a timeout of 5 seconds, after which we will log this client's last query
  const timeout = setTimeout(() => {
    logger.error("A client has been checked out for more than 5 seconds!");
    logger.error(
      `The last executed query on this client was: ${JSON.stringify(
        client.lastQuery
      )}`
    );
  }, 5000);
  // monkey patch the query method to keep track of the last query executed
  client.query = (...args) => {
    client.lastQuery = args;
    return query.apply(client, args);
  };
  client.release = () => {
    // clear our timeout
    clearTimeout(timeout);
    // set the methods back to their old un-monkey-patched version
    client.query = query;
    client.release = release;
    return release.apply(client);
  };
  return client;
};

module.exports = {
  query,
  getClient,
};
