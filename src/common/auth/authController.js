const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const {
  checkExistingUserService,
  sendPassResetEmailService,
  resetPasswordService,
  resetPasswordConfirmService,
} = require('./authService');

const login = async (req, res) => {
  const { body } = req;
  const user = await checkExistingUserService(body.email);

  const passwordCorrect = user === null
    ? false
    : await bcrypt.compare(body.password, user.password_hash);

  if (!(user && passwordCorrect)) {
    return res.status(401).json({
      error: 'invalid username or password',
    });
  }

  if (user.status === 'unverified') {
    return res.status(401).json({
      error:
        'Account is not verified. Complete email verification to access the account.',
    });
  }

  const userForToken = {
    orgId: user.org_id,
    userId: user.user_id,
    email: user.email,
    // Role be an int related to primary key in user_roles_id table, convert it into a role name
    role: user.role_type,
  };

  const token = jwt.sign(userForToken, process.env.SECRET, {
    expiresIn: '16h',
  });

  return res.status(200).send({ token });
};

// Triggers the password reset flow.
const requestPasswordReset = async (req, res) => {
  const { body } = req;

  const existingUser = await checkExistingUserService(body.email);

  if (!existingUser) {
    return res.status(204).end();
  }

  await sendPassResetEmailService(existingUser);
  return res.status(204).end();
};

// Verifies token sent to user's email before generating a short-lived token to allow password reset
const resetPasswordEmailConfirm = async (req, res) => {
  const { params } = req;

  const secret = process.env.SECRET;
  const decodedToken = jwt.verify(params.token, secret);

  const foundUser = await checkExistingUserService(
    decodedToken.user_id,
    'user_id',
  );

  if (!foundUser) {
    return res.status(404).json({
      error: "User doesn't exist",
    });
  }

  const userForToken = {
    canSetPasswordForUser: foundUser.user_id,
  };

  const token = jwt.sign(userForToken, process.env.SECRET, {
    expiresIn: 300,
  });

  return res.status(200).send({ token });
};

const resetPassword = async (req, res) => {
  const { body, token } = req;

  const decodedToken = jwt.verify(token, process.env.SECRET);

  const foundUser = await checkExistingUserService(
    decodedToken.canSetPasswordForUser,
    'user_id',
  );

  if (!foundUser) {
    return res.status(404).json({
      error: "User doesn't exist",
    });
  }

  const updatedUser = await resetPasswordService(foundUser, body.password);

  if (!updatedUser) {
    return res.status(500).json({
      error: "Couldn't reset the password. Please try again later.",
    });
  }

  await resetPasswordConfirmService(updatedUser);

  return res.status(204).end();
};

module.exports = {
  login,
  requestPasswordReset,
  resetPasswordEmailConfirm,
  resetPassword,
};
