/* eslint-disable camelcase */
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const logger = require('../../common/util/logger');
const dal = require('./authDAL');
const { sendEmail } = require('../../common/util/mailer');
const {
  TENANT_CONTEXT,
  RESEND_CONFIG,
  APP_BASE_URL,
} = require('../../common/util/config');
const { ROLES } = require('../../common/util/helper');

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
  const userForJwtToken = {
    user_id: userDetails.user_id,
  };

  const jwtToken = jwt.sign(userForJwtToken, process.env.SECRET, {
    expiresIn: '12h',
  });

  // Construct Contact_Name logic
  const {
    first_name, middle_name, last_name, email,
  } = userDetails;

  const fullName = middle_name
    ? `${first_name} ${middle_name} ${last_name}`
    : `${first_name} ${last_name}`;

  const verifyUrl = `${APP_BASE_URL}/${TENANT_CONTEXT.orgId}/auth/verify/${jwtToken}`;

  try {
    const { data, error } = await sendEmail({
      from: RESEND_CONFIG.fromAddress,
      to: [email],
      subject: 'Welcome to Plutus - Verify your email', // Template subject takes, strictly speaking, precedence if set there
      template: {
        id: RESEND_CONFIG.signupTemplateId,
        variables: {
          Contact_Name: fullName,
          email,
          verify_account_link: verifyUrl,
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

const getOrgUsersService = async (orgId, currentUserId) => dal.getUsersByOrg(orgId, currentUserId);

const updateUserRoleService = async (orgId, userId, roleName) => {
  const roleId = ROLES[roleName];
  if (!roleId) {
    throw new Error('Invalid Role provided');
  }
  return dal.updateUserRole(orgId, userId, roleId);
};

module.exports = {
  checkExistingUserService,
  checkExistingTenantService,
  createUserService,
  sendWelcomeEmailService,
  verifyUserService,
  getOrgUsersService,
  updateUserRoleService,
};
