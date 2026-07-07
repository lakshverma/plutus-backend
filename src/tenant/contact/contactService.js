/* eslint-disable camelcase */
const dal = require('./contactDAL');
const { TENANT_CONTEXT } = require('../../common/util/config');
const logger = require('../../common/util/logger');
const {
  CONTACT_FILTERS,
  RELATIONSHIP_GROUP_HEAD,
  MARITAL_STATUS, POLITICAL_EXPOSURE,
  RISK_PROFILE,
  CONTACT_STATUS,
  INDUSTRY,
  CONTACT_SOURCE,
  IS_GROUP_HEAD,
  RELATIONSHIP_MATRIX,
} = require('../../common/util/helper');

const contactCreationService = async (contactToCreate) => {
  const contactData = { ...contactToCreate, org_id: TENANT_CONTEXT.tenantInfo };

  // If the contact is a group head, create a new group and associate the contact with it.
  if (contactData.groupHead) {
    return dal.createGroupAndContact(contactData);
  }
  // Otherwise, create the contact with the provided details.
  return dal.create(contactData);
};

const getContactService = async (id) => {
  const contact = await dal.get(id);

  // If no contact is found, return null immediately.
  if (!contact) {
    return null;
  }

  if (contact.family_members && contact.family_members.length > 0) {
    const contactRelationToGroupHead = contact.group_head_relation;
    const relationshipMap = RELATIONSHIP_MATRIX[contactRelationToGroupHead] || {};

    const familyRelationships = contact.family_members.map((member) => {
      const memberRelationToGroupHead = member.group_head_relation;
      const relationshipToContact = relationshipMap[memberRelationToGroupHead] || 'Unknown';

      return {
        contact_id: member.contact_id,
        full_name: member.full_name,
        group_head_relation: memberRelationToGroupHead,
        relationship_to_contact: relationshipToContact,
        is_group_head: member.group_head,
      };
    });

    contact.family_relationships = familyRelationships;
  } else {
    contact.family_relationships = [];
  }

  delete contact.family_members;

  return contact;
};

const getOptionsService = async ({ fieldName = 'all', query = null } = {}) => {
  // Helper to transform name-based options (e.g. referredBy, contactOwner)
  const transformNameOptions = (items) => items.map((item) => {
    const first = item.first_name;
    const middle = (item.middle_name && item.middle_name !== 'null' && item.middle_name.trim())
      ? `${item.middle_name} `
      : '';
    const last = item.last_name;
    return { value: item.id, label: `${first} ${middle}${last}`.trim() };
  });

  // Generic transformation: maps an array of objects to the format { value, label }
  const transformGeneric = (items, valueKey, labelKey) => items.map((item) => ({
    value: item[valueKey],
    label: item[labelKey],
  }));

  if (fieldName === 'all') {
    // Fetch the database fields
    const dbContactFields = await dal.getContactOptions();

    // concatenate the data in a single json string
    const allOptions = {
      referredBy: transformNameOptions(dbContactFields.referred_by),
      contactType: transformGeneric(dbContactFields.contact_type, 'id', 'contact_type'),
      groupHead: IS_GROUP_HEAD,
      relationGroupHead: RELATIONSHIP_GROUP_HEAD,
      maritalStatus: MARITAL_STATUS,
      politicalExposure: POLITICAL_EXPOSURE,
      birthPlaceCity: transformGeneric(dbContactFields.city_name, 'id', 'name'),
      profession: transformGeneric(dbContactFields.profession, 'id', 'name'),
      homeCity: transformGeneric(dbContactFields.city_name, 'id', 'name'),
      workCity: transformGeneric(dbContactFields.city_name, 'id', 'name'),
      residenceStatus: transformGeneric(dbContactFields.residence_status, 'id', 'status'),
      riskProfile: RISK_PROFILE,
      contactOwner: transformNameOptions(dbContactFields.contact_owner),
      contactStatus: CONTACT_STATUS,
      industry: INDUSTRY,
      contactSource: CONTACT_SOURCE,
    };
    // return the results
    return allOptions;
  }

  if (fieldName === 'contactNames') {
    const contactNames = await dal.getContactOptions('contactNames', query);
    const contactNameDropdownOptions = transformNameOptions(contactNames);
    return contactNameDropdownOptions;
  }

  if (fieldName === 'groupHeads') {
    const groupHeads = await dal.getContactOptions('groupHeads', query);
    const groupHeadDropdownOptions = transformNameOptions(groupHeads);
    return groupHeadDropdownOptions;
  }

  if (fieldName === 'contactTypes') {
    const contactTypes = await dal.getContactOptions('contactTypes', query);
    const contactTypeDropdownOptions = transformGeneric(contactTypes, 'id', 'contact_type');
    return contactTypeDropdownOptions;
  }

  if (fieldName === 'contactStatuses') {
    return CONTACT_STATUS;
  }

  if (fieldName === 'contactOwners') {
    const contactOwners = await dal.getContactOptions('contactOwners', query);
    const contactOwnerDropdownOptions = transformNameOptions(contactOwners);
    return contactOwnerDropdownOptions;
  }

  const cities = await dal.getContactOptions('cities', query);
  const cityDropdownOptions = transformGeneric(cities, 'city_id', 'city_name');
  return cityDropdownOptions;
};

