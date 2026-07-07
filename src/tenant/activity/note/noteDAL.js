/* eslint-disable camelcase */
const db = require('../../../common/db/index');

const create = async (noteData) => {
  const {
    org_id, contact_id, note_creator_user_id, note_description,
  } = noteData;
  // Use a subquery in RETURNING to fetch the name atomically
  const text = `
    INSERT INTO note (org_id, contact_id, note_creator_user_id, note_description)
    VALUES ($1, $2, $3, $4)
    RETURNING *,
    (
      SELECT CONCAT(first_name, ' ', COALESCE(middle_name || ' ', ''), last_name)
      FROM org_user
      WHERE user_id = $3
    ) AS note_creator_name`;
  const values = [org_id, contact_id, note_creator_user_id, note_description];
  const { rows } = await db.query(text, values);
  return rows[0];
};

const getAllForContact = async (contactId) => {
  const text = `
    SELECT
      n.note_id,
      n.note_create_timestamp,
      n.note_description,
      CONCAT(ou.first_name, ' ', COALESCE(ou.middle_name || ' ', ''), ou.last_name) AS note_creator_name
    FROM
      note n
    JOIN
      org_user ou ON n.note_creator_user_id = ou.user_id
    WHERE
      n.contact_id = $1
    ORDER BY
      n.note_create_timestamp DESC`;
  const { rows } = await db.query(text, [contactId]);
  return rows;
};

const get = async (noteId, contactId) => {
  const text = `
    SELECT
      n.note_id,
      n.note_create_timestamp,
      n.note_description,
      n.note_creator_user_id,
      CONCAT(ou.first_name, ' ', COALESCE(ou.middle_name || ' ', ''), ou.last_name) AS note_creator_name
    FROM
      note n
    JOIN
      org_user ou ON n.note_creator_user_id = ou.user_id
    WHERE
      n.note_id = $1 AND n.contact_id = $2`;
  const { rows } = await db.query(text, [noteId, contactId]);
  return rows[0];
};

const update = async (noteId, contactId, fieldsToUpdate) => {
  const keys = Object.keys(fieldsToUpdate);
  const setClause = keys
    .map((key, index) => `${key} = $${index + 1}`)
    .join(', ');

  const values = Object.values(fieldsToUpdate);
  values.push(noteId, contactId);

  // Use a subquery in RETURNING, referencing the updated row's creator_id
  const text = `
    UPDATE note
    SET ${setClause}
    WHERE note_id = $${values.length - 1} AND contact_id = $${values.length}
    RETURNING *,
    (
      SELECT CONCAT(first_name, ' ', COALESCE(middle_name || ' ', ''), last_name)
      FROM org_user
      WHERE user_id = note.note_creator_user_id
    ) AS note_creator_name`;

  const { rows } = await db.query(text, values);
  return rows[0];
};

const remove = async (noteId, contactId) => {
  const text = 'DELETE FROM note WHERE note_id = $1 AND contact_id = $2 RETURNING *';
  const { rows } = await db.query(text, [noteId, contactId]);
  return rows[0];
};

module.exports = {
  create,
  getAllForContact,
  get,
  update,
  remove,
};
