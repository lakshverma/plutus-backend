/* eslint-disable camelcase */
const dal = require('./callDAL');
const { TENANT_CONTEXT } = require('../../../common/util/config');
const logger = require('../../../common/util/logger');

const createCallService = async (callToCreate, contactId) => {
  const callData = {
    ...callToCreate,
    org_id: TENANT_CONTEXT.tenantInfo,
    contact_id: contactId,
    call_creator_user_id: TENANT_CONTEXT.userInfo,
  };
  return dal.create(callData);
};

const getCallsForContactService = async (contactId) => dal.getAllForContact(contactId);

const updateCallService = async (callId, contactId, callToUpdate) => {
  const existingCall = await dal.get(callId, contactId);
  if (!existingCall) {
    logger.warn(`Call ${callId} for contact ${contactId} not found.`);
    return null;
  }
  return dal.update(callId, contactId, callToUpdate);
};

const deleteCallService = async (callId, contactId) => {
  const result = await dal.remove(callId, contactId);
  if (!result) {
    logger.warn(`Failed to delete call ${callId} for contact ${contactId} or call not found.`);
    return null;
  }
  return result;
};

module.exports = {
  createCallService,
  getCallsForContactService,
  updateCallService,
  deleteCallService,
};
