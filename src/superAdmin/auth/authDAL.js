const db = require("../../common/db/index");
const logger = require("../../common/util/logger");

// Allows searching a user by user_id (uuid v4 type) or email. 
// By default, the function accepts email ids as unique identifiers.
const findUser = async (userIdentifier, identifierType = "email") => {
  if (identifierType === "user_id") {
    const text = "SELECT * FROM org_user WHERE user_id = $1";
    const { rows } = await db.query(text, [userIdentifier]);
    return rows[0];
  }
  const text = "SELECT * FROM org_user WHERE email = $1";
  const { rows } = await db.query(text, [userIdentifier]);
  return rows[0];
};

const createUser = async (userValues, orgValues) => {
  const client = await db.getClient();
  let newOrg = null;
  let newUser = null;

  const orgQueryText = `
  INSERT INTO org_details(org_name,org_size,org_website,subscription_plans_plan_id,status) 
  VALUES($1, 
    $2, 
    $3, 
    (SELECT plan_id FROM subscription_plans WHERE plan_name=$4), 
    $5)
  ON CONFLICT(org_name) DO NOTHING 
  RETURNING *
  `;

  const userQueryText = `
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

  const orgIdQueryText = `
  SELECT org_id 
  FROM org_details 
  WHERE org_name = $1
  `;

  try {
    await client.query("BEGIN");

    newOrg = await client.query(orgQueryText, orgValues);

    // If the default superAdmin org already exists, we fetch its id from db using org name from orgValues array defined in authService.
    if ((newOrg.rows = [])) {
      newOrg = await client.query(orgIdQueryText, [orgValues[0]]);
    }

    const userValuesWithOrgId = [newOrg.rows[0].org_id, ...userValues];
    newUser = await client.query(userQueryText, userValuesWithOrgId);

    await client.query("COMMIT");
  } catch (e) {
    logger.error(e.stack);
    await client.query("ROLLBACK");
    // Resetting the newOrg and newUser values to ensure the function returns undefined in an event there's an error.
    newOrg = { rows: [] };
    newUser = { rows: [] };
  } finally {
    client.release();
    return { ...newOrg.rows[0], ...newUser.rows[0] };
  }
};

const updateUser = async (userId, valuesToUpdate) => {
  const length = Object.keys(valuesToUpdate).length;

  let index = 0;
  let keyString = '';

  for (const [key, value] of Object.entries(valuesToUpdate)) {
    index++;
    keyString += `${key} = \$${index}`
    if (index === length) {
      break;
    }
    keyString += `, ` 
  }

  const text = `UPDATE org_user SET ` + keyString + ` WHERE user_id = \$${index + 1} RETURNING *`;
  const values = Object.values(valuesToUpdate);
  values.push(userId);
  
  const { rows } = await db.query(text, values);

  return rows[0];
};

const findOrg = async(orgName) => {
  const text = "SELECT * FROM org_details WHERE org_name = $1";
  const { rows } = await db.query(text, [orgName]);
  return rows[0];
};

module.exports = {
  findUser,
  createUser,
  updateUser,
  findOrg,
};
