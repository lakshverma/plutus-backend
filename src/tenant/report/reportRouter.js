const Router = require('express-promise-router');
const { getLifeEvents } = require('./reportController');
const { validateLifeEventsQuery } = require('./reportValidator');
const { authorize } = require('../../common/util/middleware');
const { heavyLimiter } = require('../../common/util/rateLimiter');
const { ROLES } = require('../../common/util/helper');

const router = new Router();

router.get(
  '/life-events',
  [
    heavyLimiter,
    authorize(['root', ROLES.superAdmin, ROLES.admin, ROLES.standard]),
    validateLifeEventsQuery,
  ],
  getLifeEvents,
);

module.exports = router;
