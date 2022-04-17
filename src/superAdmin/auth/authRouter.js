const Router = require("express-promise-router");
const { validateSuperAdminSignup } = require("./authValidator");
const { authorize } = require("../../common/util/middleware");
const { createSuperAdmin, loginRoot } = require("./authController");

const router = new Router();

router.post(
  "/sa-signup",
  [
    authorize("root"),
    validateSuperAdminSignup,
  ],
  createSuperAdmin
);

router.post("/", loginRoot);

module.exports = router;
