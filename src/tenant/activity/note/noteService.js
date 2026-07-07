/* eslint-disable camelcase */
const dal = require('./noteDAL');
const { TENANT_CONTEXT } = require('../../../common/util/config');
const logger = require('../../../common/util/logger');

const createNoteService = async (noteToCreate, contactId) => {
  const noteData = {
    ...noteToCreate,
    org_id: TENANT_CONTEXT.tenantInfo,
    contact_id: contactId,
    note_creator_user_id: TENANT_CONTEXT.userInfo,
  };
  return dal.create(noteData);
};

const getNotesForContactService = async (contactId) => dal.getAllForContact(contactId);

const updateNoteService = async (noteId, contactId, noteToUpdate) => {
  const existingNote = await dal.get(noteId, contactId);
  if (!existingNote) {
    logger.warn(`Note ${noteId} for contact ${contactId} not found.`);
    return null;
  }
  return dal.update(noteId, contactId, noteToUpdate);
};

const deleteNoteService = async (noteId, contactId) => {
  const result = await dal.remove(noteId, contactId);
  if (!result) {
    logger.warn(`Failed to delete note ${noteId} for contact ${contactId} or note not found.`);
    return null;
  }
  return result;
};

module.exports = {
  createNoteService,
  getNotesForContactService,
  updateNoteService,
  deleteNoteService,
};
