const dal = require("./subscriptionPlanDAL");

const getPlanService = async () => {
  const plans = await dal.get();
  return plans;
};

const createPlanService = async (values) => {
  const newPlan = await dal.insert(values);
  return newPlan;
};

const updatePlanService = async (plan_id, plan) => {
  const foundPlan = await dal.find(plan_id);
  return foundPlan ? await dal.update(plan_id, plan) : null;
};

module.exports = { getPlanService, createPlanService, updatePlanService };
