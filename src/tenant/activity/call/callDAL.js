/* eslint-disable camelcase */
const db = require('../../../common/db/index');

const create = async (callData) => {
  const {
    org_id,
    contact_id,
    call_creator_user_id,
    call_description,
    call_activity_date,
    call_activity_time,
    call_outcome,
  } = callData;

  // Use a subquery in RETURNING to fetch the name atomically
  const text = `
    INSERT INTO call (
      org_id, contact_id, call_creator_user_id, call_description,
      call_activity_date, call_activity_time, call_outcome
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *,
    (
      SELECT CONCAT(first_name, ' ', COALESCE(middle_name || ' ', ''), last_name)
      FROM org_user
      WHERE user_id = $3
    ) AS call_creator_name`;

  const values = [
    org_id,
    contact_id,
    call_creator_user_id,
    call_description,
    call_activity_date,
    call_activity_time,
    call_outcome,
  ];
  const { rows } = await db.query(text, values);
  return rows[0];
};

const getAllForContact = async (contactId) => {
  const text = `
    SELECT
      c.call_id,
      c.call_create_timestamp,
      c.call_description,
      c.call_activity_date,
      c.call_activity_time,
      c.call_outcome,
      CONCAT(ou.first_name, ' ', COALESCE(ou.middle_name || ' ', ''), ou.last_name) AS call_creator_name
    FROM
      call c
    JOIN
      org_user ou ON c.call_creator_user_id = ou.user_id
    WHERE
      c.contact_id = $1
    ORDER BY
      c.call_create_timestamp DESC`;
  const { rows } = await db.query(text, [contactId]);
  return rows;
};

const get = async (callId, contactId) => {
  const text = `
    SELECT
      c.*,
      CONCAT(ou.first_name, ' ', COALESCE(ou.middle_name || ' ', ''), ou.last_name) AS call_creator_name
    FROM
      call c
    JOIN
      org_user ou ON c.call_creator_user_id = ou.user_id
    WHERE
      c.call_id = $1 AND c.contact_id = $2`;
  const { rows } = await db.query(text, [callId, contactId]);
  return rows[0];
};

const update = async (callId, contactId, fieldsToUpdate) => {
  const keys = Object.keys(fieldsToUpdate);
  const setClause = keys
    .map((key, index) => `${key} = $${index + 1}`)
    .join(', ');

  const values = Object.values(fieldsToUpdate);
  values.push(callId, contactId);

  // Use a subquery in RETURNING, referencing the updated row's creator_id
  const text = `
    UPDATE call
    SET ${setClause}
    WHERE call_id = $${values.length - 1} AND contact_id = $${values.length}
    RETURNING *,
    (
      SELECT CONCAT(first_name, ' ', COALESCE(middle_name || ' ', ''), last_name)
      FROM org_user
      WHERE user_id = call.call_creator_user_id
    ) AS call_creator_name`;

  const { rows } = await db.query(text, values);
  return rows[0];
};

const remove = async (callId, contactId) => {
  const text = 'DELETE FROM call WHERE call_id = $1 AND contact_id = $2 RETURNING *';
  const { rows } = await db.query(text, [callId, contactId]);
  return rows[0];
};

module.exports = {
  create,
  getAllForContact,
  get,
  update,
  remove,
};
