const jwt = require('jsonwebtoken');
const {
  checkExistingUserService,
  sendPassResetEmailService,
  resetPasswordService,
  resetPasswordConfirmService,
} = require('./authService');

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
  requestPasswordReset,
  resetPasswordEmailConfirm,
  resetPassword,
};