const updateContactService = async (contactToUpdate) => {
  const {
    contact_id,
    group_codes_group_id,
    group_head,
    group_head_name,
    contactOwner,
    contactType,
    contactStatus,
    family_relationships,
    ...rest
  } = contactToUpdate;

  // Retrieve current contact information from the database
  const currentContactInfo = await dal.get(contact_id);

  const newGroupIdValue = (
    group_codes_group_id || currentContactInfo.group_codes_group_id
  );

  const newRole = (group_head !== undefined) ? group_head : currentContactInfo.group_head;

  const isGroupChanged = newGroupIdValue !== currentContactInfo.group_codes_group_id;
  const isRoleChanged = newRole !== currentContactInfo.group_head;

  // Case 1: Group and role have changed
  if (isGroupChanged && isRoleChanged) {
    // Sub-case 1A: Contact was a group head but will not be a group head in the new group
    if (currentContactInfo.group_head) {
      // Retrieve other members of the current group from the database
      const otherGroupContacts = await dal.getOtherGroupContacts(
        currentContactInfo.contact_id,
        currentContactInfo.group_codes_group_id,
      );

      if (otherGroupContacts.length) {
        // Sub-case 1A.1: Other members exist in the old group, make the oldest member the new
        // group head
        const newGroupHead = otherGroupContacts[0];
        // Update the database: set the oldest member as the new group head and transfer the contact
        const updatedContact = await dal.update(
          {
            contactId: currentContactInfo.contact_id,
            groupHeads: {
              isCurrentHead: currentContactInfo.group_head,
              oldGroupNewHead: newGroupHead.contact_id,
            },
            newGroupId: newGroupIdValue,
          },
          rest,
        );
        return updatedContact;
      }
      // Sub-case 1A.2: No other members in the old group, deactivate the old group
      // Update the database: deactivate the old group and transfer the contact to the new group
      const updatedContact = await dal.update(
        {
          contactId: currentContactInfo.contact_id,
          groupHeads: {
            isCurrentHead: currentContactInfo.group_head,
          },
          newGroupId: newGroupIdValue,
          deactivateOldGroup: true,
        },
        rest,
      );
      return updatedContact;
    }

    // Sub-case 1B: Contact was a member and will be the group head of the new group
    // Update the database: set the contact as the group head of the new group
    const updatedContact = await dal.update(
      {
        contactId: currentContactInfo.contact_id,
        groupHeads: {
          isNewGroupGroupHead: newRole,
        },
        newGroupId: newGroupIdValue,
      },
      rest,
    );
    return updatedContact;
  }

  // Case 2: Group has changed, but role remains the same
  if (isGroupChanged && !isRoleChanged) {
    if (currentContactInfo.group_head) {
      // Retrieve other members of the current group from the database
      const otherGroupContacts = await dal.getOtherGroupContacts(
        currentContactInfo.contact_id,
        currentContactInfo.group_codes_group_id,
      );

      // Sub-case 2A: Contact was a group head and will continue as group head in the new group
      if (otherGroupContacts.length) {
        // Other members exist in the old group, make the oldest member the new group head
        // Update the database: set the oldest member as the new group head and transfer the contact
        const newGroupHead = otherGroupContacts[0];
        const updatedContact = await dal.update(
          {
            contactId: currentContactInfo.contact_id,
            groupHeads: {
              isCurrentHead: currentContactInfo.group_head,
              oldGroupNewHead: newGroupHead.contact_id,
              isNewGroupGroupHead: newRole,
            },
            newGroupId: newGroupIdValue,
          },
          rest,
        );
        return updatedContact;
      }

      // No other members in the old group, deactivate the old group
      // Update the database: deactivate the old group and transfer the contact to the new group
      const updatedContact = await dal.update(
        {
          contactId: currentContactInfo.contact_id,
          groupHeads: {
            isCurrentHead: currentContactInfo.group_head,
            isNewGroupGroupHead: newRole,
          },
          newGroupId: newGroupIdValue,
          deactivateOldGroup: true,
        },
        rest,
      );
      return updatedContact;
    }

    // Sub-case 2B: Contact was a member and will continue as a member in the new group
    // Update the database: just update the group ID and other properties
    const updatedContact = await dal.update(
      {
        contactId: currentContactInfo.contact_id,
        newGroupId: newGroupIdValue,
      },
      rest,
    );
    return updatedContact;
  }

  // Case 3: Group has not changed, but role has changed
  if (!isGroupChanged && isRoleChanged) {
    // Sub-case 3A: Contact was a group head and will become a member
    if (currentContactInfo.group_head) {
      // Error case: Instruct the frontend to handle group head changes differently
      return 0;
    }

    // Sub-case 3B: Contact was a member and will become the group head
    // Update the database: set the contact as the new group head
    const updatedContact = await dal.update(
      {
        contactId: currentContactInfo.contact_id,
        groupHeads: {
          oldGroupNewHead: currentContactInfo.contact_id,
        },
        currentGroupId: currentContactInfo.group_codes_group_id,
      },
      rest,
    );
    return updatedContact;
  }

  // Handle anniversary_date and dob consistency check
  if (rest.anniversary_date && !('dob' in rest)) {
    const { dob } = await dal.get(contact_id);
    if (new Date(rest.anniversary_date) <= new Date(dob)) {
      return 0;
    }
    const updatedContact = await dal.update(
      {
        contactId: currentContactInfo.contact_id,
      },
      rest,
    );
    return updatedContact;
  }

  // Case 4: No group or role changes, update the remaining contact properties
  // Update the database: update the contact properties
  const updatedContact = await dal.update(
    {
      contactId: currentContactInfo.contact_id,
    },
    rest,
  );
  return updatedContact;
};

