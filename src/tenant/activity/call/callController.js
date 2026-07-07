const jwt = require('jsonwebtoken');
const { TENANT_CONTEXT } = require('../../../common/util/config');
const {
  createCallService,
  getCallsForContactService,
  updateCallService,
  deleteCallService,
} = require('./callService');

const setTenantContext = (token) => {
  const decodedToken = jwt.verify(token, process.env.SECRET);
  TENANT_CONTEXT.tenantInfo = decodedToken.orgId;
  TENANT_CONTEXT.userInfo = decodedToken.userId;
};

const createCall = async (req, res) => {
  const { params, body, token } = req;
  setTenantContext(token);
  const createdCall = await createCallService(body, params.contactId);
  return res.status(201).json(createdCall);
};

const getAllCalls = async (req, res) => {
  const { params, token } = req;
  setTenantContext(token);
  const calls = await getCallsForContactService(params.contactId);
  return res.json(calls);
};

const updateCall = async (req, res) => {
  const { params, body, token } = req;
  setTenantContext(token);
  const updatedCall = await updateCallService(params.callId, params.contactId, body);
  if (!updatedCall) {
    return res.status(404).json({ message: 'Call not found.' });
  }
  return res.status(200).json(updatedCall);
};

const deleteCall = async (req, res) => {
  const { params, token } = req;
  setTenantContext(token);
  const result = await deleteCallService(params.callId, params.contactId);
  if (result) {
    return res.status(204).end();
  }
  return res.status(404).json({ error: 'Call not found or deletion failed.' });
};

module.exports = {
  createCall,
  getAllCalls,
  updateCall,
  deleteCall,
};
