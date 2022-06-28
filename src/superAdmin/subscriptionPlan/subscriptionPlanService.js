const dal = require('./subscriptionPlanDAL');

const getPlanService = async () => {
  const plans = await dal.get();
  return plans;
};

const createPlanService = async (values) => {
  const newPlan = await dal.insert(values);
  return newPlan;
};

const updatePlanService = async (planId, plan) => {
  const foundPlan = await dal.find(planId);
  const updatedPlan = foundPlan ? await dal.update(planId, plan) : null;
  return updatedPlan;
};

module.exports = { getPlanService, createPlanService, updatePlanService };
