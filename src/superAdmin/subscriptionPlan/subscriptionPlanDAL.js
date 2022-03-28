const db = require("../../common/db/index");

const get = async () => {
  const text = "SELECT * FROM subscription_plans";
  const { rows } = await db.query(text);
  return rows;
};

const find = async (plan_id) => {
  const text = "SELECT * FROM subscription_plans WHERE plan_id = $1";
  const { rows } = await db.query(text, [plan_id]);
  return rows[0];
};

const insert = async (values) => {
  const text =
    "INSERT INTO subscription_plans (plan_name, plan_type, plan_cost_inr) VALUES ($1, $2, $3) RETURNING *";

  const { rows } = await db.query(text, values);
  return rows[0];
};

const update = async (plan_id, plan) => {
  const text =
    "UPDATE subscription_plans SET plan_name = $2, plan_type = $3, plan_cost_inr = $4 WHERE plan_id = $1 RETURNING *";
  const values = [plan_id].concat(Object.values(plan));
  const { rows } = await db.query(text, values);
  return rows[0];
};

module.exports = { get, find, insert, update };
