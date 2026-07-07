const {
  body, param, query,
} = require('express-validator');
const { validationMiddleware } = require('../../common/util/middleware');
const {
  RELATIONSHIP_GROUP_HEAD,
  MARITAL_STATUS,
  RISK_PROFILE,
  CONTACT_STATUS,
  INDUSTRY,
  CONTACT_SOURCE,
} = require('../../common/util/helper');

const validateGetAllContacts = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer.'),
  query('limit').optional().isInt({ min: 1 }).withMessage('Limit must be a positive integer.'),
  query('sortBy').optional().isString().withMessage('SortBy must be a string.'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('SortOrder must be "asc" or "desc".'),
  query('filters').optional().isJSON().withMessage('Filters must be a valid JSON string.'),
  validationMiddleware,
];

const validateGetAllOptions = [
  query('fieldName').optional().isString().withMessage('Field name must be a string.'),
  validationMiddleware,
];

const validateContactId = [
  param('id')
    .isUUID(4)
    .withMessage('Contact ID must be a valid UUID.'),
  validationMiddleware,
];

const validateNewContact = [
  body('referred_by_name').optional().isString().withMessage('Referred by name must be a string.'),
  body('contactType').notEmpty().withMessage('Contact Type is required.'),
  body('group_codes_group_id').optional().isNumeric().withMessage('Group ID must be a number.'),
  body('group_head').isBoolean().withMessage('Group head is required.'),
  body('group_head_relation').if(body('group_head').equals('true')).notEmpty().withMessage('Relationship to group head is required when the contact is a group head.'),
  body('first_name').isString().trim().notEmpty()
    .withMessage('First name is required.'),
  body('middle_name').optional({ nullable: true }).isString(),
  body('last_name').isString().trim().notEmpty()
    .withMessage('Last name is required.'),
  body('dob').isISO8601().toDate().withMessage('Date of Birth is required and must be a valid date.'),
  body('marital_status').notEmpty().withMessage('Marital status is required.'),
  body('anniversary_date').optional({ nullable: true }).isISO8601().toDate()
    .withMessage('Anniversary date must be a valid date.'),
  body('gross_annual_income').isNumeric().withMessage('Gross Annual Income is required and must be a number.'),
  body('email').isEmail().normalizeEmail().withMessage('A valid personal email is required.'),
  body('correspondenceEmail').isEmail().normalizeEmail().withMessage('A valid correspondence email is required.'),
  body('political_exposure').isBoolean().withMessage('Political exposure is required.'),
  body('birth_place_city_name').notEmpty().withMessage('Birth place city is required.'),
  body('residence_status_name').notEmpty().withMessage('Residence status is required.'),
  body('non_res_tax_id').optional({ nullable: true }).isString(),
  body('profession_name').notEmpty().withMessage('Profession is required.'),
  body('loan_details').optional({ nullable: true }).isString(),
  body('risk_profile').notEmpty().withMessage('Risk profile is required.'),
  body('contactOwner').notEmpty().withMessage('Contact owner is required.'),
  body('contactStatus').notEmpty().withMessage('Contact status is required.'),
  body('org_name').optional({ nullable: true }).isString(),
  body('industry').notEmpty().withMessage('Industry is required.'),
  body('contact_source').notEmpty().withMessage('Contact source is required.'),
  body('is_active').isBoolean().withMessage('Is active is required.'),
  body('personalAddress').optional({ nullable: true }).isString(),
  body('personalCityName').optional({ nullable: true }).isString(),
  body('personalPincode').optional({ nullable: true }).isString(),
  body('personalPhone').optional({ nullable: true }).isString(),
  body('personalMobile').optional({ nullable: true }).isString(),
  body('workAddress').optional({ nullable: true }).isString(),
  body('workCityName').optional({ nullable: true }).isString(),
  body('workPincode').optional({ nullable: true }).isString(),
  body('workPhone').optional({ nullable: true }).isString(),
  body('workMobile').optional({ nullable: true }).isString(),
  validationMiddleware,
];

