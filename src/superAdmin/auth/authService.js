const bcrypt = require("bcrypt");
const dal = require("./authDAL");

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
    return newUser;
  }

  const userValues = [
    values.firstName,
    values.middleName,
    values.lastName,
    values.email,
    values.username,
    passwordHash,
    values.role,
    values.jobTitle,
    "active",
  ];

  const orgValues = [
    values.orgName,
    values.orgSize,
    values.orgWebsite,
    values.subscriptionPlan,
    "active",
  ];

  const newUser = await dal.createUser(userValues, orgValues);
  return newUser;
};

const checkExistingUser = async (userEmail) => {
  const user = await dal.findUser(userEmail);
  return user ? user : null;
};

module.exports = { createUserService, checkExistingUser };
