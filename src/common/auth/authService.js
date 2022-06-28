const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// eslint-disable-next-line no-var
var { SendMailClient } = require('zeptomail');
const dal = require('./authDAL');
const logger = require('../util/logger');
const { ZEPTOMAIL_CONFIG } = require('../util/config');

const checkExistingUserService = async (
  userIdentifier,
  identifierType = 'email',
) => {
  const user = await dal.findUser(userIdentifier, identifierType);
  return user || null;
};

const sendPassResetEmailService = async (userDetails) => {
  const { url } = ZEPTOMAIL_CONFIG;
  const { token } = ZEPTOMAIL_CONFIG.recover;

  const userForJwtToken = {
    user_id: userDetails.user_id,
  };

  const jwtToken = jwt.sign(userForJwtToken, process.env.SECRET, {
    expiresIn: 600,
  });

  const client = new SendMailClient({ url, token });

  client
    .sendMailWithTemplate({
      mail_template_key: ZEPTOMAIL_CONFIG.recover.templateKey.passwordResetLink,
      bounce_address: ZEPTOMAIL_CONFIG.bounceAddress,
      from: {
        address: ZEPTOMAIL_CONFIG.fromEmail,
        name: ZEPTOMAIL_CONFIG.fromName,
      },
      to: [
        {
          email_address: {
            address: userDetails.email,
            name: userDetails.first_name,
          },
        },
      ],
      merge_info: {
        name: userDetails.first_name,
        email: userDetails.email,
        password_reset_link: jwtToken,
      },
      track_clicks: true,
      track_opens: true,
    })
    .then((resp) => logger.info(resp))
    .catch((error) => logger.error(error));

  return 0;
};

const resetPasswordService = async (userDetails, passwordToUpdate) => {
  const saltRounds = 10;
  const newPasswordHash = await bcrypt.hash(passwordToUpdate, saltRounds);

  const userToUpdate = {
    first_name: userDetails.first_name,
    middle_name: userDetails.middle_name,
    last_name: userDetails.last_name,
    email: userDetails.email,
    username: userDetails.username,
    password_hash: newPasswordHash,
    user_roles_user_roles_id: userDetails.user_roles_user_roles_id,
    job_title: userDetails.job_title,
    status: userDetails.status,
  };

  const updatedUser = await dal.updateUser(userDetails.user_id, userToUpdate);

  return updatedUser;
};

const resetPasswordConfirmService = async (userDetails) => {
  const { url } = ZEPTOMAIL_CONFIG;
  const { token } = ZEPTOMAIL_CONFIG.recover;

  const client = new SendMailClient({ url, token });

  client
    .sendMailWithTemplate({
      mail_template_key:
        ZEPTOMAIL_CONFIG.recover.templateKey.passwordResetSuccess,
      bounce_address: ZEPTOMAIL_CONFIG.bounceAddress,
      from: {
        address: ZEPTOMAIL_CONFIG.fromEmail,
        name: ZEPTOMAIL_CONFIG.fromName,
      },
      to: [
        {
          email_address: {
            address: userDetails.email,
            name: userDetails.first_name,
          },
        },
      ],
      merge_info: {
        name: userDetails.first_name,
        email: userDetails.email,
      },
      track_clicks: true,
      track_opens: true,
    })
    .then((resp) => logger.info(resp))
    .catch((error) => logger.error(error));

  return 0;
};

module.exports = {
  checkExistingUserService,
  sendPassResetEmailService,
  resetPasswordService,
  resetPasswordConfirmService,
};
