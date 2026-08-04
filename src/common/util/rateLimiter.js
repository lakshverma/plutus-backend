const { rateLimit } = require('express-rate-limit');
const logger = require('./logger');
const { RATE_LIMIT } = require('./config');

// Fixed-window, in-memory limiters keyed by IP (express-rate-limit default key
// generator uses req.ip and masks IPv6 to its /56 subnet). To scale beyond a
// single process, pass a shared `store` (e.g. rate-limit-redis) here — no other
// change is needed.
const createLimiter = (options) => rateLimit({
  windowMs: options.windowMs,
  limit: options.limit,
  standardHeaders: 'draft-7', // single RateLimit header + Retry-After on 429
  legacyHeaders: false, // no X-RateLimit-*
  handler: (req, res, next, opts) => {
    // morgan never sees requests rejected here, so log breaches explicitly.
    logger.warn(`rate limit exceeded: ${req.method} ${req.originalUrl} ip=${req.ip}`);
    res.status(opts.statusCode).json({ error: 'too many requests, please try again later' });
  },
});

const globalLimiter = createLimiter(RATE_LIMIT.global);

// A single shared instance across all auth endpoints, so its counts pool: an
// attacker cannot get `auth.limit` attempts on each endpoint separately.
const authLimiter = createLimiter(RATE_LIMIT.auth);

const heavyLimiter = createLimiter(RATE_LIMIT.heavy);

module.exports = { globalLimiter, authLimiter, heavyLimiter };
