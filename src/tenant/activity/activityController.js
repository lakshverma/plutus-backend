const jwt = require('jsonwebtoken');
const { TENANT_CONTEXT } = require('../../common/util/config');
const activityService = require('./activityService');

const setTenantContext = (token) => {
  const decodedToken = jwt.verify(token, process.env.SECRET);
  TENANT_CONTEXT.tenantInfo = decodedToken.orgId;
  TENANT_CONTEXT.userInfo = decodedToken.userId;
};

const getTimeline = async (req, res) => {
  const { contactId } = req.params;
  const { query, token } = req;

  setTenantContext(token);

  const timelineData = await activityService.getTimelineForContact(contactId, query);
  return res.json(timelineData);
};

const getOptions = async (req, res) => {
  const options = await activityService.getActivityOptions();
  return res.json(options);
};

const getRecentActivities = async (req, res) => {
  try {
    const { token } = req;

    const decodedToken = jwt.verify(token, process.env.SECRET);
    TENANT_CONTEXT.tenantInfo = decodedToken.orgId;
    TENANT_CONTEXT.userInfo = decodedToken.userId;

    const activities = await activityService.getRecentActivities();

    return res.status(200).json(activities);
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    return res.status(500).json({
      message: 'Failed to fetch recent activities',
      error: error.message,
    });
  }
};

module.exports = {
  getTimeline,
  getOptions,
  getRecentActivities,
};
