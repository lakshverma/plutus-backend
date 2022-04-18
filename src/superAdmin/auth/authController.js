const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { createUserService, checkExistingUserService } = require("./authService");

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
  const existingUser = await checkExistingUserService(body.email);

  if (existingUser) {
    return res.status(409).json({
      error: "user already exists, try signing in or use another email id.",
    });
  }

  const newSuperAdmin = await createUserService(body, "superadmin");

  res.status(201).json(newSuperAdmin);
};

const loginSuperAdmin = async (req, res) => {
  const { body } = req;

  const user = await checkExistingUserService(body.email);
  const passwordCorrect = user === null ? false : await bcrypt.compare(body.password, user.password_hash);

  if (!(user && passwordCorrect)) {
    return res.status(401).json({
      error: 'invalid username or password'
    });
  };

  if (!(user.user_roles_user_roles_id === 1)) {
    return res.status(401).json({
      error: 'not authorized to access this route'
    });
  };

  const userForToken = {
    email: user.email,
    id: user.user_id,
    role: "superadmin",
  };

  const token = jwt.sign(userForToken, process.env.SECRET);

  res.status(200).send({ token });
};

module.exports = { loginRoot, createSuperAdmin, loginSuperAdmin };
