const express = require('express');
const authRouter = require('./auth/authRouter');

const tenantAppRoutes = express.Router();

tenantAppRoutes.use('/auth', authRouter);

module.exports = tenantAppRoutes;
