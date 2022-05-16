const Router = require("express-promise-router");
const {
  validateSuperAdminSignup,
  validateLogin,
  validateAdminSignup,
  validateResetPassword,
} = require("./authValidator");
const { authorize } = require("../../common/util/middleware");
const {
  createSuperAdmin,
  loginRoot,
  loginSuperAdmin,
  createTenant,
  verifyUser,
  confirmEmail,
  requestPasswordReset,
  resetPasswordEmailConfirm,
  resetPassword,
} = require("./authController");

const router = new Router();

router.post(
  "/sa-signup",
  [authorize("root"), validateSuperAdminSignup],
  createSuperAdmin
);

router.post("/sa-login", validateLogin, loginSuperAdmin);

router.post(
  "/signup",
  [authorize(["root", "superadmin"]), validateAdminSignup],
  createTenant
);

router.get("/verify/:token", verifyUser);

router.post("/confirm-email", confirmEmail);

router.post("/request-pass", requestPasswordReset);

router.get("/reset-pass/:token", resetPasswordEmailConfirm);

router.post("/reset-pass", validateResetPassword, resetPassword);

router.post("/", loginRoot);

module.exports = router;
