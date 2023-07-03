const express = require('express');
const authRouter = require('./auth/authRouter');
const searchRouter = require('./search/searchRouter');

const tenantAppRoutes = express.Router();

tenantAppRoutes.use('/auth', authRouter);
tenantAppRoutes.use('/search', searchRouter);

module.exports = tenantAppRoutes;
