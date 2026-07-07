/* eslint-disable camelcase */
const db = require('../../common/db/index');
const logger = require('../../common/util/logger');

const get = async (id) => {
  const text = `
    SELECT
      c.contact_id,
      c.org_id,
      c.group_head,
      c.group_head_relation,
      c.group_codes_group_id,
      c.first_name,
      c.middle_name,
      c.last_name,
      c.dob,
      c.marital_status,
      c.anniversary_date,
      c.gross_annual_income,
      c.email,
      c.correspondence_email,
      c.political_exposure,
      c.non_res_tax_id,
      c.loan_details,
      c.risk_profile,
      c.contact_status,
      c.org_name,
      c.industry,
      c.contact_source,
      c.is_active,
      CONCAT(ref.first_name, ' ', COALESCE(ref.middle_name || ' ', ''), ref.last_name) AS referred_by_name,
      ct.contact_type AS contact_type_name,
      CONCAT(gh.first_name, ' ', COALESCE(gh.middle_name || ' ', ''), gh.last_name) AS group_head_name,
      bpc.city_name AS birth_place_city_name,
      rs.residence_status AS residence_status_name,
      prof.profession_name AS profession_name,
      CONCAT(ou.first_name, ' ', COALESCE(ou.middle_name || ' ', ''), ou.last_name) AS contact_owner_name,
      cc_personal.address AS personal_address,
      city_personal.city_name AS personal_city_name,
      cc_personal.pincode AS personal_pincode,
      cc_personal.phone_number AS personal_phone,
      cc_personal.mobile_number AS personal_mobile,
      cc_work.address AS work_address,
      city_work.city_name AS work_city_name,
      cc_work.pincode AS work_pincode,
      cc_work.phone_number AS work_phone,
      cc_work.mobile_number AS work_mobile
    FROM
      contact c
    LEFT JOIN
      org_user ou ON c.contact_owner = ou.user_id
    LEFT JOIN
      city bpc ON c.birth_place_city_id = bpc.city_id
    LEFT JOIN
      residence_status rs ON c.residence_status_residence_status_id = rs.residence_status_id
    LEFT JOIN
      profession prof ON c.profession_profession_id = prof.profession_id
    LEFT JOIN
      contact_type ct ON c.contact_type = ct.contact_type_id
    LEFT JOIN
      contact ref ON c.referred_by = ref.contact_id
    LEFT JOIN
      contact gh ON c.group_codes_group_id = gh.group_codes_group_id AND gh.group_head = TRUE
    LEFT JOIN
      contact_correspondence cc_personal ON c.contact_id = cc_personal.contact_id AND cc_personal.address_type = 'personal'
    LEFT JOIN
      city city_personal ON cc_personal.city_city_id = city_personal.city_id
    LEFT JOIN
      contact_correspondence cc_work ON c.contact_id = cc_work.contact_id AND cc_work.address_type = 'work'
    LEFT JOIN
      city city_work ON cc_work.city_city_id = city_work.city_id
    WHERE c.contact_id = $1`;

  // Get family members in the same group
  const familyText = `
  SELECT
    c.contact_id,
    CONCAT(c.first_name, ' ', COALESCE(c.middle_name || ' ', ''), c.last_name) AS full_name,
    c.group_head_relation,
    c.group_head
  FROM
    contact c
  WHERE
    c.group_codes_group_id = (SELECT group_codes_group_id FROM contact WHERE contact_id = $1)
    AND c.contact_id != $1
    AND c.is_active = true
  ORDER BY c.dob ASC`;

  const { rows } = await db.query(text, [id]);
  const { rows: familyRows } = await db.query(familyText, [id]);

  if (rows.length === 0) {
    return null;
  }

  return {
    ...rows[0],
    family_members: familyRows,
  };
};

