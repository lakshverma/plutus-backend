const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const {
  createUserService,
  verifyUserService,
  checkExistingUserService,
  checkExistingTenantService,
  sendWelcomeEmailService,
} = require('./authService');

const loginRoot = async (req, res) => {
  const { body } = req;

  if (
    !(
      body.username === process.env.ROOT_USER
      && body.password === process.env.ROOT_PASSWORD
    )
  ) {
    return res.status(401).json({
      error: 'invalid username or password',
    });
  }

  const userForToken = {
    username: process.env.ROOT_USER,
    role: 'root',
  };

  const token = jwt.sign(userForToken, process.env.SECRET);

  return res.status(200).send({ token });
};

const createSuperAdmin = async (req, res) => {
  const { body } = req;
  const existingUser = await checkExistingUserService(body.email);

  if (existingUser) {
    return res.status(409).json({
      error: 'user already exists, try signing in or use another email id.',
    });
  }

  const newSuperAdmin = await createUserService(body, 'superadmin');

  return res.status(201).json(newSuperAdmin);
};

const loginSuperAdmin = async (req, res) => {
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

  if (!(user.user_roles_user_roles_id === 1)) {
    return res.status(401).json({
      error: 'not authorized to access this route',
    });
  }

  const userForToken = {
    orgId: user.org_id,
    userId: user.user_id,
    email: user.email,
    role: 'superadmin',
  };

  const token = jwt.sign(userForToken, process.env.SECRET);

  return res.status(200).send({ token });
};

// Creates a new tenant and an admin user for the tenant.
// If the tenant already exists, a new admin user is added under the existing tenant org.
const createTenant = async (req, res) => {
  const { body } = req;

  const existingUser = await checkExistingUserService(body.email);
  const existingTenant = await checkExistingTenantService(body.orgName);

  // Case 1: Both Org and User exist
  // Solution: Return an error with 409 code with a message that tells to use
  // a different org and email or, login if the user owns the account.
  if (existingTenant && existingUser) {
    return res.status(409).json({
      error: 'User already exists, try signing in or use another email id.',
    });
  }
  // Case 2: Org doesn't exists but the user exists
  // Solution: Return an error with 409 code with a message that asks user to use another email
  if (!existingTenant && existingUser) {
    return res.status(409).json({
      error: 'User already exists, try signing in or use another email id.',
    });
  }
  // Case 3: Org exists but the user doesn't exist.
  // Solution: Create a user with admin role within the existing org
  if (existingTenant && !existingUser) {
    const newTenantAdmin = await createUserService(body, 'admin');
    await sendWelcomeEmailService(newTenantAdmin);
    return res.status(201).json(newTenantAdmin);
  }
  // Case 4: Neither org nor user exists.
  // Solution: Create an org and a user with admin role in the newly created org
  const newTenantAdmin = await createUserService(body, 'admin');
  await sendWelcomeEmailService(newTenantAdmin);
  return res.status(201).json(newTenantAdmin);
};

// Triggers the email confirmation flow. Used when user signs up but doesn't verify before
// the JWT token expires. This is used to re-trigger the confirmation flow with a fresh token.
const confirmEmail = async (req, res) => {
  const { body } = req;
  const existingUser = await checkExistingUserService(body.email);
  if (!existingUser) {
    return res.status(404).json({
      error: 'User does not exist.',
    });
  }

  if (existingUser.status === 'verified') {
    return res.status(409).json({
      error:
        'User already verified, try logging in with the correct credentials.',
    });
  }

  await sendWelcomeEmailService(existingUser);
  return res.status(204).end();
};

// Verify user account using email decoded from the JWT token generated
// by createTenant, createUser or confirmEmail controllers.
const verifyUser = async (req, res) => {
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
  const verifiedUser = await verifyUserService(foundUser.user_id);
  if (!verifiedUser) {
    return res.status(500).json({
      error: "Couldn't verify the user. Please try again later.",
    });
  }
  return res.status(200).json({
    status: verifiedUser,
  });
};

module.exports = {
  loginRoot,
  createSuperAdmin,
  loginSuperAdmin,
  createTenant,
  confirmEmail,
  verifyUser,
};
