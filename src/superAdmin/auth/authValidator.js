const { check } = require("express-validator");
const { validationMiddleware } = require("../../common/util/middleware");

const validateSuperAdminSignup = [
  check("firstName")
    .exists()
    .withMessage("First name is mandatory.")
    .bail()
    .isString()
    .withMessage("First name must be a string.")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("First name can not be empty.")
    .bail()
    .isAlphanumeric()
    .withMessage("First name must be Alphanumeric.")
    .bail()
    .isLength({ min: 3 })
    .withMessage("Minimum 3 characters required.")
    .bail(),
  check("lastName")
    .exists()
    .withMessage("First name is mandatory.")
    .bail()
    .isString()
    .withMessage("First name must be a string.")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("First name can not be empty.")
    .bail()
    .isAlphanumeric()
    .withMessage("First name must be Alphanumeric.")
    .bail()
    .isLength({ min: 3 })
    .withMessage("Minimum 3 characters required.")
    .bail(),
  check("email")
    .exists()
    .withMessage("Email is mandatory.")
    .bail()
    .notEmpty()
    .withMessage("Email can not be empty.")
    .bail()
    .isEmail()
    .withMessage("Must use a valid email format")
    .bail()
    .normalizeEmail()
    .isLength({ min: 3 })
    .withMessage("Minimum 3 characters required.")
    .bail(),
  check("username")
    .exists()
    .withMessage("username is mandatory.")
    .bail()
    .isString()
    .withMessage("username must be a string.")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("username can not be empty.")
    .bail()
    .isAlphanumeric()
    .withMessage("username must be Alphanumeric.")
    .bail()
    .isLength({ min: 5 })
    .withMessage("Minimum 5 characters required.")
    .bail(),
  check("password")
    .exists()
    .withMessage("password is mandatory.")
    .bail()
    .notEmpty()
    .withMessage("password can not be empty.")
    .bail()
    .isStrongPassword()
    .withMessage(
      "password must have at least 8 characters with a min of 1 lowercase, 1 uppercase, 1 numeric and 1 special character."
    )
    .bail(),
  validationMiddleware,
];

module.exports = {
  validateSuperAdminSignup,
};