const getAllContacts = async (
  sortBySql,
  limit,
  offset,
  filterSql,
  filterValues,
  filterValuesLength,
) => {
  let finalFilterSql = filterSql;
  const isActiveCondition = 'c.is_active = TRUE';

  if (finalFilterSql === '') {
    finalFilterSql = `WHERE ${isActiveCondition}`;
  } else {
    // Append the is_active condition to existing filters
    finalFilterSql = `${finalFilterSql} AND ${isActiveCondition}`;
  }

  // NOTE: The filterSql and sortBySql strings generated in the service layer
  // must now use the alias 'c' for columns belonging to the contact table
  // and appropriate aliases for joined tables (e.g., WHERE c.first_name = $1,
  // ORDER BY c.created_at DESC).
  // Aliases used: c (contact), ou (org_user), bpc (birth_place_city), rs (residence_status),
  // prof (profession), ct (contact_type), ref (referred_by contact), gh (group_head contact),
  // cc_personal (personal correspondence), city_personal (personal city),
  // cc_work (work correspondence), city_work (work city)
  const text = `
    SELECT
      c.contact_id,
      c.org_id,
      CONCAT(ref.first_name, ' ', COALESCE(ref.middle_name || ' ', ''), ref.last_name) AS referred_by_name,
      ct.contact_type AS contact_type_name,
      -- c.group_codes_group_id, -- Replaced with group_head_name
      CONCAT(gh.first_name, ' ', COALESCE(gh.middle_name || ' ', ''), gh.last_name) AS group_head_name, -- Select group head's name
      c.group_head, -- Still useful to know if THIS contact is the head
      c.group_head_relation,
      c.first_name,
      c.middle_name,
      c.last_name,
      c.dob,
      c.marital_status,
      c.anniversary_date,
      c.gross_annual_income,
      c.email,
      c.correspondence_email,
      c.political_exposure,
      bpc.city_name AS birth_place_city_name,
      rs.residence_status AS residence_status_name,
      c.non_res_tax_id,
      prof.profession_name AS profession_name,
      c.loan_details,
      c.risk_profile,
      CONCAT(ou.first_name, ' ', COALESCE(ou.middle_name || ' ', ''), ou.last_name) AS contact_owner_name,
      c.contact_status,
      c.org_name,
      c.industry,
      c.contact_source,
      c.is_active,
      cc_personal.address AS personal_address,
      city_personal.city_name AS personal_city_name,
      cc_personal.pincode AS personal_pincode,
      cc_personal.phone_number AS personal_phone,
      cc_personal.mobile_number AS personal_mobile,
      cc_work.address AS work_address,
      city_work.city_name AS work_city_name,
      cc_work.pincode AS work_pincode,
      cc_work.phone_number AS work_phone,
      cc_work.mobile_number AS work_mobile
    FROM
      contact c
    LEFT JOIN
      org_user ou ON c.contact_owner = ou.user_id
    LEFT JOIN
      city bpc ON c.birth_place_city_id = bpc.city_id
    LEFT JOIN
      residence_status rs ON c.residence_status_residence_status_id = rs.residence_status_id
    LEFT JOIN
      profession prof ON c.profession_profession_id = prof.profession_id
    LEFT JOIN
      contact_type ct ON c.contact_type = ct.contact_type_id
    LEFT JOIN
      contact ref ON c.referred_by = ref.contact_id
    LEFT JOIN -- Join to find the group head for the contact's group
      contact gh ON c.group_codes_group_id = gh.group_codes_group_id AND gh.group_head = TRUE
    LEFT JOIN
      contact_correspondence cc_personal ON c.contact_id = cc_personal.contact_id AND cc_personal.address_type = 'personal'
    LEFT JOIN
      city city_personal ON cc_personal.city_city_id = city_personal.city_id
    LEFT JOIN
      contact_correspondence cc_work ON c.contact_id = cc_work.contact_id AND cc_work.address_type = 'work'
    LEFT JOIN
      city city_work ON cc_work.city_city_id = city_work.city_id
    ${finalFilterSql} -- Use the modified filter SQL
    ORDER BY
      ${sortBySql} 
    LIMIT $${filterValuesLength + 1} OFFSET $${filterValuesLength + 2}
  `;
  const { rows } = await db.query(text, [...filterValues, limit, offset]);
  return rows;
};

