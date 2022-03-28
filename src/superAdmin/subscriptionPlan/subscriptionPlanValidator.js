const { check } = require("express-validator");
const { validationMiddleware } = require("../../../util/middleware");

const validateSubscriptionPlan = [
  check("plan_name")
    .exists()
    .withMessage("Plan name is mandatory.")
    .bail()
    .isString()
    .withMessage("Plan name must be a string.")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Plan name can not be empty.")
    .bail()
    .isAlphanumeric()
    .withMessage("Plan name must be Alphanumeric.")
    .bail()
    .isLength({ min: 3 })
    .withMessage("Minimum 3 characters required.")
    .bail(),
  check("plan_type")
    .exists()
    .withMessage("Plan type is mandatory.")
    .bail()
    .isString()
    .withMessage("Plan type must be a string.")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Plan type can not be empty.")
    .bail()
    .isIn(["free", "paid", "inactive"])
    .withMessage("Plan can either be free, paid or inactive.")
    .bail(),
  check("plan_cost_inr")
    .exists()
    .withMessage("Plan cost in INR is mandatory. Enter 0 if the plan is free.")
    .bail()
    .isInt()
    .withMessage("Plan cost should be an integer")
    .bail(),
  validationMiddleware,
];

module.exports = validateSubscriptionPlan;
