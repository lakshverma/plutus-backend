const express = require("express");
const helmet = require("helmet");
const subscriptionPlansRouter = require("./subscriptionPlan/subscriptionPlanRoute");

const app = express();

app.use(helmet());
app.use(express.json());

app.use("/api/subscriptionPlans", subscriptionPlansRouter);

module.exports = app;
