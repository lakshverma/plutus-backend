const Router = require('express-promise-router');
const { authorize } = require('../../common/util/middleware');
const { ROLES } = require('../../common/util/helper');
const { validateGetContactAuditTrail } = require('./auditValidator');
const { getContactAuditTrail } = require('./auditController');

const router = new Router();

router.get(
  '/:contactId',
  [
    authorize(['root', ROLES.superAdmin, ROLES.admin, ROLES.standard]),
    validateGetContactAuditTrail,
  ],
  getContactAuditTrail,
);

module.exports = router;
