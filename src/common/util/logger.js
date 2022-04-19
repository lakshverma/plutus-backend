const winston = require("winston");
require('winston-daily-rotate-file');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "http",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.DailyRotateFile({
      filename: "./log/combined-%DATE%.log",
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
    }),
    new winston.transports.DailyRotateFile({
      filename: "./log/app-error-%DATE%.log",
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
      level: "error",
    }),
  ],
  exceptionHandlers: [
    new winston.transports.DailyRotateFile({
      filename: "./log/exception-%DATE%.log",
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
    }),
  ],
  rejectionHandlers: [
    new winston.transports.DailyRotateFile({
      filename: "./log/rejection-%DATE%.log",
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
    }),
  ],
});

module.exports = logger;
