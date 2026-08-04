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

const { authLimiter } = require('../util/rateLimiter');

const router = new Router();

router.post('/login', [authLimiter, validateLogin], login);

router.post('/request-pass', authLimiter, requestPasswordReset);

router.post('/reset-pass', [authLimiter, validateResetPassword], resetPassword);

module.exports = router;
