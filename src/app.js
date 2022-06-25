const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const commonAppRoutes = require("./common/commonApp");
const logger = require("./common/util/logger");
const {
  unknownEndpoint,
  errorHandler,
  tokenExtractor,
} = require("./common/util/middleware");
const superAdminAppRoutes = require("./superAdmin/superAdminApp");
const tenantAppRoutes = require("./tenant/tenantApp");

const app = express();

app.use(helmet());

app.use(express.json());

app.use(
  morgan("tiny", {
    stream: {
      // Configure Morgan to use Winston logger with http severity
      write: (message) => logger.http(message.trim()),
    },
  })
);

app.use(tokenExtractor);

app.use("/superadmin", superAdminAppRoutes);
app.use("/:tenantId", tenantAppRoutes);
app.use("/", commonAppRoutes);

app.use(unknownEndpoint);
app.use(errorHandler);

module.exports = app;
