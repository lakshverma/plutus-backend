const Router = require('express-promise-router');
const { validateUserSignup } = require('./authValidator');
const { authorize } = require('../../common/util/middleware');
const {
  createUser,
  verifyUser,
  confirmEmail,
} = require('./authController');

const router = new Router();

router.post(
  '/signup',
  [authorize(['root', 'superadmin', 'admin']), validateUserSignup],
  createUser,
);

router.get('/verify/:token', verifyUser);

router.post('/confirm-email', confirmEmail);

module.exports = router;
