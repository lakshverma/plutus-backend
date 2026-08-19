const Router = require('express-promise-router');
const { ping } = require('../db');
const logger = require('../util/logger');

const router = new Router();

// Liveness. Touches no dependency on purpose: this is the platform's health check
// path, and a database blip must not make it restart a process that is otherwise
// serving fine.
router.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Readiness. Round-trips to the database, so this is what external monitoring should
// watch — and, against a serverless Postgres that suspends when idle, what keeps it
// warm between visitors.
router.get('/db', async (req, res) => {
  try {
    await ping();
    return res.status(200).json({ status: 'ok', database: 'reachable' });
  } catch (error) {
    logger.error(`health check failed: ${error.message}`);
    return res.status(503).json({ status: 'error', database: 'unreachable' });
  }
});

module.exports = router;
