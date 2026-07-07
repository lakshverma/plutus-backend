const Router = require('express-promise-router');
const {
  validateGetAllContacts,
  validateGetAllOptions,
  validateContactId,
  validateNewContact,
  validateContactToUpdate,
  validateDeleteContacts,
} = require('./contactValidator');
const {
  getContact,
  getAllContacts,
  getAllOptions,
  getContactStats,
  createContact,
  updateContact,
  // updateContactProperty,
  deleteContact,
  deleteContacts,
} = require('./contactController');
const { authorize } = require('../../common/util/middleware');
const { ROLES } = require('../../common/util/helper');

const router = new Router();

router.get('/stats/dashboard', [authorize(['root', ROLES.superAdmin, ROLES.admin, ROLES.standard, ROLES.limited])], getContactStats);
router.get('/', [authorize(['root', ROLES.superAdmin, ROLES.admin, ROLES.standard, ROLES.limited]), validateGetAllContacts], getAllContacts);
router.get('/:id', [authorize(['root', ROLES.superAdmin, ROLES.admin, ROLES.standard, ROLES.limited]), validateContactId], getContact);
router.get('/options/all', [authorize(['root', ROLES.superAdmin, ROLES.admin, ROLES.standard]), validateGetAllOptions], getAllOptions);
// TODO: Fix the validator for contact-names, groupheads and cities routes
router.get('/options/contact-names', [authorize(['root', ROLES.superAdmin, ROLES.admin, ROLES.standard]), validateGetAllOptions], getAllOptions);
router.get('/options/contact-types', [authorize(['root', ROLES.superAdmin, ROLES.admin, ROLES.standard]), validateGetAllOptions], getAllOptions);
router.get('/options/contact-statuses', [authorize(['root', ROLES.superAdmin, ROLES.admin, ROLES.standard]), validateGetAllOptions], getAllOptions);
router.get('/options/contact-owners', [authorize(['root', ROLES.superAdmin, ROLES.admin, ROLES.standard]), validateGetAllOptions], getAllOptions);
router.get('/options/groupheads', [authorize(['root', ROLES.superAdmin, ROLES.admin, ROLES.standard]), validateGetAllOptions], getAllOptions);
router.get('/options/cities', [authorize(['root', ROLES.superAdmin, ROLES.admin, ROLES.standard]), validateGetAllOptions], getAllOptions);
router.post('/', [authorize(['root', ROLES.superAdmin, ROLES.admin, ROLES.standard]), validateNewContact], createContact);
router.put('/:id', [authorize(['root', ROLES.superAdmin, ROLES.admin, ROLES.standard]), validateContactToUpdate], updateContact);
// router.patch(
//   '/:id',
//   [authorize(['root', ROLES.superAdmin, ROLES.admin, ROLES.standard]), validateContactToUpdate],
//   updateContactProperty,
// );
router.delete('/batch', [authorize(['root', ROLES.superAdmin, ROLES.admin, ROLES.standard]), validateDeleteContacts], deleteContacts);
router.delete('/:id', [authorize(['root', ROLES.superAdmin, ROLES.admin, ROLES.standard]), validateContactId], deleteContact);

module.exports = router;
