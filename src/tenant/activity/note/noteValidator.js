const { body, param } = require('express-validator');
const { validationMiddleware } = require('../../../common/util/middleware');

const validateContactAndNoteId = [
  param('contactId').isUUID(4).withMessage('Contact ID must be a valid UUID.'),
  param('noteId').isNumeric().withMessage('Note ID must be a number.'),
  validationMiddleware,
];

const validateContactId = [
  param('contactId').isUUID(4).withMessage('Contact ID must be a valid UUID.'),
  validationMiddleware,
];

const validateNewNote = [
  param('contactId').isUUID(4).withMessage('Contact ID must be a valid UUID.'),
  body('note_description').isString().trim().notEmpty()
    .withMessage('Note description is required and cannot be empty.'),
  validationMiddleware,
];

const validateNoteToUpdate = [
  param('contactId').isUUID(4).withMessage('Contact ID must be a valid UUID.'),
  param('noteId').isNumeric().withMessage('Note ID must be a number.'),
  body('note_description').optional().isString().trim()
    .notEmpty()
    .withMessage('Note description cannot be empty when provided.'),
  body('note_creator_user_id').optional().isUUID(4)
    .withMessage('Note creator user ID must be a valid UUID.'),
  body().custom((value, { req }) => {
    if (
      req.body.note_description === undefined
      && req.body.note_creator_user_id === undefined
    ) {
      throw new Error('Provide at least note_description or note_creator_user_id to update.');
    }
    return true;
  }),
  validationMiddleware,
];

module.exports = {
  validateContactAndNoteId,
  validateContactId,
  validateNewNote,
  validateNoteToUpdate,
};
