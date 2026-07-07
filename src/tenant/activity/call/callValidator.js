const { body, param } = require('express-validator');
const { validationMiddleware } = require('../../../common/util/middleware');

const validateContactAndCallId = [
  param('contactId').isUUID(4).withMessage('Contact ID must be a valid UUID.'),
  param('callId').isNumeric().withMessage('Call ID must be a number.'),
  validationMiddleware,
];

const validateContactId = [
  param('contactId').isUUID(4).withMessage('Contact ID must be a valid UUID.'),
  validationMiddleware,
];

const validateNewCall = [
  param('contactId').isUUID(4).withMessage('Contact ID must be a valid UUID.'),
  body('call_description').isString().trim().notEmpty()
    .withMessage('Call description is required.'),
  body('call_activity_date').isISO8601().toDate().withMessage('Activity date is required and must be a valid date.'),
  body('call_activity_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Activity time is required and must be in HH:MM format.'),
  body('call_outcome').isString().trim().notEmpty()
    .withMessage('Call outcome is required.'),
  validationMiddleware,
];

const validateCallToUpdate = [
  param('contactId').isUUID(4).withMessage('Contact ID must be a valid UUID.'),
  param('callId').isNumeric().withMessage('Call ID must be a number.'),
  body('call_description').optional().isString().trim()
    .notEmpty(),
  body('call_creator_user_id').optional().isUUID(4),
  body('call_activity_date').optional().isISO8601().toDate(),
  body('call_activity_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('call_outcome').optional().isString().trim()
    .notEmpty(),
  body().custom((value, { req }) => {
    const fields = [
      'call_description',
      'call_creator_user_id',
      'call_activity_date',
      'call_activity_time',
      'call_outcome',
    ];
    if (fields.every((field) => req.body[field] === undefined)) {
      throw new Error('Provide at least one field to update.');
    }
    return true;
  }),
  validationMiddleware,
];

module.exports = {
  validateContactAndCallId,
  validateContactId,
  validateNewCall,
  validateCallToUpdate,
};
