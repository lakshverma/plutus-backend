const Router = require('express-promise-router');

const { getAll, createPlan, updatePlan } = require('./subscriptionPlanController');
const validateSubscriptionPlan = require('./subscriptionPlanValidator');

const router = new Router();

router.get('/', getAll);

router.post('/', validateSubscriptionPlan, createPlan);

router.put('/:id', validateSubscriptionPlan, updatePlan);

module.exports = router;
