const { check } = require('express-validator');
const { validationMiddleware } = require('../../common/util/middleware');

const validateQueryChars = [
  check('q')
    .exists()
    .withMessage('There must be a valid query to perform search')
    .bail()
    .isString()
    .withMessage('Search query can only be a combination of alphabets, numbers and special chars')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Search query cannot be empty.')
    .bail()
    .isLength({ min: 3 })
    .withMessage('Minimum 3 characters required.')
    .bail()
    // This custom sanitizer replaces any special characters in search query with spaces
    // so that it can be parsed by Postgres full text search function to_tsquery()
    .customSanitizer((value) => value.replace(/[^\w\s]/gi, ' ')),
  validationMiddleware,
];

module.exports = {
  validateQueryChars,
};
