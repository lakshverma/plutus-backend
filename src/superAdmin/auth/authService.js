/* eslint-disable camelcase */
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// eslint-disable-next-line no-var
// var { SendMailClient } = require('zeptomail');
const { Resend } = require('resend');
const dal = require('./authDAL');
const logger = require('../../common/util/logger');
// const { ZEPTOMAIL_CONFIG } = require('../../common/util/config');
const {
  RESEND_CONFIG, // Changed config import
  APP_BASE_URL,
} = require('../../common/util/config');

const createUserService = async (values, role = 'admin') => {
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(values.password, saltRounds);

  if (role === 'superadmin') {
    const userValues = [
      values.firstName,
      values.middleName || null,
      values.lastName,
      values.email,
      values.username,
      passwordHash,
      'superadmin',
      'Manager',
      'active',
    ];

    // All superadmins are added as users with a superadmin role in a
    // fictitious org called Dunder Mifflin.
    const orgValues = [
      'Dunder Mifflin',
      '10-50',
      'www.dunder-mifflin.com/',
      'Sambar',
      'active',
    ];

    const newUser = await dal.createUser(userValues, orgValues);
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
  }

  // User status is set to unverified by default. It is set to active once
  // email confirmation is successful.
  const userValues = [
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

  const orgValues = [
    values.orgName,
    values.orgSize,
    values.orgWebsite,
    'Bushpig',
    'active',
  ];

  const newUser = await dal.createUser(userValues, orgValues);
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

// Supports finding the user by uuid as well as email since both are unique identifiers.
// This is because this service is used in a variety of contexts where only one of the
// identifiers might be available.
const checkExistingUserService = async (
  userIdentifier,
  identifierType = 'email',
) => {
  const user = await dal.findUser(userIdentifier, identifierType);
  return user || null;
};

const checkExistingTenantService = async (orgName) => {
  const org = await dal.findOrg(orgName);
  return org || null;
};

const sendWelcomeEmailService = async (userDetails) => {
  const resend = new Resend(RESEND_CONFIG.apiKey);

  const userForJwtToken = {
    user_id: userDetails.user_id,
  };

  const jwtToken = jwt.sign(userForJwtToken, process.env.SECRET, {
    expiresIn: '12h',
  });

  const {
    first_name, middle_name, last_name, email, org_id,
  } = userDetails;

  const fullName = middle_name
    ? `${first_name} ${middle_name} ${last_name}`
    : `${first_name} ${last_name}`;

  const verifyUrl = `${APP_BASE_URL}/superadmin/auth/verify/${jwtToken}`;

  try {
    const { data, error } = await resend.emails.send({
      from: RESEND_CONFIG.fromAddress,
      to: [email],
      subject: 'Welcome to Plutus - Verify your email',
      template: {
        id: RESEND_CONFIG.signupTemplateId,
        variables: {
          Contact_Name: fullName,
          email,
          verify_account_link: verifyUrl,
          tenant_id: org_id, // Still passing org_id if the template needs it for display
        },
      },
    });

    if (error) {
      logger.error('Resend encountered an error:', error);
      return;
    }
    logger.info('Resend email sent successfully:', data);
  } catch (err) {
    logger.error('Exception during email sending:', err);
  }
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
  createUserService,
  checkExistingUserService,
  checkExistingTenantService,
  sendWelcomeEmailService,
  verifyUserService,
};
