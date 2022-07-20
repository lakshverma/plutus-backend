const Router = require('express-promise-router');

const {
  validateLogin,
  validateResetPassword,
} = require('./authValidator');

const {
  login,
  requestPasswordReset,
  resetPassword,
} = require('./authController');

const router = new Router();

router.post('/login', validateLogin, login);

router.post('/request-pass', requestPasswordReset);

router.post('/reset-pass', validateResetPassword, resetPassword);

module.exports = router;
