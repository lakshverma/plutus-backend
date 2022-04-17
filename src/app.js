const express = require("express");
const helmet = require("helmet");
const { unknownEndpoint, errorHandler } = require("./common/util/middleware");
const superAdminAppRoutes = require("./superAdmin/superAdminApp");

const app = express();

app.use(helmet());
app.use(express.json());

app.use("/superadmin", superAdminAppRoutes)

app.use(unknownEndpoint);
app.use(errorHandler);

module.exports = app;
