const Router = require('express-promise-router');
const {
  validateContactId,
  validateNewNote,
  validateNoteToUpdate,
  validateContactAndNoteId,
} = require('./noteValidator');
const {
  createNote,
  getAllNotes,
  updateNote,
  deleteNote,
} = require('./noteController');
const { authorize } = require('../../../common/util/middleware');
const { ROLES } = require('../../../common/util/helper');

const router = new Router({ mergeParams: true });
const auth = authorize(['root', ROLES.superAdmin, ROLES.admin, ROLES.standard, ROLES.limited]);

// Routes are nested under a contact
// e.g., /api/:tenantId/contacts/:contactId/notes

router.post('/', [auth, validateNewNote], createNote);
router.get('/', [auth, validateContactId], getAllNotes);
router.put('/:noteId', [auth, validateNoteToUpdate], updateNote);
router.delete('/:noteId', [auth, validateContactAndNoteId], deleteNote);

module.exports = router;
