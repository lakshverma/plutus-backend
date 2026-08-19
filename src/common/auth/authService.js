/* eslint-disable camelcase */
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dal = require('./authDAL');
const logger = require('../util/logger');
const { sendEmail } = require('../util/mailer');
const {
  RESEND_CONFIG,
  CLIENT_BASE_URL,
} = require('../util/config');

const checkExistingUserService = async (
  userIdentifier,
  identifierType = 'email',
) => {
  const user = await dal.findUser(userIdentifier, identifierType);
  return user || null;
};

const sendPassResetEmailService = async (user) => {
  const payload = {
    canSetPasswordForUser: user.user_id,
  };

  const token = jwt.sign(payload, process.env.SECRET, {
    expiresIn: '1h',
  });

  const {
    first_name, middle_name, last_name, email,
  } = user;

  const fullName = middle_name
    ? `${first_name} ${middle_name} ${last_name}`
    : `${first_name} ${last_name}`;

  const resetLink = `${CLIENT_BASE_URL}/resetpass/${token}`;

  try {
    const { data, error } = await sendEmail({
      from: RESEND_CONFIG.fromAddress,
      to: [email],
      subject: 'Reset your Plutus password',
      template: {
        id: RESEND_CONFIG.passwordResetTemplateId,
        variables: {
          Contact_Name: fullName,
          email,
          password_reset_link: resetLink,
        },
      },
    });

    if (error) {
      logger.error('Resend Error (Password Reset):', error);
      return;
    }
    logger.info('Resend Email Sent (Password Reset):', data);
  } catch (err) {
    logger.error('Resend Exception (Password Reset):', err);
  }
};

const resetPasswordService = async (user, newPassword) => {
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(newPassword, saltRounds);

  const valuesToUpdate = {
    password_hash: passwordHash,
  };

  const updatedUser = await dal.updateUser(user.user_id, valuesToUpdate);
  return updatedUser;
};

const resetPasswordConfirmService = async (user) => {
  const {
    first_name, middle_name, last_name, email,
  } = user;

  const fullName = middle_name
    ? `${first_name} ${middle_name} ${last_name}`
    : `${first_name} ${last_name}`;

  try {
    const { data, error } = await sendEmail({
      from: RESEND_CONFIG.fromAddress,
      to: [email],
      subject: 'Your Plutus password has been reset',
      template: {
        id: RESEND_CONFIG.passwordResetSuccessTemplateId,
        variables: {
          Contact_Name: fullName,
          email,
        },
      },
    });

    if (error) {
      logger.error('Resend Error (Reset Success):', error);
      return;
    }
    logger.info('Resend Email Sent (Reset Success):', data);
  } catch (err) {
    logger.error('Resend Exception (Reset Success):', err);
  }
};

module.exports = {
  checkExistingUserService,
  sendPassResetEmailService,
  resetPasswordService,
  resetPasswordConfirmService,
};
