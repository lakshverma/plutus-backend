const db = require("../db/index");
const logger = require("../util/logger");

// Allows searching a user by user_id (uuid v4 type) or email. 
// By default, the function accepts email ids as unique identifiers.
const findUser = async (userIdentifier, identifierType = "email") => {
  if (identifierType === "user_id") {
    const text = "SELECT * FROM org_user WHERE user_id = $1";
    const { rows } = await db.query(text, [userIdentifier], "superAdmin");
    return rows[0];
  }
  const text = "SELECT * FROM org_user WHERE email = $1";
  const { rows } = await db.query(text, [userIdentifier], "superAdmin");
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
  updateUser,
};
