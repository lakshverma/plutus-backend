const jwt = require("jsonwebtoken");
const { createUserService, checkExistingUser } = require("./authService");

const loginRoot = async (req, res) => {
  const { body } = req;

  if (
    !(
      body.username === process.env.ROOT_USER &&
      body.password === process.env.ROOT_PASSWORD
    )
  ) {
    return res.status(401).json({
      error: "invalid username or password",
    });
  }

  const userForToken = {
    username: process.env.ROOT_USER,
    role: "root",
  };

  const token = jwt.sign(userForToken, process.env.SECRET);

  res.status(200).send({ token });
};

const createSuperAdmin = async (req, res) => {
  const { body } = req;
  const existingUser = await checkExistingUser(body.email);

  if (existingUser) {
    return res.status(409).json({
      error: "user already exists, try signing in or use another email id.",
    });
  }

  const newSuperAdmin = await createUserService(body, "superadmin");

  res.status(201).json(newSuperAdmin);
};

module.exports = { loginRoot, createSuperAdmin };