const getOtherGroupContacts = async (contactId, groupId) => {
  const text = 'SELECT * FROM contact WHERE (group_codes_group_id = $1) AND (is_active = $2) AND (contact_id != $3) ORDER BY dob ASC';
  const { rows } = await db.query(text, [groupId, true, contactId]);
  return rows;
};

const getContactOptions = async (fieldName, query) => {
  if (fieldName === 'cities') {
    const tsQuery = query
      .split(/\s+/)
      .map((token) => `${token}:*`)
      .join(' & ');

    const text = `
    SELECT
      city_id,  
      CONCAT(city_name, ', ', country_name) as city_name
    FROM city
    WHERE (
      to_tsvector('english', city_name) @@ to_tsquery($1)
      OR city_name % $2
    )
    ORDER BY GREATEST(
      ts_rank(
        to_tsvector('english', city_name), 
        to_tsquery($1)
      ),
      similarity(city_name, $2)
    ) DESC
    LIMIT 20
  `;
    const { rows } = await db.query(text, [tsQuery, query]);
    return rows;
  }
  if (fieldName === 'contactNames') {
    const text = `
    SELECT
      contact_id as id,
      first_name,
      middle_name,
      last_name
    FROM contact
    WHERE (
        to_tsvector('english', first_name || ' ' || COALESCE(middle_name || ' ', '') || last_name) @@ plainto_tsquery($1)
        OR first_name % $1
        OR middle_name % $1
        OR last_name % $1
    )
    ORDER BY GREATEST(
      ts_rank(
        to_tsvector('english', first_name || ' ' || COALESCE(middle_name || ' ', '') || last_name), 
        plainto_tsquery($1)
      ),
      similarity(first_name, $1),
      similarity(middle_name, $1),
      similarity(last_name, $1)
    ) DESC
    LIMIT 20;
    `;
    const { rows } = await db.query(text, [query]);
    return rows;
  }

  if (fieldName === 'groupHeads') {
    const text = `
    SELECT
      group_codes_group_id as id,
      first_name,
      middle_name,
      last_name
    FROM contact
    WHERE (
        (group_head = TRUE) 
        AND (to_tsvector('english', first_name || ' ' || COALESCE(middle_name || ' ', '') || last_name) @@ plainto_tsquery($1)
        OR first_name % $1
        OR middle_name % $1
        OR last_name % $1)
    )
    ORDER BY GREATEST(
      ts_rank(
        to_tsvector('english', first_name || ' ' || COALESCE(middle_name || ' ', '') || last_name), 
        plainto_tsquery($1)
      ),
      similarity(first_name, $1),
      similarity(middle_name, $1),
      similarity(last_name, $1)
    ) DESC
    LIMIT 20;
    `;
    const { rows } = await db.query(text, [query]);
    return rows;
  }

  if (fieldName === 'contactOwners') {
    if (query) {
      const text = `
      SELECT
        user_id as id,
        first_name,
        middle_name,
        last_name
      FROM org_user
      WHERE (
          to_tsvector('english', first_name || ' ' || COALESCE(middle_name || ' ', '') || last_name) @@ plainto_tsquery($1)
          OR first_name % $1
          OR middle_name % $1
          OR last_name % $1
      )
      ORDER BY GREATEST(
        ts_rank(
          to_tsvector('english', first_name || ' ' || COALESCE(middle_name || ' ', '') || last_name), 
          plainto_tsquery($1)
        ),
        similarity(first_name, $1),
        similarity(middle_name, $1),
        similarity(last_name, $1)
      ) DESC
      LIMIT 20;
      `;
      const { rows } = await db.query(text, [query]);
      return rows;
    }
    // If no query, return all contact owners
    const text = 'SELECT user_id as id, first_name, middle_name, last_name FROM org_user ORDER BY first_name ASC';
    const { rows } = await db.query(text);
    return rows;
  }

  if (fieldName === 'contactTypes') {
    if (query) {
      const text = `
        SELECT
          contact_type_id as id,
          contact_type
        FROM contact_type
        WHERE (
          to_tsvector('english', contact_type) @@ plainto_tsquery($1)
          OR contact_type % $1
        )
        ORDER BY GREATEST(
          ts_rank(
            to_tsvector('english', contact_type),
            plainto_tsquery($1)
          ),
          similarity(contact_type, $1)
        ) DESC
        LIMIT 20;
      `;
      const { rows } = await db.query(text, [query]);
      return rows;
    }
    // If no query, return all contact types
    const text = 'SELECT contact_type_id as id, contact_type FROM contact_type ORDER BY contact_type ASC';
    const { rows } = await db.query(text);
    return rows;
  }

  const text = `
  SELECT
    ARRAY_AGG(DISTINCT jsonb_build_object('id', c.contact_id, 'first_name', c.first_name, 'middle_name', c.middle_name, 'last_name', c.last_name)) AS referred_by,
    (SELECT ARRAY_AGG(DISTINCT jsonb_build_object('id', ct.contact_type_id, 'contact_type', ct.contact_type))
       FROM contact_type ct) AS contact_type,
    (SELECT ARRAY_AGG(DISTINCT jsonb_build_object('id', city.city_id, 'name', city.city_name))
      FROM city WHERE city.country_name = 'India') AS city_name,
    (SELECT ARRAY_AGG(DISTINCT city.country_name) FROM city) AS country_name,
    (SELECT ARRAY_AGG(DISTINCT jsonb_build_object('id', rs.residence_status_id, 'status', rs.residence_status))
      FROM residence_status rs) AS residence_status,
    (SELECT ARRAY_AGG(DISTINCT jsonb_build_object('id', prof.profession_id, 'name', prof.profession_name))
      FROM profession prof) AS profession,
    (SELECT ARRAY_AGG(DISTINCT jsonb_build_object('id', u.user_id, 'first_name', u.first_name, 'middle_name', u.middle_name, 'last_name', u.last_name))
       FROM org_user u) AS contact_owner
  FROM contact c
`;
  const { rows } = await db.query(text);
  return rows[0];
};

