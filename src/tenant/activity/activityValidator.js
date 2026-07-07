const { param, query } = require('express-validator');
const { validationMiddleware } = require('../../common/util/middleware');

const VALID_ACTIVITY_TYPES = ['note', 'call', 'meeting', 'email', 'task', 'deal', 'transaction'];

const validateGetTimeline = [
  param('contactId').isUUID(4).withMessage('Contact ID must be a valid UUID.'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be a number between 1 and 100.'),
  query('before').optional().isISO8601().withMessage('The "before" cursor must be a valid ISO 8601 timestamp.'),
  query('after').optional().isISO8601().withMessage('The "after" cursor must be a valid ISO 8601 timestamp.'),
  query('type').optional().custom((value) => {
    const types = Array.isArray(value) ? value : [value];
    const invalid = types.filter((t) => !VALID_ACTIVITY_TYPES.includes(t));
    if (invalid.length > 0) {
      throw new Error(`Invalid activity types: ${invalid.join(', ')}`);
    }
    return true;
  }),
  query().custom((value) => {
    if (value.before && value.after) {
      throw new Error('Cannot use "before" and "after" cursors simultaneously.');
    }
    return true;
  }),
  validationMiddleware,
];

const validateGetOptions = [
  validationMiddleware,
];

const validateGetRecentActivities = [
  validationMiddleware,
];

module.exports = {
  validateGetTimeline,
  validateGetOptions,
  validateGetRecentActivities,
};
