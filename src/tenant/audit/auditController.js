const jwt = require('jsonwebtoken');
const { TENANT_CONTEXT } = require('../../common/util/config');
const logger = require('../../common/util/logger');
const { getContactAuditTrailService } = require('./auditService');

const getContactAuditTrail = async (req, res) => {
  const { params, token } = req;
  const { contactId } = params;

  try {
    const decodedToken = jwt.verify(token, process.env.SECRET);
    TENANT_CONTEXT.tenantInfo = decodedToken.orgId;
    TENANT_CONTEXT.userInfo = decodedToken.userId;

    const auditTrail = await getContactAuditTrailService(contactId);

    if (!auditTrail || auditTrail.length === 0) {
      return res.status(404).json({ message: 'No audit trail found for this contact.' });
    }

    return res.json(auditTrail);
  } catch (error) {
    logger.error(`Controller error fetching audit trail for contact ${contactId}: ${error.message}`, { stack: error.stack });
    return res.status(500).json({ error: 'An internal server error occurred.' });
  }
};

module.exports = {
  getContactAuditTrail,
};