const create = async (contactData) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    // Insert into contact table including non_res_tax_id and an optional anniversary_date
    const text = `
      INSERT INTO contact (
        org_id,
        referred_by,
        contact_type,
        group_codes_group_id,
        group_head,
        group_head_relation,
        first_name,
        middle_name,
        last_name,
        dob,
        marital_status,
        anniversary_date,
        gross_annual_income,
        email,
        correspondence_email,
        political_exposure,
        birth_place_city_id,
        residence_status_residence_status_id,
        non_res_tax_id,
        profession_profession_id,
        loan_details,
        risk_profile,
        contact_owner,
        contact_status,
        org_name,
        industry,
        contact_source
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
      )
      RETURNING *`;
    const values = [
      contactData.org_id,
      contactData.referredBy || null,
      contactData.contactType,
      contactData.groupHead ? null : contactData.groupHeadName,
      contactData.groupHead,
      contactData.groupHeadRelation,
      contactData.firstName,
      contactData.middleName,
      contactData.lastName,
      contactData.dob,
      contactData.maritalStatus,
      contactData.anniversaryDate || null,
      contactData.grossAnnualIncome,
      contactData.personalEmail,
      contactData.correspondenceEmail,
      contactData.politicalExposure,
      contactData.birthPlaceCity,
      contactData.residenceStatus,
      contactData.nonResTaxId || null,
      contactData.profession,
      contactData.loanDetails || null,
      contactData.riskProfile,
      contactData.contactOwner,
      contactData.contactStatus,
      contactData.orgName,
      contactData.industry,
      contactData.contactSource,
    ];
    const { rows } = await client.query(text, values);
    const contact = rows[0];

    // Insert personal correspondence if details are provided
    if (contactData.personalAddress && contactData.personalCity && contactData.personalPincode) {
      const personalText = `
        INSERT INTO contact_correspondence (
          org_id, contact_id, address_type, address, city_city_id, pincode, phone_number, mobile_number
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;
      const personalValues = [
        contactData.org_id,
        contact.contact_id,
        'personal',
        contactData.personalAddress,
        contactData.personalCity,
        contactData.personalPincode,
        contactData.personalPhone || null,
        contactData.personalMobile || null,
      ];
      await client.query(personalText, personalValues);
    }
    // Insert work correspondence if details are provided
    if (contactData.workAddress && contactData.workCity && contactData.workPincode) {
      const workText = `
        INSERT INTO contact_correspondence (
          org_id, contact_id, address_type, address, city_city_id, pincode, phone_number, mobile_number
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;
      const workValues = [
        contactData.org_id,
        contact.contact_id,
        'work',
        contactData.workAddress,
        contactData.workCity,
        contactData.workPincode,
        contactData.workPhone || null,
        contactData.workMobile || null,
      ];
      await client.query(workText, workValues);
    }
    await client.query('COMMIT');
    return contact;
  } catch (e) {
    await client.query('ROLLBACK');
    logger.error(e.stack);
    throw e;
  } finally {
    client.release();
  }
};

