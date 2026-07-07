const Router = require('express-promise-router');
const {
  validateContactId,
  validateNewCall,
  validateCallToUpdate,
  validateContactAndCallId,
} = require('./callValidator');
const {
  createCall,
  getAllCalls,
  updateCall,
  deleteCall,
} = require('./callController');
const { authorize } = require('../../../common/util/middleware');
const { ROLES } = require('../../../common/util/helper');

const router = new Router({ mergeParams: true });
const auth = authorize(['root', ROLES.superAdmin, ROLES.admin, ROLES.standard, ROLES.limited]);

router.post('/', [auth, validateNewCall], createCall);
router.get('/', [auth, validateContactId], getAllCalls);
router.put('/:callId', [auth, validateCallToUpdate], updateCall);
router.delete('/:callId', [auth, validateContactAndCallId], deleteCall);

module.exports = router;
