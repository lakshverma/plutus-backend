const { param } = require('express-validator');
const { validationMiddleware } = require('../../common/util/middleware');

const validateGetContactAuditTrail = [
  param('contactId')
    .isUUID(4)
    .withMessage('A valid contact ID (UUID v4) must be provided.'),
  validationMiddleware,
];

module.exports = {
  validateGetContactAuditTrail,
};
