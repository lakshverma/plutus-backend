const http = require('http');
const app = require('./src/app');
const {
  PORT,
  DB_TARGETS,
  CLIENT_BASE_URL,
  MAIL_DRY_RUN,
} = require('./src/common/util/config');
const logger = require('./src/common/util/logger');
const { verifyConnection, closePools } = require('./src/common/db');

const server = http.createServer(app);

// How long in-flight requests get to finish before the process is killed anyway.
// Comfortably inside the 30s a platform typically allows between SIGTERM and SIGKILL.
const SHUTDOWN_GRACE_MS = 10000;

let shuttingDown = false;

const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received; shutting down`);

  const forceExit = setTimeout(() => {
    logger.error('graceful shutdown timed out; forcing exit');
    process.exit(1);
  }, SHUTDOWN_GRACE_MS);
  forceExit.unref();

  try {
    // Stop accepting connections, let in-flight requests finish, then hand the
    // database its connections back rather than leaving the server to reap them.
    await new Promise((resolve) => { server.close(resolve); });
    await closePools();
    logger.info('shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error(`error during shutdown: ${error.message}`);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

const start = async () => {
  // Announce what this process is actually pointed at. If it is ever the wrong
  // database or the wrong client URL, that shows up in the first lines of the log
  // rather than in the data.
  logger.info(
    `starting in ${process.env.NODE_ENV || 'unset'} mode: db=${DB_TARGETS.superAdmin} `
    + `tenant-db=${DB_TARGETS.tenant} client=${CLIENT_BASE_URL}`
    + `${MAIL_DRY_RUN ? ' mail=dry-run' : ''}`,
  );

  try {
    await verifyConnection();
  } catch (error) {
    logger.error('database unreachable at startup; exiting');
    process.exit(1);
  }

  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
};

start();
