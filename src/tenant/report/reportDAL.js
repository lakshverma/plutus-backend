const db = require('../../common/db/index');
const { TENANT_CONTEXT } = require('../../common/util/config');

const getLifeEvents = async (month, day, type) => {
  // Pattern: Retrieve orgId from global context
  const orgId = TENANT_CONTEXT.tenantInfo;

  const values = [orgId, month];
  let dateFilter = 'EXTRACT(MONTH FROM %field%) = $2';

  if (day) {
    values.push(day);
    dateFilter += ' AND EXTRACT(DAY FROM %field%) = $3';
  }

  const queries = [];

  // Birthday Query
  if (type === 'birthday' || type === 'both') {
    queries.push(`
      SELECT 
        contact_id,
        first_name,
        middle_name,
        last_name,
        email,
        dob AS event_date,
        'birthday' AS event_type
      FROM contact
      WHERE org_id = $1 AND is_active = TRUE AND ${dateFilter.replace(/%field%/g, 'dob')}
    `);
  }

  // Anniversary Query
  if (type === 'anniversary' || type === 'both') {
    queries.push(`
      SELECT 
        contact_id,
        first_name,
        middle_name,
        last_name,
        email,
        anniversary_date AS event_date,
        'anniversary' AS event_type
      FROM contact
      WHERE org_id = $1 AND is_active = TRUE AND ${dateFilter.replace(/%field%/g, 'anniversary_date')}
    `);
  }

  const text = queries.join(' UNION ALL ');
  const { rows } = await db.query(text, values);
  return rows;
};

module.exports = {
  getLifeEvents,
};
