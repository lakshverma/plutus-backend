const express = require('express');
const subscriptionPlanRouter = require('./subscriptionPlan/subscriptionPlanRouter');
const authRouter = require('./auth/authRouter');

const superAdminAppRoutes = express.Router();

superAdminAppRoutes.use('/subscriptionPlan', subscriptionPlanRouter);
superAdminAppRoutes.use('/auth', authRouter);

module.exports = superAdminAppRoutes;
