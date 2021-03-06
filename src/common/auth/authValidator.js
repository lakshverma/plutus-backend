const { check } = require('express-validator');
const { validationMiddleware } = require('../util/middleware');

const validateLogin = [
  check('email')
    .exists()
    .withMessage('Email is mandatory.')
    .bail()
    .notEmpty()
    .withMessage('Email can not be empty.')
    .bail()
    .isEmail()
    .withMessage('Must use a valid email format')
    .bail()
    .normalizeEmail()
    .isLength({ min: 3 })
    .withMessage('Minimum 3 characters required.')
    .bail(),
  check('password')
    .exists()
    .withMessage('password is mandatory.')
    .bail()
    .notEmpty()
    .withMessage('password can not be empty.')
    .bail(),
];

const validateResetPassword = [
  check('password')
    .exists()
    .withMessage('password is mandatory.')
    .bail()
    .notEmpty()
    .withMessage('password can not be empty.')
    .bail()
    .isStrongPassword()
    .withMessage(
      'password must have at least 8 characters with a min of 1 lowercase, 1 uppercase, 1 numeric and 1 special character.',
    )
    .bail(),
  check('confirmPassword')
    .exists()
    .withMessage('password is mandatory.')
    .bail()
    .notEmpty()
    .withMessage('password can not be empty.')
    .bail()
    .isStrongPassword()
    .withMessage(
      'password must have at least 8 characters with a min of 1 lowercase, 1 uppercase, 1 numeric and 1 special character.',
    )
    .bail()
    .custom(async (confirmPassword, { req }) => {
      const { password } = req.body;

      // If password and confirm password not same
      // don't allow to sign up and throw error
      if (password !== confirmPassword) {
        throw new Error('Passwords must be same');
      }
    }),
  validationMiddleware,
];

module.exports = {
  validateLogin,
  validateResetPassword,
};
