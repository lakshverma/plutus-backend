const express = require("express");
const subscriptionPlanRouter = require("./subscriptionPlan/subscriptionPlanRouter");

const superAdminAppRoutes = express.Router();

superAdminAppRoutes.use("/subscriptionPlan", subscriptionPlanRouter);

module.exports = superAdminAppRoutes;
