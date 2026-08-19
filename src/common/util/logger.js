const winston = require('winston');
require('winston-daily-rotate-file');

// In production the process runs on an ephemeral filesystem behind a platform that
// captures stdout/stderr: rotating files there would be written to a disk that
// disappears on the next deploy, while filling it up in the meantime. Locally the
// files are genuinely useful, so they stay.
const isProduction = process.env.NODE_ENV === 'production';

const rotatingFile = (filename, options = {}) => new winston.transports.DailyRotateFile({
  filename,
  datePattern: 'YYYY-MM-DD',
  ...options,
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'http',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: isProduction
    ? [new winston.transports.Console()]
    : [
      new winston.transports.Console(),
      rotatingFile('./log/combined-%DATE%.log', { maxSize: '20m', maxFiles: '14d' }),
      rotatingFile('./log/app-error-%DATE%.log', { maxFiles: '30d', level: 'error' }),
    ],
  exceptionHandlers: isProduction
    ? [new winston.transports.Console()]
    : [rotatingFile('./log/exception-%DATE%.log', { maxFiles: '30d' })],
  rejectionHandlers: isProduction
    ? [new winston.transports.Console()]
    : [rotatingFile('./log/rejection-%DATE%.log', { maxFiles: '30d' })],
});

module.exports = logger;