const createGroupAndContact = async (contactData) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    // Create a new group
    const createGroupQueryText = `
      INSERT INTO group_codes (org_id, is_active)
      VALUES ($1, $2)
      RETURNING *`;
    const groupResult = await client.query(createGroupQueryText, [contactData.org_id, true]);
    const newGroup = groupResult.rows[0];

    // Insert contact using the new group id, including non_res_tax_id and optional anniversary_date
    const text = `
      INSERT INTO contact (
        org_id,
        referred_by,
        contact_type,
        group_codes_group_id,
        group_head,
        group_head_relation,
        first_name,
        middle_name,
        last_name,
        dob,
        marital_status,
        anniversary_date,
        gross_annual_income,
        email,
        correspondence_email,
        political_exposure,
        birth_place_city_id,
        residence_status_residence_status_id,
        non_res_tax_id,
        profession_profession_id,
        loan_details,
        risk_profile,
        contact_owner,
        contact_status,
        org_name,
        industry,
        contact_source
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
      )
      RETURNING *`;
    const values = [
      contactData.org_id,
      contactData.referredBy || null,
      contactData.contactType,
      newGroup.group_id,
      contactData.groupHead,
      contactData.groupHeadRelation,
      contactData.firstName,
      contactData.middleName,
      contactData.lastName,
      contactData.dob,
      contactData.maritalStatus,
      contactData.anniversaryDate || null,
      contactData.grossAnnualIncome,
      contactData.personalEmail,
      contactData.correspondenceEmail,
      contactData.politicalExposure,
      contactData.birthPlaceCity,
      contactData.residenceStatus,
      contactData.nonResTaxId || null,
      contactData.profession,
      contactData.loanDetails || null,
      contactData.riskProfile,
      contactData.contactOwner,
      contactData.contactStatus,
      contactData.orgName,
      contactData.industry,
      contactData.contactSource,
    ];
    const { rows } = await client.query(text, values);
    const contact = rows[0];

    // Insert personal correspondence if details are provided
    if (contactData.personalAddress && contactData.personalCity && contactData.personalPincode) {
      const personalText = `
        INSERT INTO contact_correspondence (
          org_id, contact_id, address_type, address, city_city_id, pincode, phone_number, mobile_number
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;
      const personalValues = [
        contactData.org_id,
        contact.contact_id,
        'personal',
        contactData.personalAddress,
        contactData.personalCity,
        contactData.personalPincode,
        contactData.personalPhone || null,
        contactData.personalMobile || null,
      ];
      await client.query(personalText, personalValues);
    }
    // Insert work correspondence if details are provided
    if (contactData.workAddress && contactData.workCity && contactData.workPincode) {
      const workText = `
        INSERT INTO contact_correspondence (
          org_id, contact_id, address_type, address, city_city_id, pincode, phone_number, mobile_number
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;
      const workValues = [
        contactData.org_id,
        contact.contact_id,
        'work',
        contactData.workAddress,
        contactData.workCity,
        contactData.workPincode,
        contactData.workPhone || null,
        contactData.workMobile || null,
      ];
      await client.query(workText, workValues);
    }
    await client.query('COMMIT');
    return { ...newGroup, ...contact };
  } catch (e) {
    await client.query('ROLLBACK');
    logger.error(e.stack);
    throw e;
  } finally {
    client.release();
  }
};

