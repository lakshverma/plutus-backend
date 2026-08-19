const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const commonAppRoutes = require('./common/commonApp');
const healthRoutes = require('./common/health/healthRouter');
const logger = require('./common/util/logger');
const {
  unknownEndpoint,
  errorHandler,
  tokenExtractor,
} = require('./common/util/middleware');
const superAdminAppRoutes = require('./superAdmin/superAdminApp');
const tenantAppRoutes = require('./tenant/tenantApp');
const {
  tenantStorage,
  TRUST_PROXY_HOPS,
  CORS_ALLOWED_ORIGINS,
} = require('./common/util/config');
const { globalLimiter } = require('./common/util/rateLimiter');

const app = express();

// Trust N reverse-proxy hops so req.ip reflects the real client (rate limiting
// keys on it). 0 = direct connections; set TRUST_PROXY_HOPS=1 behind a single
// proxy/load balancer. See config.js.
if (TRUST_PROXY_HOPS > 0) {
  app.set('trust proxy', TRUST_PROXY_HOPS);
}

app.use(
  helmet({
    // This is a JSON API read cross-origin by the browser client. Helmet's default
    // same-origin resource policy is meant for sites serving their own assets.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Allowlist entries are exact origins, except that a `*` may stand in for one
// hostname label so preview deployments (https://plutus-<hash>.vercel.app) can be
// allowed as a group. The wildcard expands to [^.]*, which cannot cross a dot, so
// it never widens to a different domain.
const originMatchers = CORS_ALLOWED_ORIGINS.map((entry) => {
  if (!entry.includes('*')) return (origin) => origin === entry;
  const pattern = new RegExp(`^${entry.split('*').map(escapeRegExp).join('[^.]*')}$`);
  return (origin) => pattern.test(origin);
});

// Mounted before the rate limiter so that preflights are answered without spending
// request budget, and so a 429 still carries the headers the browser needs to
// surface it as a rate-limit error rather than an opaque CORS failure.
app.use(
  cors({
    origin: (origin, callback) => {
      // No Origin header: same-origin navigation or a non-browser client (curl,
      // health checks, server-to-server). CORS does not apply.
      if (!origin) return callback(null, true);
      return callback(null, originMatchers.some((matches) => matches(origin)));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    // Auth is a bearer token in a header, not a cookie, so credentialed CORS is
    // neither needed nor wanted.
    credentials: false,
    maxAge: 86400,
  }),
);

// Ahead of the rate limiter and the request log: health checks run continuously and
// should neither consume a limiter's budget nor bury real traffic in the logs.
// This must also stay above the '/:tenantId' mount below, which would otherwise
// match '/health' as a tenant id.
app.use('/health', healthRoutes);

// Shed abusive traffic before body parsing and route matching (unknown-path
// scans included).
app.use(globalLimiter);

app.use(express.json());

app.use(
  morgan('tiny', {
    stream: {
      // Configure Morgan to use Winston logger with http severity
      write: (message) => logger.http(message.trim()),
    },
  }),
);

app.use(tokenExtractor);

// Open a fresh per-request store so tenant identity (TENANT_CONTEXT) is isolated
// per request and never shared across concurrent requests.
app.use((req, res, next) => tenantStorage.run({ orgId: '', userId: '' }, next));

app.use('/superadmin', superAdminAppRoutes);
app.use('/:tenantId', tenantAppRoutes);
app.use('/', commonAppRoutes);

app.use(unknownEndpoint);
app.use(errorHandler);

module.exports = app;
