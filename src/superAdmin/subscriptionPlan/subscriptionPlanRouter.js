const Router = require('express-promise-router');

const { getAll, createPlan, updatePlan } = require('./subscriptionPlanController');
const validateSubscriptionPlan = require('./subscriptionPlanValidator');
const { authorize } = require('../../common/util/middleware');

const router = new Router();

// Subscription plans are operator data, not tenant data: they are global (no org_id,
// no RLS policy) and every org's plan references them. The path prefix is not a
// control, so each route carries the same root/superadmin check the rest of
// /superadmin uses.
const auth = authorize(['root', 'superadmin']);

router.get('/', auth, getAll);

router.post('/', [auth, validateSubscriptionPlan], createPlan);

router.put('/:id', [auth, validateSubscriptionPlan], updatePlan);

module.exports = router;
