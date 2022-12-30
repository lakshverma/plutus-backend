const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// eslint-disable-next-line no-var
var { SendMailClient } = require('zeptomail');
const logger = require('../../common/util/logger');
const dal = require('./authDAL');
const {
  TENANT_CONTEXT,
  ZEPTOMAIL_CONFIG,
} = require('../../common/util/config');

const checkExistingUserService = async (
  userIdentifier,
  identifierType = 'email',
) => {
  const user = await dal.findUser(userIdentifier, identifierType);
  return user || null;
};

const checkExistingTenantService = () => {};

const createUserService = async (values, role = 'standard') => {
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(values.password, saltRounds);

  // User status is set to unverified by default. It is set to active once
  // email confirmation is successful.
  const userValues = [
    values.orgId,
    values.firstName,
    values.middleName,
    values.lastName,
    values.email,
    values.username,
    passwordHash,
    role,
    values.jobTitle,
    'unverified',
  ];

  const newUser = await dal.createUser(userValues);
  const newUserWithoutPassword = {
    org_id: newUser.org_id,
    user_id: newUser.user_id,
    first_name: newUser.first_name,
    middle_name: newUser.middle_name,
    last_name: newUser.last_name,
    email: newUser.email,
    username: newUser.username,
    user_roles_user_roles_id: newUser.user_roles_user_roles_id,
    job_title: newUser.job_title,
    status: newUser.status,
  };
  return newUserWithoutPassword;
};

// Currently the email template to verify the user contains superadmin/auth/verify link.
// Decide whether there should be a separate verify link for tenants.
const sendWelcomeEmailService = async (userDetails) => {
  const { url } = ZEPTOMAIL_CONFIG;
  const { token } = ZEPTOMAIL_CONFIG.signupTenant;

  const client = new SendMailClient({ url, token });

  const userForJwtToken = {
    user_id: userDetails.user_id,
  };

  const jwtToken = jwt.sign(userForJwtToken, process.env.SECRET, {
    expiresIn: '12h',
  });

  client
    .sendMailWithTemplate({
      mail_template_key: ZEPTOMAIL_CONFIG.signupTenant.templateKey,
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
        username: userDetails.email,
        verify_account_link: jwtToken,
        tenant_id: TENANT_CONTEXT.orgId,
      },
      track_clicks: true,
      track_opens: true,
    })
    .then((resp) => logger.info(resp))
    .catch((error) => logger.error(error));

  return 0;
};

const verifyUserService = async (id) => {
  const user = await checkExistingUserService(id, 'user_id');
  if (!user) {
    logger.info(`Value of user - VerifyUserService: ${user}`);
    return null;
  }
  const userToVerify = {
    first_name: user.first_name,
    middle_name: user.middle_name,
    last_name: user.last_name,
    email: user.email,
    username: user.username,
    user_roles_user_roles_id: user.user_roles_user_roles_id,
    job_title: user.job_title,
    status: 'verified',
  };
  const verifiedUser = await dal.updateUser(id, userToVerify);
  const verificationStatus = verifiedUser.status;
  return verificationStatus;
};

module.exports = {
  checkExistingUserService,
  checkExistingTenantService,
  createUserService,
  sendWelcomeEmailService,
  verifyUserService,
};
