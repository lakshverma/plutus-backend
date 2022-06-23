const bcrypt = require("bcrypt");
const dal = require("./authDAL");
const logger = require("../../common/util/logger");
const jwt = require("jsonwebtoken");
var { SendMailClient } = require("zeptomail");
const { ZEPTOMAIL_CONFIG } = require("../../common/util/config");

const createUserService = async (values, role = "admin") => {
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(values.password, saltRounds);

  if (role === "superadmin") {
    const userValues = [
      values.firstName,
      values.middleName || null,
      values.lastName,
      values.email,
      values.username,
      passwordHash,
      "superadmin",
      "Manager",
      "active",
    ];

    // All superadmins are added as users with a superadmin role in a fictitious org called Dunder Mifflin.
    const orgValues = [
      "Dunder Mifflin",
      "10-50",
      "www.dunder-mifflin.com/",
      "Sambar",
      "active",
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

  // User status is set to unverified by default. It is set to active once email confirmation is successful.
  const userValues = [
    values.firstName,
    values.middleName,
    values.lastName,
    values.email,
    values.username,
    passwordHash,
    role,
    values.jobTitle,
    "unverified",
  ];

  const orgValues = [
    values.orgName,
    values.orgSize,
    values.orgWebsite,
    "Bushpig",
    "active",
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
// This is because this service is used in a variety of contexts where only one of the identifiers might be available.
const checkExistingUserService = async (
  userIdentifier,
  identifierType = "email"
) => {
  const user = await dal.findUser(userIdentifier, identifierType);
  return user ? user : null;
};

const checkExistingTenantService = async (orgName) => {
  const org = await dal.findOrg(orgName);
  return org ? org : null;
};

const sendWelcomeEmailService = async (userDetails) => {
  const url = ZEPTOMAIL_CONFIG.url;
  const token = ZEPTOMAIL_CONFIG.signup.token;

  let client = new SendMailClient({ url, token });

  const userForJwtToken = {
    user_id: userDetails.user_id,
  };

  const jwtToken = jwt.sign(userForJwtToken, process.env.SECRET, {
    expiresIn: "12h",
  });

  client
    .sendMailWithTemplate({
      mail_template_key: ZEPTOMAIL_CONFIG.signup.templateKey,
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
      },
      track_clicks: true,
      track_opens: true,
    })
    .then((resp) => logger.info(resp))
    .catch((error) => logger.error(error));

  return 0;
};

const verifyUserService = async (id) => {
  const user = await checkExistingUserService(id, "user_id");
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
    status: "verified",
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
