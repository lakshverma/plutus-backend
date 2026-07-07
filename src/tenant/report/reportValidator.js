const validateLifeEventsQuery = (req, res, next) => {
  const { month, day, type } = req.query;

  if (!month) {
    return res.status(400).json({ error: 'Month is required' });
  }

  const monthInt = parseInt(month, 10);
  if (Number.isNaN(monthInt) || monthInt < 1 || monthInt > 12) {
    return res.status(400).json({ error: 'Month must be an integer between 1 and 12' });
  }

  if (day) {
    const dayInt = parseInt(day, 10);
    if (Number.isNaN(dayInt) || dayInt < 1 || dayInt > 31) {
      return res.status(400).json({ error: 'Day must be an integer between 1 and 31' });
    }
  }

  if (type && !['birthday', 'anniversary', 'both'].includes(type)) {
    return res.status(400).json({ error: 'Type must be birthday, anniversary, or both' });
  }

  return next();
};

module.exports = {
  validateLifeEventsQuery,
};
