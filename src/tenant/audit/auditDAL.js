const db = require('../../common/db/index');
const logger = require('../../common/util/logger');

const getContactAuditTrail = async (contactId) => {
  const text = `
    (
      SELECT
          'property_' || event_id as unique_id,
          event_id,
          'property_change' as event_type,
          table_name,
          action,
          action_tstamp,
          audit.contact_property_log.user_id,
          CONCAT(first_name, ' ', COALESCE(middle_name || ' ', ''), last_name) AS user_name,
          diff_data,
          new_data,
          original_data
      FROM
          audit.contact_property_log
      LEFT JOIN
          org_user ON audit.contact_property_log.user_id::uuid = org_user.user_id
      WHERE
          (new_data ->> 'contact_id' = $1 OR original_data ->> 'contact_id' = $1)
          AND table_name = 'contact'
          AND action IN ('I', 'U')
    )
    UNION ALL
    (
      SELECT
          'activity_' || event_id as unique_id,
          event_id,
          'activity_change' as event_type,
          table_name,
          action,
          action_tstamp,
          audit.activity_contact_log.user_id,
          CONCAT(first_name, ' ', COALESCE(middle_name || ' ', ''), last_name) AS user_name,
          diff_data,
          new_data,
          original_data
      FROM
          audit.activity_contact_log
      LEFT JOIN
          org_user ON audit.activity_contact_log.user_id::uuid = org_user.user_id
      WHERE
          (new_data ->> 'contact_id' = $1 OR original_data ->> 'contact_id' = $1)
    )
    ORDER BY
        action_tstamp DESC;
  `;

  try {
    const { rows } = await db.query(text, [contactId]);
    return rows;
  } catch (error) {
    logger.error(`Error fetching audit trail for contact ${contactId}: ${error.message}`, { stack: error.stack });
    throw error;
  }
};

const getCityNamesByIds = async (cityIds) => {
  if (!cityIds || cityIds.length === 0) {
    return new Map();
  }
  try {
    const { rows } = await db.query('SELECT city_id, city_name FROM city WHERE city_id = ANY($1::int[])', [cityIds]);
    return new Map(rows.map((item) => [item.city_id, item.city_name]));
  } catch (error) {
    logger.error(`Error fetching city names: ${error.message}`, { stack: error.stack });
    throw error;
  }
};

const getDealStageNamesByIds = async (dealStageIds) => {
  if (!dealStageIds || dealStageIds.length === 0) {
    return new Map();
  }
  try {
    const { rows } = await db.query(
      "SELECT deal_stage_id, deal_stage FROM deal_stage WHERE org_id = current_setting('app.current_tenant')::uuid AND deal_stage_id = ANY($1::bigint[])",
      [dealStageIds],
    );
    return new Map(rows.map((item) => [item.deal_stage_id, item.deal_stage]));
  } catch (error) {
    logger.error(`Error fetching deal stage names: ${error.message}`, { stack: error.stack });
    throw error;
  }
};

module.exports = {
  getContactAuditTrail,
  getCityNamesByIds,
  getDealStageNamesByIds,
};
