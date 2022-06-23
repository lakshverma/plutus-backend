const Router = require("express-promise-router");

const {
    validateResetPassword,
  } = require("./authValidator");

const {
    requestPasswordReset,
    resetPasswordEmailConfirm,
    resetPassword,
} = require("./authController");
  
  
const router = new Router();

router.post("/request-pass", requestPasswordReset);

router.get("/reset-pass/:token", resetPasswordEmailConfirm);

router.post("/reset-pass", validateResetPassword, resetPassword);

module.exports = router;
