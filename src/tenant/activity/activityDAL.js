/* eslint-disable camelcase */
const db = require('../../common/db/index');

const getTimeline = async (contactId, {
  limit, cursor, direction, types,
}) => {
  const values = [contactId, limit];
  let cursorClause = '';
  let typeClause = '';

  if (cursor) {
    // The direction determines if we are fetching older records ('before')
    // or newer records ('after').
    const operator = direction === 'before' ? '<' : '>';
    // Use dynamic parameter index based on current values length
    cursorClause = `AND unified_activities.timestamp ${operator} $${values.length + 1}`;
    values.push(cursor);
  }

  if (types && types.length > 0) {
    // Use dynamic parameter index
    typeClause = `AND activity_type = ANY($${values.length + 1})`;
    values.push(types);
  }

  // This CTE (Common Table Expression) unifies all activity types into a single structure.
  // Each SELECT statement must have the same columns with the same aliases.
  const text = `
    WITH unified_activities AS (
      -- Notes
      SELECT
        'note' AS activity_type,
        n.note_id AS id,
        n.note_create_timestamp AS timestamp,
        n.note_description AS description,
        CONCAT(ou.first_name, ' ', COALESCE(ou.middle_name || ' ', ''), ou.last_name) AS creator_name,
        json_build_object() AS details
      FROM note n
      LEFT JOIN org_user ou ON n.note_creator_user_id = ou.user_id
      WHERE n.contact_id = $1

      UNION ALL

      -- Calls
      SELECT
        'call' AS activity_type,
        c.call_id AS id,
        c.call_create_timestamp AS timestamp,
        c.call_description AS description,
        CONCAT(ou.first_name, ' ', COALESCE(ou.middle_name || ' ', ''), ou.last_name) AS creator_name,
        json_build_object(
          'activity_date', c.call_activity_date,
          'activity_time', c.call_activity_time,
          'outcome', c.call_outcome
        ) AS details
      FROM call c
      LEFT JOIN org_user ou ON c.call_creator_user_id = ou.user_id
      WHERE c.contact_id = $1

      UNION ALL

      -- Meetings
      SELECT
        'meeting' AS activity_type,
        m.meeting_id AS id,
        m.meeting_create_timestamp AS timestamp,
        m.meeting_description AS description,
        CONCAT(ou.first_name, ' ', COALESCE(ou.middle_name || ' ', ''), ou.last_name) AS creator_name,
        json_build_object(
          'activity_date', m.meeting_activity_date,
          'activity_time', m.meeting_activity_time,
          'duration', m.meeting_duration,
          'outcome', m.meeting_outcome
        ) AS details
      FROM meeting m
      LEFT JOIN org_user ou ON m.meeting_creator_user_id = ou.user_id
      WHERE m.contact_id = $1

      UNION ALL

      -- Emails
      SELECT
        'email' AS activity_type,
        e.email_id AS id,
        e.email_create_timestamp AS timestamp,
        e.email_description AS description,
        CONCAT(ou.first_name, ' ', COALESCE(ou.middle_name || ' ', ''), ou.last_name) AS creator_name,
        json_build_object() AS details
      FROM email e
      LEFT JOIN org_user ou ON e.email_creator_user_id = ou.user_id
      WHERE e.contact_id = $1

      UNION ALL

      -- Tasks
      SELECT
        'task' AS activity_type,
        t.task_id AS id,
        t.task_create_timestamp AS timestamp,
        t.task_name AS description,
        CONCAT(ou.first_name, ' ', COALESCE(ou.middle_name || ' ', ''), ou.last_name) AS creator_name,
        json_build_object(
          'type', t.task_type,
          'query_type', t.task_query_type,
          'full_description', t.task_description
        ) AS details
      FROM task t
      LEFT JOIN org_user ou ON t.task_owner_user_id = ou.user_id
      WHERE t.contact_id = $1

      UNION ALL

      -- Deals
      SELECT
        'deal' AS activity_type,
        d.deal_id AS id,
        d.deal_create_timestamp AS timestamp,
        'Deal created' AS description, -- Deals don't have a description, so we create one
        CONCAT(ou.first_name, ' ', COALESCE(ou.middle_name || ' ', ''), ou.last_name) AS creator_name,
        json_build_object(
          'amount', d.deal_amount,
          'close_date', d.close_date,
          'type', d.deal_type
        ) AS details
      FROM deal d
      LEFT JOIN org_user ou ON d.deal_creator_user_id = ou.user_id
      WHERE d.contact_id = $1

      UNION ALL

      -- Transactions
      SELECT
        'transaction' AS activity_type,
        tr.transaction_id AS id,
        tr.transaction_create_timestamp AS timestamp,
        'Transaction recorded' AS description,
        CONCAT(ou.first_name, ' ', COALESCE(ou.middle_name || ' ', ''), ou.last_name) AS creator_name,
        json_build_object(
          'amount', tr.transaction_amount,
          'date', tr.transaction_date,
          'type', tr.transaction_type
        ) AS details
      FROM transaction tr
      LEFT JOIN org_user ou ON tr.transaction_creator_user_id = ou.user_id
      WHERE tr.contact_id = $1
    )
    SELECT * FROM unified_activities
    WHERE 1=1 ${cursorClause} ${typeClause}
    ORDER BY timestamp DESC
    LIMIT $2;
  `;

  const { rows } = await db.query(text, values);
  return rows;
};

const getRecentActivities = async (limit = 5) => {
  const query = `
    SELECT 
      'activity' as source,
      event_id,
      table_name,
      action,
      action_tstamp,
      CASE 
        WHEN action = 'I' THEN new_data
        WHEN action = 'U' THEN new_data
        WHEN action = 'D' THEN original_data
      END as data,
      org_id,
      user_id
    FROM audit.activity_contact_log
    
    UNION ALL
    
    SELECT 
      'contact' as source,
      event_id,
      table_name,
      action,
      action_tstamp,
      CASE 
        WHEN action = 'I' THEN new_data
        WHEN action = 'U' THEN new_data
        WHEN action = 'D' THEN original_data
      END as data,
      org_id,
      user_id
    FROM audit.contact_property_log
    WHERE table_name = 'contact'
    
    ORDER BY action_tstamp DESC
    LIMIT $1
  `;

  const result = await db.query(query, [limit]);
  return result.rows;
};

const getContactNamesByIds = async (contactIds) => {
  const query = `
    SELECT 
      contact_id,
      CONCAT(first_name, ' ', COALESCE(middle_name || ' ', ''), last_name) AS contact_name
    FROM contact
    WHERE contact_id = ANY($1)
  `;

  const result = await db.query(query, [contactIds]);
  return result.rows;
};

module.exports = {
  getTimeline,
  getRecentActivities,
  getContactNamesByIds,
};
