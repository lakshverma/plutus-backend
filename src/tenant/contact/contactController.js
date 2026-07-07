const jwt = require('jsonwebtoken');
const { TENANT_CONTEXT } = require('../../common/util/config');
const logger = require('../../common/util/logger');
const {
  contactCreationService,
  getContactService,
  getOptionsService,
  getContactStatsService,
  updateContactService,
  deleteContactService,
  deleteContactsService,
  contactPaginationService,
} = require('./contactService');

const createContact = async (req, res) => {
  const { body, token } = req;

  const decodedToken = jwt.verify(token, process.env.SECRET);
  TENANT_CONTEXT.tenantInfo = decodedToken.orgId;
  TENANT_CONTEXT.userInfo = decodedToken.userId;

  const createdContact = await contactCreationService(body);
  return res.status(201).json(createdContact);
};

const getContact = async (req, res) => {
  const { params, token } = req;

  const decodedToken = jwt.verify(token, process.env.SECRET);
  TENANT_CONTEXT.tenantInfo = decodedToken.orgId;
  TENANT_CONTEXT.userInfo = decodedToken.userId;

  const contact = await getContactService(params.id);
  // Check if the service returned null (contact not found)
  if (!contact) {
    return res.status(404).json({ success: false, message: 'Contact not found' });
  }
  return res.json(contact);
};

const getAllContacts = async (req, res) => {
  const { query, token } = req;

  const decodedToken = jwt.verify(token, process.env.SECRET);
  TENANT_CONTEXT.tenantInfo = decodedToken.orgId;
  TENANT_CONTEXT.userInfo = decodedToken.userId;

  const contactPage = await contactPaginationService(query);
  if ('error' in contactPage && contactPage.error) {
    return res.status(400).json(contactPage);
  }
  return res.json(contactPage);
};

const getAllOptions = async (req, res) => {
/*
Step 1: Check if the user has permissions to fetch the data
  a. if they do, set tenant context
    i. Send the request to the service to get all options
    ii. Return the results
  b. if they don't, return a 401
Step 2: Return results
*/
  const { query, token } = req;
  const decodedToken = jwt.verify(token, process.env.SECRET);
  TENANT_CONTEXT.tenantInfo = decodedToken.orgId;
  TENANT_CONTEXT.userInfo = decodedToken.userId;

  if (req.path === '/options/all') {
    const options = await getOptionsService();
    return res.json(options);
  }
  if (req.path === '/options/contact-names') {
    const options = await getOptionsService({ fieldName: 'contactNames', query: query.contactName });
    return res.json(options);
  }
  if (req.path === '/options/groupheads') {
    const options = await getOptionsService({ fieldName: 'groupHeads', query: query.contactName });
    return res.json(options);
  }
  if (req.path === '/options/contact-types') {
    const options = await getOptionsService({ fieldName: 'contactTypes', query: query.contactType });
    return res.json(options);
  }
  if (req.path === '/options/contact-statuses') {
    const options = await getOptionsService({ fieldName: 'contactStatuses' });
    return res.json(options);
  }
  if (req.path === '/options/contact-owners') {
    const options = await getOptionsService({ fieldName: 'contactOwners', query: query.contactOwner });
    return res.json(options);
  }
  if (req.path === '/options/cities') {
    const options = await getOptionsService({ fieldName: 'cities', query: query.city });
    return res.json(options);
  }
  return res.status(404).json({
    error: "Resource doesn't exist",
  });
};

const getContactStats = async (req, res) => {
  const { token } = req;

  const decodedToken = jwt.verify(token, process.env.SECRET);
  TENANT_CONTEXT.tenantInfo = decodedToken.orgId;
  TENANT_CONTEXT.userInfo = decodedToken.userId;

  const stats = await getContactStatsService();
  return res.json(stats);
};

const updateContact = async (req, res) => {
  const { params, body, token } = req;

  const decodedToken = jwt.verify(token, process.env.SECRET);
  TENANT_CONTEXT.tenantInfo = decodedToken.orgId;
  TENANT_CONTEXT.userInfo = decodedToken.userId;

  const updatedContact = await updateContactService({ contact_id: params.id, ...body });

  if (updatedContact) {
    return res.status(204).end();
  }
  return res.status(400).end();
};

const deleteContact = async (req, res) => {
  const { params, token } = req;

  const decodedToken = jwt.verify(token, process.env.SECRET);
  TENANT_CONTEXT.tenantInfo = decodedToken.orgId;
  TENANT_CONTEXT.userInfo = decodedToken.userId;

  const result = await deleteContactService(params.id);
  if (result) {
    res.status(204).end();
  } else {
    // Contact not found or already inactive, or other deletion failure
    logger.warn(`Failed to delete contact ${params.id} or contact not found.`);
    res.status(404).json({ error: 'Contact not found or deletion failed.' });
  }
};

const deleteContacts = async (req, res) => {
  const { body, token } = req;
  const { contactIds } = body;

  const decodedToken = jwt.verify(token, process.env.SECRET);
  TENANT_CONTEXT.tenantInfo = decodedToken.orgId;
  TENANT_CONTEXT.userInfo = decodedToken.userId;

  try {
    const results = await deleteContactsService(contactIds);
    // If the service throws an error on partial failure, this won't be reached for partials.
    // If it returns results, we can check them.
    if (results && results.failed.length > 0) {
      logger.warn(`Batch deletion completed with ${results.failed.length} failures for tenant ${TENANT_CONTEXT.tenantInfo}. Failed IDs: ${results.failed.map((f) => f.id).join(', ')}`);
      // Optionally, return 207 Multi-Status with details of failures
      return res.status(207).json({
        message: 'Batch deletion processed with some failures.',
        success: results.success,
        failed: results.failed,
      });
    }
    return res.status(204).end();
  } catch (error) {
    logger.error(`Batch delete failed for tenant ${TENANT_CONTEXT.tenantInfo}: ${error.message}`, { stack: error.stack, contactIds });
    return res.status(500).json({ error: 'An error occurred during batch deletion.' });
  }
};

module.exports = {
  getContact,
  getAllContacts,
  getAllOptions,
  getContactStats,
  createContact,
  updateContact,
  deleteContact,
  deleteContacts,
};
