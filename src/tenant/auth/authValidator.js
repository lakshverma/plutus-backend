const { check } = require("express-validator");
const { validationMiddleware } = require("../../common/util/middleware");

const validateLogin = [
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
  check("password")
    .exists()
    .withMessage("password is mandatory.")
    .bail()
    .notEmpty()
    .withMessage("password can not be empty.")
    .bail(),
];

const validateUserSignup = [
  check("firstName")
    .exists()
    .withMessage("First name is mandatory.")
    .bail()
    .isString()
    .withMessage("First name must be a text value.")
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
    .withMessage("First name must be a text value.")
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
    .withMessage("username must be a text value.")
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
  check("jobTitle")
    .exists()
    .withMessage("Job Title is mandatory")
    .bail()
    .notEmpty()
    .withMessage("Job Title can't be empty")
    .bail()
    .isString()
    .withMessage("Job Title must be a text value.")
    .bail()
    .isLength({ min: 3, max: 25 })
    .withMessage("Job Title must be between 3 and 25 characters")
    .bail(),
  check("role")
    .exists()
    .withMessage("User role is mandatory")
    .bail()
    .notEmpty()
    .withMessage("User role can't be empty")
    .isString()
    .withMessage("User role must be a text value.")
    .bail()
    .isIn(["standard", "limited"])
    .withMessage("User role can either be standard or limited"),
  validationMiddleware,
];

const validateResetPassword = [
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
  check("confirmPassword")
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
    .bail()
    .custom(async (confirmPassword, { req }) => {
      const password = req.body.password;

      // If password and confirm password not same
      // don't allow to sign up and throw error
      if (password !== confirmPassword) {
        throw new Error("Passwords must be same");
      }
    }),
  validationMiddleware,
];

module.exports = {
  validateLogin,
  validateUserSignup,
  validateResetPassword,
};
