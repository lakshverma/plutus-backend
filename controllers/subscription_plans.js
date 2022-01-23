const Router = require('express-promise-router');

const db = require('../db/index')

const router = new Router()

router.get("/", async (req, res) => {
  const { rows } = await db.query('SELECT * FROM subscription_plans');
  res.json(rows);
});

router.post("/", async (req, res) => {
  const values = Object.values(req.body);
  const text = 'INSERT INTO subscription_plans VALUES ($1, $2, $3) RETURNING *'

  try {
    const { rows } = await db.query(text, values);
    res.json(rows[0]);
  } catch (err) {
    console.log(err.stack)
    return res.status(400).json({ error });
  }
});

module.exports = router;
