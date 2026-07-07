const jwt = require('jsonwebtoken');
const { TENANT_CONTEXT } = require('../../../common/util/config');
const {
  createNoteService,
  getNotesForContactService,
  updateNoteService,
  deleteNoteService,
} = require('./noteService');

const setTenantContext = (token) => {
  const decodedToken = jwt.verify(token, process.env.SECRET);
  TENANT_CONTEXT.tenantInfo = decodedToken.orgId;
  TENANT_CONTEXT.userInfo = decodedToken.userId;
};

const createNote = async (req, res) => {
  const { params, body, token } = req;
  setTenantContext(token);
  const createdNote = await createNoteService(body, params.contactId);
  return res.status(201).json(createdNote);
};

const getAllNotes = async (req, res) => {
  const { params, token } = req;
  setTenantContext(token);
  const notes = await getNotesForContactService(params.contactId);
  return res.json(notes);
};

const updateNote = async (req, res) => {
  const { params, body, token } = req;
  setTenantContext(token);
  const updatedNote = await updateNoteService(params.noteId, params.contactId, body);
  if (!updatedNote) {
    return res.status(404).json({ message: 'Note not found.' });
  }
  return res.status(200).json(updatedNote);
};

const deleteNote = async (req, res) => {
  const { params, token } = req;
  setTenantContext(token);
  const result = await deleteNoteService(params.noteId, params.contactId);
  if (result) {
    return res.status(204).end();
  }
  return res.status(404).json({ error: 'Note not found or deletion failed.' });
};

module.exports = {
  createNote,
  getAllNotes,
  updateNote,
  deleteNote,
};
