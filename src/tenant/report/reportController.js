const jwt = require('jsonwebtoken');
const { TENANT_CONTEXT } = require('../../common/util/config');
const { getLifeEventsService } = require('./reportService');

const getLifeEvents = async (req, res) => {
  const { query, token } = req;
  const { month, day, type } = query;

  const decodedToken = jwt.verify(token, process.env.SECRET);
  TENANT_CONTEXT.tenantInfo = decodedToken.orgId;
  TENANT_CONTEXT.userInfo = decodedToken.userId;

  const result = await getLifeEventsService(month, day, type);
  return res.status(200).json(result);
};

module.exports = {
  getLifeEvents,
};
