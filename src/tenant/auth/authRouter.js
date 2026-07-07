const Router = require('express-promise-router');
const { validateUserSignup } = require('./authValidator');
const { authorize } = require('../../common/util/middleware');
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

router.get('/verify/:token', verifyUser);

router.post('/confirm-email', confirmEmail);

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
