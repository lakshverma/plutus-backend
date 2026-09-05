/* eslint-disable camelcase */
require('dotenv').config();
const { AsyncLocalStorage } = require('async_hooks');
const logger = require('./logger');
const { buildSslOptions, stripSslParams, describeTarget } = require('./pgConnection');

// Per-request store so concurrent requests never share tenant/user identity.
// Each request runs inside tenantStorage.run({ orgId, userId }, ...) (see app.js),
// and TENANT_CONTEXT reads/writes the current request's store rather than a global.
const tenantStorage = new AsyncLocalStorage();

// Every setting below is read from one environment variable whatever the environment
// is — no NODE_ENV branching. What runs locally is what runs in production, differing
// only in values, and those values live in different places: development values in a
// local .env, production values only in the hosting platform's environment. Nothing
// production-scoped is ever present on a developer machine. See .env.example.

// A missing connection string used to surface as `new Pool(null)`, which silently
// falls back to libpq defaults: a server that starts, reports healthy, then fails
// every query. Refuse to load instead. Throwing rather than logging-then-exiting
// guarantees the reason reaches stderr before the process dies.
const REQUIRED_ENV_VARS = ['DATABASE_URL', 'DATABASE_URL_TENANT', 'SECRET'];

const missingEnvVars = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);
if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(', ')}. See .env.example.`,
  );
}

if (process.env.SECRET.length < 32) {
  logger.warn(
    'SECRET is shorter than 32 characters. Generate a stronger one with `openssl rand -hex 32`.',
  );
}

// TLS mode (PGSSL_MODE), connection-string handling and the redacted target used in
// the startup log come from ./pgConnection, which the scripts under db/ share.

// Sized well below a small managed Postgres' connection cap: the API runs as a single
// instance and each request holds a client only for the length of a query.
const buildPoolConfig = (connectionString) => ({
  connectionString: stripSslParams(connectionString),
  ssl: buildSslOptions(),
  max: Number(process.env.PG_POOL_MAX) || 5,
  idleTimeoutMillis: 30 * 1000,
  // Generous on purpose: a serverless Postgres may take a second or two to resume
  // from idle before it accepts the first connection.
  connectionTimeoutMillis: 10 * 1000,
});

// plutus_admin: owns every table, so it bypasses RLS by ownership (FORCE ROW LEVEL
// SECURITY is deliberately off). Used by the superAdmin pool, migrations and seeds.
const PG_CONNECTION_OBJ = buildPoolConfig(process.env.DATABASE_URL);

// plutus_tenant: owns nothing and has BYPASSRLS = false, so the tenant isolation
// policies genuinely bind. Every tenant request runs through this pool. The two-pool
// model is described in PROJECT_DOCUMENTATION.md, section 6.
const PG_TENANT_CONNECTION_OBJ = buildPoolConfig(process.env.DATABASE_URL_TENANT);

const DB_TARGETS = {
  superAdmin: describeTarget(process.env.DATABASE_URL),
  tenant: describeTarget(process.env.DATABASE_URL_TENANT),
};

// orgId/userId are backed by the per-request AsyncLocalStorage store, so each request
// reads/writes its own tenant identity. The tenantInfo/userInfo accessors are unchanged.
// Outside a request (e.g. module-load testConnection) the store is undefined and these
// read as '' and ignore writes.
const TENANT_CONTEXT = {
  get orgId() {
    const store = tenantStorage.getStore();
    return store ? store.orgId : '';
  },
  set orgId(value) {
    const store = tenantStorage.getStore();
    if (store) store.orgId = value;
  },
  get userId() {
    const store = tenantStorage.getStore();
    return store ? store.userId : '';
  },
  set userId(value) {
    const store = tenantStorage.getStore();
    if (store) store.userId = value;
  },
  get tenantInfo() {
    return String(this.orgId);
  },
  set tenantInfo(uuid) {
    this.orgId = uuid;
  },
  get userInfo() {
    return String(this.userId);
  },
  set userInfo(uuid) {
    this.userId = uuid;
  },
};

const RESEND_CONFIG = {
  apiKey: process.env.RESEND_API_KEY,
  fromAddress: process.env.RESEND_FROM_ADDRESS || 'Plutus <onboarding@resend.dev>',
  signupTemplateId: 'signup-confirmation',
  passwordResetTemplateId: 'password-reset',
  passwordResetSuccessTemplateId: 'password-reset-success',
};

// When true, outbound mail is logged instead of sent. Set it in development so an
// experiment cannot deliver real email no matter which API key is configured.
const MAIL_DRY_RUN = process.env.MAIL_DRY_RUN === 'true';

// Backend API URL — builds the email verification links.
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3003';

// Frontend client URL — builds the password reset links.
const CLIENT_BASE_URL = process.env.CLIENT_BASE_URL || 'http://localhost:3000';

// Browser origins allowed to call this API, comma-separated. Defaults to the client
// URL, which is the only origin a single-frontend deployment needs. An entry may
// contain one `*` wildcard within its hostname (see app.js) so a preview-deployment
// URL pattern can be allowed alongside the production origin.
const CORS_ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || CLIENT_BASE_URL)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const PORT = process.env.PORT || 3001;

// Per-IP rate limits. Only the max counts are env-tunable; windows are fixed.
const RATE_LIMIT = {
  global: { windowMs: 60 * 1000, limit: Number(process.env.RATE_LIMIT_GLOBAL_MAX) || 100 },
  auth: { windowMs: 15 * 60 * 1000, limit: Number(process.env.RATE_LIMIT_AUTH_MAX) || 10 },
  heavy: { windowMs: 60 * 1000, limit: Number(process.env.RATE_LIMIT_HEAVY_MAX) || 30 },
};

// Hops to trust for X-Forwarded-For (0 = no proxy, direct connections only).
// Set to 1 when deployed behind a single reverse proxy / load balancer.
const TRUST_PROXY_HOPS = Number(process.env.TRUST_PROXY_HOPS) || 0;

module.exports = {
  PG_CONNECTION_OBJ,
  PG_TENANT_CONNECTION_OBJ,
  DB_TARGETS,
  TENANT_CONTEXT,
  tenantStorage,
  RESEND_CONFIG,
  MAIL_DRY_RUN,
  APP_BASE_URL,
  CLIENT_BASE_URL,
  CORS_ALLOWED_ORIGINS,
  PORT,
  RATE_LIMIT,
  TRUST_PROXY_HOPS,
};
