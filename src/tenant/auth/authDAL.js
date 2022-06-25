const db = require("../../common/db/index");

// Allows searching a user by user_id (uuid v4 type) or email.
// By default, the function accepts email ids as unique identifiers.
const findUser = async (userIdentifier, identifierType = "email") => {
  if (identifierType === "user_id") {
    const text =
      "SELECT org_user.*, user_roles.role_type FROM org_user JOIN user_roles ON (org_user.user_roles_user_roles_id = user_roles.user_roles_id) WHERE user_id = $1";
    const { rows } = await db.query(text, [userIdentifier]);
    return rows[0];
  }
  const text =
    "SELECT org_user.*, user_roles.role_type FROM org_user JOIN user_roles ON (org_user.user_roles_user_roles_id = user_roles.user_roles_id) WHERE email = $1";
  const { rows } = await db.query(text, [userIdentifier]);
  return rows[0];
};

const createUser = async (userValues) => {
  const text = `
    INSERT INTO org_user(org_id,first_name,middle_name,last_name,email,username,password_hash,user_roles_user_roles_id,job_title,status) 
    VALUES($1, 
      $2, 
      $3, 
      $4, 
      $5, 
      $6, 
      $7, 
      (SELECT user_roles_id FROM user_roles WHERE role_type=$8), 
      $9,
      $10) 
    RETURNING *
      `;

  const { rows } = await db.query(text, userValues);
  return rows[0];
};

const updateUser = async (userId, valuesToUpdate) => {
  const length = Object.keys(valuesToUpdate).length;

  let index = 0;
  let keyString = "";

  for (const [key, value] of Object.entries(valuesToUpdate)) {
    index++;
    keyString += `${key} = \$${index}`;
    if (index === length) {
      break;
    }
    keyString += `, `;
  }

  const text =
    `UPDATE org_user SET ` +
    keyString +
    ` WHERE user_id = \$${index + 1} RETURNING *`;
  const values = Object.values(valuesToUpdate);
  values.push(userId);

  const { rows } = await db.query(text, values, "superAdmin");

  return rows[0];
};

module.exports = {
  findUser,
  createUser,
  updateUser,
};
