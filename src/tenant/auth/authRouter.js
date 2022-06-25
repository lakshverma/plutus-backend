const Router = require("express-promise-router");
const { validateLogin, validateUserSignup } = require("./authValidator");
const { authorize } = require("../../common/util/middleware");
const {
  createUser,
  login,
  verifyUser,
  confirmEmail,
} = require("./authController");

const router = new Router();

router.post(
  "/signup",
  [authorize(["root", "superadmin", "admin"]), validateUserSignup],
  createUser
);

router.post("/login", validateLogin, login);

router.get("/verify/:token", verifyUser);

router.post("/confirm-email", confirmEmail);

module.exports = router;
