const {
  getPlanService,
  createPlanService,
  updatePlanService,
} = require('./subscriptionPlanService');

const getAll = async (req, res) => {
  const plans = await getPlanService();
  res.json(plans);
};

const createPlan = async (req, res) => {
  const values = Object.values(req.body);

  try {
    const newPlan = await createPlanService(values);
    return res.status(201).json(newPlan);
  } catch (err) {
    return res
      .status(500)
      .json({ error: 'new plan could not be added, try again later.' });
  }
};

const updatePlan = async (req, res) => {
  const { body } = req;

  const plan = {
    plan_name: body.plan_name,
    plan_type: body.plan_type,
    plan_cost_inr: body.plan_cost_inr,
  };

  const planId = req.params.id;

  const updatedPlan = await updatePlanService(planId, plan);

  if (!updatedPlan) {
    return res.status(404).json({
      error: "plan already deleted or doesn't exist",
    });
  }
  return res.json(updatedPlan);
};

module.exports = { getAll, createPlan, updatePlan };