const deleteContactService = async (contactId) => {
  const contactToDelete = await dal.get(contactId);

  if (!contactToDelete || !contactToDelete.is_active) {
    logger.warn(`Contact ${contactId} not found or already inactive for tenant ${TENANT_CONTEXT.tenantInfo}.`);
    return null;
  }

  if (contactToDelete.group_head) {
    /*
      TODO: Streamline the delete DAL so that it can take multiple parameters depending on
      the situation, instead of creating 3 different DALs for different delete cases
      1. First find if other group members exist
        - If they exist, find the next oldest member
          - to find the oldest, find contacts with the same group id property, order by
          timestamp (oldest first)
        - Make the next oldest member group head
      2. If other group members don't exist, deactivate group
        - To deactivate the group, set is_active for group code as false
      3. return
     */
    const otherGroupContacts = await dal.getOtherGroupContacts(
      contactToDelete.contact_id,
      contactToDelete.group_codes_group_id,
    );

    // If other group contacts exist, make the eldest one the group head,
    // remove the current one as group head and deactivate the current contact
    if (otherGroupContacts.length) {
      const newGroupHead = otherGroupContacts[0];
      const deletedContact = await dal.deleteAndChangeGroupHead(
        contactToDelete.contact_id,
        newGroupHead.contact_id,
      );
      return deletedContact;
    }
    // If other group contacts don't exist, deactivate the current contact and group
    const deletedContact = await dal.deleteContactAndGroup(contactId);
    return deletedContact;
  }
  // If the contact to be deleted is not a group head, just deactivate it
  const deletedContact = await dal.deleteContact(contactId);
  return deletedContact;
};

const deleteContactsService = async (contactIds) => {
  const results = {
    success: [],
    failed: [],
  };

  for (const contactId of contactIds) {
    try {
      // Await the deletion of each contact to ensure sequential because
      // each contact deletion might depend on the result of the previous one
      // eslint-disable-next-line no-await-in-loop
      const result = await deleteContactService(contactId);
      if (result !== null) {
        results.success.push(contactId);
      } else {
        // Already logged as warn in deleteContactService if not found
        results.failed.push({ id: contactId, reason: 'Not found, already inactive, or deletion failed at DAL.' });
      }
    } catch (error) {
      logger.error(`Failed to delete contact ${contactId} during batch operation for tenant ${TENANT_CONTEXT.tenantInfo}: ${error.message}`, { stack: error.stack });
      results.failed.push({ id: contactId, reason: error.message || 'Unknown error' });
    }
  }

  logger.info(`Batch delete summary for tenant ${TENANT_CONTEXT.tenantInfo}: ${results.success.length} succeeded, ${results.failed.length} failed.`);

  // Instead of throwing, return results to controller for more nuanced response
  // if (results.failed.length > 0) {
  //   throw new Error(`Batch deletion completed with ${results.failed.length} failures.`);
  // }
  return results;
};

const getContactStatsService = async () => {
  const stats = await dal.getContactStats();
  return {
    activeContacts: parseInt(stats.active_contacts, 10),
    customerContacts: parseInt(stats.customer_contacts, 10),
  };
};

