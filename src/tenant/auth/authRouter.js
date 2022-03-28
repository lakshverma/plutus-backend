const Router = require("express-promise-router");
const { signUp } = require("./authController");

const router = new Router();

router.post("/signup", signUp);

module.exports = router;
