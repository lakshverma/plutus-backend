const dal = require('./activityDAL');
const { CALL_OUTCOME } = require('../../common/util/helper');

const getTimelineForContact = async (contactId, query) => {
  const limit = parseInt(query.limit, 10) || 10;
  const { before, after, type } = query;

  // Normalize 'type' to an array if it exists (handles ?type=call and ?type=call&type=note)
  let types = null;
  if (type) {
    types = Array.isArray(type) ? type : [type];
  }

  const options = {
    limit: limit + 1, // Fetch one extra record to see if there are more pages
    cursor: before || after,
    direction: before ? 'before' : 'after',
    types,
  };

  const activities = await dal.getTimeline(contactId, options);

  let nextCursor = null;
  // If we fetched the extra record, it means there's a next page.
  if (activities.length > limit) {
    // The cursor for the next page is the timestamp of the last item in the current page.
    nextCursor = activities[limit - 1].timestamp.toISOString();
    // Remove the extra record before sending the response.
    activities.pop();
  }

  return {
    activities,
    pagination: {
      next_cursor: nextCursor,
    },
  };
};

const getActivityOptions = async () => ({
  call_outcomes: CALL_OUTCOME,
});

const formatTimeAgo = (timestamp) => {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return diffMins === 1 ? '1 minute ago' : `${diffMins} minutes ago`;
  }
  if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }
  return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
};

const getActivityTitle = (tableName, action) => {
  const actionMap = {
    I: 'added',
    U: 'updated',
    D: 'deleted',
  };

  const tableMap = {
    contact: 'Contact',
    note: 'Note',
    call: 'Call',
    meeting: 'Meeting',
    deal: 'Deal',
    email: 'Email',
    task: 'Task',
  };

  const actionText = actionMap[action] || 'modified';
  const entityText = tableMap[tableName] || tableName;

  return `${entityText} ${actionText}`;
};

const extractActivityData = (activity) => {
  const { data, table_name: tableName } = activity;

  if (!data) {
    return {
      activityId: null,
      contactId: null,
      contactName: null,
    };
  }

  // Extract activity-specific ID based on table name
  const activityId = data[`${tableName}_id`] || null;

  // Extract contact ID
  const contactId = data.contact_id || null;

  // Extract contact name (for contact table where first_name and last_name exist)
  let contactName = null;
  if (data.first_name || data.last_name) {
    const firstName = data.first_name || '';
    const lastName = data.last_name || '';
    contactName = `${firstName} ${lastName}`.trim() || null;
  }

  return {
    activityId,
    contactId,
    contactName,
  };
};

const getRecentActivities = async () => {
  const activities = await dal.getRecentActivities(5);

  // Extract unique contact IDs that need name lookup
  const contactIdsNeedingLookup = new Set();
  const activityData = activities.map((activity) => {
    const extracted = extractActivityData(activity);

    // If we have a contact ID but no contact name, add it to the set
    if (extracted.contactId && !extracted.contactName) {
      contactIdsNeedingLookup.add(extracted.contactId);
    }

    return {
      activity,
      extracted,
    };
  });

  // Fetch contact names only if needed
  let contactNameMap = new Map();
  if (contactIdsNeedingLookup.size > 0) {
    const contactNamesResult = await dal.getContactNamesByIds(
      Array.from(contactIdsNeedingLookup),
    );
    contactNameMap = new Map(
      contactNamesResult.map((row) => [row.contact_id, row.contact_name]),
    );
  }

  // Build final response with contact names
  return activityData.map(({ activity, extracted }) => {
    const contactName = extracted.contactName
      || contactNameMap.get(extracted.contactId)
      || null;

    return {
      eventId: activity.event_id,
      title: getActivityTitle(activity.table_name, activity.action),
      contactName,
      contactId: extracted.contactId,
      activityType: activity.table_name,
      activityId: extracted.activityId,
      timestamp: activity.action_tstamp,
      timeAgo: formatTimeAgo(activity.action_tstamp),
      action: activity.action,
    };
  });
};

module.exports = {
  getTimelineForContact,
  getActivityOptions,
  getRecentActivities,
};
