const Router = require('express-promise-router');
const { validateUserSignup } = require('./authValidator');
const { authorize } = require('../../common/util/middleware');
const { authLimiter } = require('../../common/util/rateLimiter');
const {
  createUser,
  verifyUser,
  confirmEmail,
  getOrgUsers,
  updateUserRole,
} = require('./authController');

const { ROLES } = require('../../common/util/helper');

const router = new Router();

router.post(
  '/signup',
  [authorize(['root', ROLES.superAdmin, ROLES.admin]), validateUserSignup],
  createUser,
);

router.get('/verify/:token', authLimiter, verifyUser);

router.post('/confirm-email', authLimiter, confirmEmail);

router.get(
  '/users',
  authorize(['root', ROLES.superAdmin, ROLES.admin]),
  getOrgUsers,
);

router.patch(
  '/users/:userId/role',
  authorize(['root', ROLES.superAdmin, ROLES.admin]),
  updateUserRole,
);

module.exports = router;