const validateContactToUpdate = [
  // Validate the contact ID from the URL parameters
  param('id')
    .isUUID(4)
    .withMessage('Contact ID must be a valid UUID.'),

  // Make all body fields optional for updates
  // Note: The field names (e.g., 'contactType', 'contactOwner') match the camelCase
  // format seen in the example PUT request payload.

  body('referred_by_name').optional().isString().withMessage('Referred by name must be a string.'),
  body('contactType').optional().isString().withMessage('Contact Type must be a string.'),
  body('group_codes_group_id').optional().isNumeric().withMessage('Group ID must be a number.'),
  body('group_head').optional().isBoolean().withMessage('Group head must be a boolean.'),
  body('group_head_relation').optional().isIn(RELATIONSHIP_GROUP_HEAD.map((r) => r.value)).withMessage('Please choose a valid relationship from the list.'),
  body('first_name').optional().isString().trim()
    .notEmpty()
    .withMessage('First name cannot be empty.'),
  body('middle_name').optional({ nullable: true }).isString(),
  body('last_name').optional().isString().trim()
    .notEmpty()
    .withMessage('Last name cannot be empty.'),
  body('dob').optional().isISO8601().toDate()
    .withMessage('Date of Birth must be a valid date.'),
  body('marital_status').optional().isIn(MARITAL_STATUS.map((s) => s.value)).withMessage('Please choose a valid marital status.'),
  body('anniversary_date').optional({ nullable: true }).isISO8601().toDate()
    .withMessage('Anniversary date must be a valid date.'),
  body('gross_annual_income').optional().isNumeric().withMessage('Gross Annual Income must be a number.'),
  body('email').optional().isEmail().normalizeEmail()
    .withMessage('Must use a valid email format for personal email.'),
  body('correspondenceEmail').optional().isEmail().normalizeEmail()
    .withMessage('Must use a valid email format for correspondence email.'),
  body('political_exposure').optional().isBoolean().withMessage('Political exposure must be a boolean.'),
  body('birth_place_city_name').optional().isString().withMessage('Birth place city name must be a string.'),
  body('residence_status_name').optional().isString().withMessage('Residence status name must be a string.'),
  body('non_res_tax_id').optional({ nullable: true }).isString(),
  body('profession_name').optional().isString().withMessage('Profession name must be a string.'),
  body('loan_details').optional({ nullable: true }).isString(),
  body('risk_profile').optional().isIn(RISK_PROFILE.map((r) => r.value)).withMessage('Please choose a valid risk profile.'),
  body('contactOwner').optional().isString().withMessage('Contact owner name must be a string.'),
  body('contactStatus').optional().isIn(CONTACT_STATUS.map((s) => s.value)).withMessage('Please choose a valid contact status.'),
  body('org_name').optional({ nullable: true }).isString(),
  body('industry').optional().isIn(INDUSTRY.map((i) => i.value)).withMessage('Please choose a valid industry.'),
  body('contact_source').optional().isIn(CONTACT_SOURCE.map((s) => s.value)).withMessage('Please choose a valid contact source.'),
  body('is_active').optional().isBoolean().withMessage('Is active must be a boolean.'),

  // Correspondence Address Fields (optional and allowing null)
  body('personalAddress').optional({ nullable: true }).isString(),
  body('personalCityName').optional({ nullable: true }).isString(),
  body('personalPincode').optional({ nullable: true }).isString(),
  body('personalPhone').optional({ nullable: true }).isString(),
  body('personalMobile').optional({ nullable: true }).isString(),
  body('workAddress').optional({ nullable: true }).isString(),
  body('workCityName').optional({ nullable: true }).isString(),
  body('workPincode').optional({ nullable: true }).isString(),
  body('workPhone').optional({ nullable: true }).isString(),
  body('workMobile').optional({ nullable: true }).isString(),

  validationMiddleware,
];

const validateDeleteContacts = [
  body('contactIds').isArray({ min: 1 }).withMessage('contactIds must be an array with at least one contact ID.'),
  body('contactIds.*').isUUID(4).withMessage('All items in contactIds must be a valid UUID.'),
  validationMiddleware,
];

module.exports = {
  validateGetAllContacts,
  validateGetAllOptions,
  validateContactId,
  validateNewContact,
  validateContactToUpdate,
  validateDeleteContacts,
};
