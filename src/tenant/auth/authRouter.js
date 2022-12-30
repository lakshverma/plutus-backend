const Router = require('express-promise-router');
const { validateUserSignup } = require('./authValidator');
const { authorize } = require('../../common/util/middleware');
const {
  createUser,
  verifyUser,
  confirmEmail,
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

module.exports = router;
