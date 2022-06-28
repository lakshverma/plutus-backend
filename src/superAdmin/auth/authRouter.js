const Router = require('express-promise-router');
const {
  validateSuperAdminSignup,
  validateLogin,
  validateAdminSignup,
} = require('./authValidator');
const { authorize } = require('../../common/util/middleware');
const {
  createSuperAdmin,
  loginRoot,
  loginSuperAdmin,
  createTenant,
  verifyUser,
  confirmEmail,
} = require('./authController');

const router = new Router();

router.post(
  '/sa-signup',
  [authorize('root'), validateSuperAdminSignup],
  createSuperAdmin,
);

router.post('/sa-login', validateLogin, loginSuperAdmin);

router.post(
  '/signup',
  [authorize(['root', 'superadmin']), validateAdminSignup],
  createTenant,
);

router.get('/verify/:token', verifyUser);

router.post('/confirm-email', confirmEmail);

router.post('/', loginRoot);

module.exports = router;
