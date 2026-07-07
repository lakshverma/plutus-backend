const Router = require('express-promise-router');
const { validateGetTimeline, validateGetOptions, validateGetRecentActivities } = require('./activityValidator');
const { getTimeline, getOptions, getRecentActivities } = require('./activityController');
const { authorize } = require('../../common/util/middleware');
const { ROLES } = require('../../common/util/helper');

const router = new Router({ mergeParams: true });
const auth = authorize(['root', ROLES.superAdmin, ROLES.admin, ROLES.standard, ROLES.limited]);

router.get('/options', [auth, validateGetOptions], getOptions);
router.get('/', [auth, validateGetTimeline], getTimeline);
router.get('/recent', [auth, validateGetRecentActivities], getRecentActivities);

module.exports = router;
