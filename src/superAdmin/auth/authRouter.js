const Router = require("express-promise-router");
const { validateSuperAdminSignup, validateSuperAdminLogin } = require("./authValidator");
const { authorize } = require("../../common/util/middleware");
const { createSuperAdmin, loginRoot, loginSuperAdmin } = require("./authController");

const router = new Router();

router.post(
  "/sa-signup",
  [
    authorize("root"),
    validateSuperAdminSignup,
  ],
  createSuperAdmin
);

router.post("/sa-login", validateSuperAdminLogin, loginSuperAdmin);

// router.post("/signup", createTenant);
// router.get("/:tenantid", tenantInfo)

router.post("/", loginRoot);

module.exports = router;
