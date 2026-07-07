const express = require('express');
const authRouter = require('./auth/authRouter');
const activitiesRouter = require('./activity/activityRouter');
const noteRouter = require('./activity/note/noteRouter');
const callRouter = require('./activity/call/callRouter');
const searchRouter = require('./search/searchRouter');
const contactRouter = require('./contact/contactRouter');

const tenantAppRoutes = express.Router();

tenantAppRoutes.use('/auth', authRouter);
tenantAppRoutes.use('/search', searchRouter);
tenantAppRoutes.use('/activities', activitiesRouter);
tenantAppRoutes.use('/contacts', contactRouter);
tenantAppRoutes.use('/contacts/:contactId/activities', activitiesRouter);
tenantAppRoutes.use('/contacts/:contactId/notes', noteRouter);
tenantAppRoutes.use('/contacts/:contactId/calls', callRouter);

module.exports = tenantAppRoutes;