const contactPaginationService = async (query) => {
  const limit = 7;
  const page = parseInt(query.page, 10) || 1;
  const offset = (page - 1) * limit;

  // --- Sorting ---
  // NOTE: Assumes sort columns are from the 'contact' table (aliased as 'c').
  // If sorting by columns from joined tables is needed, add logic here to map
  // the sort key to the correct alias (e.g., 'group_head_name' -> 'gh.first_name', etc.).
  const sortByClauses = [];
  const defaultSortColumn = 'c.first_name'; // Default sort column with alias

  // The column name is interpolated into the SQL (it cannot be a bind parameter),
  // so it MUST be validated against this allowlist to prevent SQL injection via ORDER BY.
  const SORTABLE_COLUMNS = new Set([
    'first_name', 'middle_name', 'last_name', 'dob', 'anniversary_date',
    'gross_annual_income', 'contact_status', 'marital_status', 'risk_profile',
    'industry', 'contact_source',
  ]);

  // A single ?sort=col:dir arrives as a string; multiple arrive as an array.
  let sortParams = [];
  if (query.sort) {
    sortParams = Array.isArray(query.sort) ? query.sort : [query.sort];
  }

  sortParams.forEach((sortParam) => {
    const [column, order] = String(sortParam).split(':');
    if (!SORTABLE_COLUMNS.has(column)) {
      return; // ignore unknown/unsafe sort columns
    }
    const direction = String(order).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    sortByClauses.push(`c.${column} ${direction}`);
  });

  if (sortByClauses.length === 0) {
    // Default sort by 'c.first_name ASC' if no valid sort is provided
    sortByClauses.push(`${defaultSortColumn} ASC`);
  }
  const sortBySql = sortByClauses.join(', ');

  // --- Filtering ---
  // NOTE: Assumes filter keys correspond to columns in the 'contact' table (aliased as 'c').
  // If filtering by columns from joined tables is needed, add logic here to map
  // the filter key to the correct alias (e.g., 'personal_city_name' -> 'city_personal.city_name').
  const filterClauses = [];
  const filterValues = [];

  Object.keys(query).forEach((key) => {
    // Skip pagination/sorting parameters
    if (key === 'page' || key === 'sort') {
      return;
    }

    const filterType = CONTACT_FILTERS[key];
    // Prepend the alias 'c.' to the filter key (column name)
    const aliasedKey = `c.${key}`;

    if (filterType === 'exact') {
      filterClauses.push(`${aliasedKey} = $${filterValues.length + 1}`);
      filterValues.push(query[key]);
    } else if (filterType === 'range_date') {
      const { min, max } = query[key];
      if (min !== undefined && min !== null) {
        filterClauses.push(`${aliasedKey} >= $${filterValues.length + 1}::date`);
        filterValues.push(min);
      }
      if (max !== undefined && max !== null) {
        filterClauses.push(`${aliasedKey} <= $${filterValues.length + 1}::date`);
        filterValues.push(max);
      }
    } else if (filterType === 'range_integer') {
      const { min, max } = query[key];
      if (min !== undefined && min !== null) {
        filterClauses.push(`${aliasedKey} >= $${filterValues.length + 1}`);
        filterValues.push(min);
      }
      if (max !== undefined && max !== null) {
        filterClauses.push(`${aliasedKey} <= $${filterValues.length + 1}`);
        filterValues.push(max);
      }
    }
    // Add other filter types here if needed, ensuring 'c.' alias is prepended
  });

  const filterSql = filterClauses.length > 0 ? `WHERE ${filterClauses.join(' AND ')}` : '';

  // Pass the filterSql with aliases to countAllContacts
  const totalContacts = parseInt(await dal.countAllContacts(filterSql, filterValues), 10);

  if (totalContacts > 0) {
    const totalPages = Math.ceil(totalContacts / limit);
    if (page < 1 || page > totalPages) {
      return { error: `Invalid page number. Please request a page between 1 and ${totalPages || 1}.` };
    }

    // Pass the sortBySql and filterSql with aliases to getAllContacts
    const contacts = await dal.getAllContacts(
      sortBySql,
      limit,
      offset,
      filterSql,
      filterValues,
      filterValues.length,
    );
    return {
      pagination: {
        page,
        pageSize: limit,
        totalItems: totalContacts,
        totalPages,
      },
      data: contacts,
    };
  }
  // Return empty data structure if no contacts match
  return {
    pagination: {
      page, // requested page (defaults to 1)
      pageSize: limit,
      totalItems: 0,
      totalPages: 0,
    },
    data: [], // Return empty array for data
  };
};

module.exports = {
  contactCreationService,
  getContactService,
  getOptionsService,
  updateContactService,
  deleteContactService,
  deleteContactsService,
  getContactStatsService,
  contactPaginationService,
};
