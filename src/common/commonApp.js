const express = require("express");
const authRouter = require("./auth/authRouter");

const commonAppRoutes = express.Router();

commonAppRoutes.use("/auth", authRouter);

module.exports = commonAppRoutes;
