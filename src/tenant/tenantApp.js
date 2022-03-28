const express = require("express");
const authRouter = require("./auth/authRouter");

const tenantAppRoutes = express.Router();

tenantAppRoutes.use("/", authRouter);

module.exports = tenantAppRoutes;