const update = async (
  {
    contactId,
    groupHeads: { isCurrentHead, oldGroupNewHead, isNewGroupGroupHead } = {},
    currentGroupId,
    newGroupId,
    deactivateOldGroup,
  },
  rest,
) => {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const {
      // Destructure name-based fields that need ID lookups
      referred_by_name,
      birth_place_city_name,
      residence_status_name,
      profession_name,
      contact_owner_name,
      contact_type_name,
      // Destructure correspondence fields
      personalAddress,
      personal_city_name,
      personal_pincode,
      personal_phone,
      personalMobile,
      work_address,
      work_city_name,
      work_pincode,
      work_phone,
      work_mobile,
      correspondenceEmail,
      // Capture the rest of the direct contact fields
      ...contactFields
    } = rest;

    // Manually map the camelCase field to the correct snake_case database column
    if (correspondenceEmail) {
      contactFields.correspondence_email = correspondenceEmail;
    }

    // --- ID Lookups ---
    if (referred_by_name && referred_by_name.trim()) {
      const nameParts = referred_by_name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
      const referredByRes = await client.query(
        'SELECT contact_id FROM contact WHERE first_name ILIKE $1 AND last_name ILIKE $2 LIMIT 1',
        [firstName, lastName],
      );
      if (referredByRes.rows.length > 0) {
        contactFields.referred_by = referredByRes.rows[0].contact_id;
      }
    }

    if (birth_place_city_name) {
      const cityRes = await client.query('SELECT city_id FROM city WHERE city_name = $1', [birth_place_city_name]);
      if (cityRes.rows.length > 0) {
        contactFields.birth_place_city_id = cityRes.rows[0].city_id;
      }
    }

    if (residence_status_name) {
      const statusRes = await client.query('SELECT residence_status_id FROM residence_status WHERE residence_status = $1', [residence_status_name]);
      if (statusRes.rows.length > 0) {
        contactFields.residence_status_residence_status_id = statusRes.rows[0].residence_status_id;
      }
    }

    if (profession_name) {
      const profRes = await client.query('SELECT profession_id FROM profession WHERE profession_name = $1', [profession_name]);
      if (profRes.rows.length > 0) {
        contactFields.profession_profession_id = profRes.rows[0].profession_id;
      }
    }

    if (contact_owner_name) {
      const nameParts = contact_owner_name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
      const ownerRes = await client.query(
        'SELECT user_id FROM org_user WHERE first_name ILIKE $1 AND last_name ILIKE $2 LIMIT 1',
        [firstName, lastName],
      );
      if (ownerRes.rows.length > 0) {
        contactFields.contact_owner = ownerRes.rows[0].user_id;
      }
    }

    if (contact_type_name) {
      const typeRes = await client.query('SELECT contact_type_id FROM contact_type WHERE contact_type = $1', [contact_type_name]);
      if (typeRes.rows.length > 0) {
        contactFields.contact_type = typeRes.rows[0].contact_type_id;
      }
    }

    // This function allows us to dynamically generate text and values for the SQL queries
    const generateSqlParams = (obj, startIndex = 1) => {
      const keys = Object.keys(obj);
      if (keys.length === 0) {
        return { sqlString: '', valuesArray: [] };
      }
      const sqlString = keys.map((key, index) => `${key} = $${index + startIndex}`).join(', ');
      const valuesArray = keys.map((key) => obj[key]);
      return { sqlString, valuesArray };
    };

    // Case 1: The contact's group is changing.
    if (newGroupId) {
      if (isCurrentHead && oldGroupNewHead) {
        // Set the oldest member in the old group as the group head of the old group
        await client.query('UPDATE contact SET group_head = $1 WHERE contact_id = $2', [true, oldGroupNewHead]);
      }
      if (isCurrentHead && deactivateOldGroup) {
        const deleteGroupQueryText = 'UPDATE group_codes SET is_active = $1 WHERE group_id = (SELECT group_codes_group_id FROM contact WHERE contact_id = $2)';
        await client.query(deleteGroupQueryText, [false, contactId]);
      }
      if (isNewGroupGroupHead) {
        // Set the current group head of the new group as a member
        await client.query('UPDATE contact SET group_head = $1 WHERE contact_id = (SELECT contact_id FROM contact WHERE group_codes_group_id = $2 AND group_head = $3)', [false, newGroupId, true]);
      }

      const { sqlString, valuesArray } = generateSqlParams(contactFields, 4);
      // Set the contact as group head/member of the new group and update rest of the columns
      const updateQuery = `UPDATE contact SET group_head = $1, group_codes_group_id = $2 ${sqlString ? `, ${sqlString}` : ''} WHERE contact_id = $3 RETURNING *`;
      await client.query(updateQuery, [
        Boolean(isNewGroupGroupHead),
        newGroupId,
        contactId,
        ...valuesArray,
      ]);
    // Case 2: The group is not changing, but the contact is becoming the new group head.
    } else if (!newGroupId && oldGroupNewHead) {
      await client.query(
        'UPDATE contact SET group_head = $1 WHERE contact_id = (SELECT contact_id FROM contact WHERE (group_codes_group_id = $2 AND group_head = $3))',
        [false, currentGroupId, true],
      );
      const { sqlString, valuesArray } = generateSqlParams(contactFields, 3);
      const updateQuery = `UPDATE contact SET group_head = $1 ${sqlString ? `, ${sqlString}` : ''} WHERE contact_id = $2 RETURNING *`;
      await client.query(updateQuery, [true, contactId, ...valuesArray]);
    // Case 3: No group or role changes; just update the other contact fields.
    } else if (Object.keys(contactFields).length > 0) {
      const { sqlString, valuesArray } = generateSqlParams(contactFields, 2);
      await client.query(`UPDATE contact SET ${sqlString} WHERE contact_id = $1 RETURNING *`, [contactId, ...valuesArray]);
    }

    // --- Correspondence Updates (UPSERT logic) ---
    const correspondenceUpsert = async (type, address, cityName, pincode, phone, mobile) => {
      if (
        address === undefined
        && cityName === undefined
        && pincode === undefined
        && phone === undefined
        && mobile === undefined
      ) {
        return;
      }

      let cityId = null;
      if (cityName) {
        const cityRes = await client.query('SELECT city_id FROM city WHERE city_name = $1', [cityName]);
        if (cityRes.rows.length > 0) {
          cityId = cityRes.rows[0].city_id;
        }
      }

      const existing = await client.query(
        'SELECT correspondence_id FROM contact_correspondence WHERE contact_id = $1 AND address_type = $2',
        [contactId, type],
      );

      if (existing.rows.length > 0) {
        // UPDATE: Build a dynamic query to only update provided fields
        const updates = [];
        const values = [];
        if (address !== undefined) { updates.push(`address = $${values.push(address)}`); }
        if (cityName !== undefined) { updates.push(`city_city_id = $${values.push(cityId)}`); } // Update city_id even if it's null
        if (pincode !== undefined) { updates.push(`pincode = $${values.push(pincode)}`); }
        if (phone !== undefined) { updates.push(`phone_number = $${values.push(phone)}`); }
        if (mobile !== undefined) { updates.push(`mobile_number = $${values.push(mobile)}`); }

        if (updates.length > 0) {
          values.push(contactId, type);
          const query = `UPDATE contact_correspondence SET ${updates.join(', ')} WHERE contact_id = $${values.length - 1} AND address_type = $${values.length}`;
          await client.query(query, values);
        }
      } else {
        // INSERT: Create a new record with all provided values (even if some are null)
        const orgIdRes = await client.query('SELECT org_id FROM contact WHERE contact_id = $1', [contactId]);
        const orgId = orgIdRes.rows[0].org_id;
        const query = `INSERT INTO contact_correspondence 
          (org_id, contact_id, address_type, address, city_city_id, pincode, phone_number, mobile_number) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;
        await client.query(query, [
          orgId, contactId, type, address, cityId, pincode, phone, mobile,
        ]);
      }
    };

    await correspondenceUpsert('personal', personalAddress, personal_city_name, personal_pincode, personal_phone, personalMobile);
    await correspondenceUpsert('work', work_address, work_city_name, work_pincode, work_phone, work_mobile);

    await client.query('COMMIT');

    // Return the fully updated contact by re-fetching it
    const { rows } = await client.query('SELECT * FROM contact WHERE contact_id = $1', [contactId]);
    return rows[0];
  } catch (e) {
    logger.error(e.stack);
    await client.query('ROLLBACK');
    throw e; // Re-throw the error to be handled by the service layer
  } finally {
    client.release();
  }
};

const deleteContact = async (id) => {
  const text = 'UPDATE contact SET is_active = $1 WHERE contact_id = $2 RETURNING *';
  const { rows } = await db.query(text, [false, id]);
  return rows[0];
};

const deleteAndChangeGroupHead = async (oldGroupHeadId, newGroupHeadId) => {
  // A transaction where the new group head is made the group head and the old group head is
  // removed as group head and deactivated
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const oldGroupHeadQueryText = 'UPDATE contact SET group_head = $1, is_active = $2 WHERE contact_id = $3 RETURNING *';
    await client.query(oldGroupHeadQueryText, [false, false, oldGroupHeadId]);

    const newGroupHeadQueryText = 'UPDATE contact SET group_head = $1 WHERE contact_id = $2';
    const { rows } = await client.query(newGroupHeadQueryText, [true, newGroupHeadId]);
    await client.query('COMMIT');
    return rows[0];
  } catch (e) {
    logger.error(e.stack);
    await client.query('ROLLBACK');
    return undefined;
  } finally {
    client.release();
  }
};

const deleteContactAndGroup = async (contactId) => {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const deleteGroupQueryText = 'UPDATE group_codes SET is_active = $1 WHERE group_id = (SELECT group_codes_group_id FROM contact WHERE contact_id = $2)';
    const deleteContactQueryText = 'UPDATE contact SET is_active = $1 WHERE contact_id = $2 RETURNING *';

    await client.query(deleteGroupQueryText, [false, contactId]);
    const { rows } = await client.query(deleteContactQueryText, [false, contactId]);

    await client.query('COMMIT');

    return rows[0];
  } catch (e) {
    logger.error(e.stack);
    await client.query('ROLLBACK');
    return undefined;
  } finally {
    client.release();
  }
};

const countAllContacts = async (filterSql, filterValues) => {
  let finalFilterSql = filterSql;
  const isActiveCondition = 'c.is_active = TRUE';

  if (finalFilterSql === '') {
    finalFilterSql = `WHERE ${isActiveCondition}`;
  } else {
    // Append the is_active condition to existing filters
    finalFilterSql = `${finalFilterSql} AND ${isActiveCondition}`;
  }

  const text = `SELECT COUNT(c.*) FROM contact c ${finalFilterSql}`;
  const { rows } = await db.query(text, [...filterValues]);
  return parseInt(rows[0].count, 10);
};

const getContactStats = async () => {
  const text = `
    SELECT
      COUNT(*) FILTER (WHERE c.is_active = TRUE) AS active_contacts,
      COUNT(*) FILTER (
        WHERE c.is_active = TRUE 
        AND ct.contact_type = 'Customer'
      ) AS customer_contacts
    FROM contact c
    LEFT JOIN contact_type ct ON c.org_id = ct.org_id AND c.contact_type = ct.contact_type_id
  `;
  const { rows } = await db.query(text);
  return rows[0];
};

module.exports = {
  get,
  getAllContacts,
  getContactStats,
  getOtherGroupContacts,
  getContactOptions,
  create,
  createGroupAndContact,
  update,
  deleteContact,
  deleteAndChangeGroupHead,
  deleteContactAndGroup,
  countAllContacts,
};
