const express = require('express');
const authRouter = require('./auth/authRouter');
const searchRouter = require('./search/searchRouter');
const contactRouter = require('./contact/contactRouter');

const tenantAppRoutes = express.Router();

tenantAppRoutes.use('/auth', authRouter);
tenantAppRoutes.use('/search', searchRouter);
tenantAppRoutes.use('/contacts', contactRouter);

module.exports = tenantAppRoutes;
