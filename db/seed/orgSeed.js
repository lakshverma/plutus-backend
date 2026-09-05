/*
 * Builds one complete tenant: staff, a product catalogue, contacts, and the seven
 * activity types the timeline and global search read.
 *
 * Insert order follows the foreign keys, and everything runs with the tenant context
 * set so the audit triggers record the seeded rows the same way they record a user's
 * edits. See lib/connect.js.
 */
const bcrypt = require('bcrypt');
const { createRng, makeHelpers } = require('./lib/rng');
const { setTenantContext, insertMany } = require('./lib/connect');
const {
  SURNAMES, MALE_FIRST_NAMES, FEMALE_FIRST_NAMES, MIDDLE_NAMES, CITIES, STREET_NAMES,
  BUILDING_NAMES, FUND_HOUSES, PRODUCTS, BROKERS, DEAL_STAGES, TRANSACTION_MODES, BANKS,
} = require('./data/india');
const {
  MARITAL_STATUS, RISK_PROFILE, CONTACT_STATUS, CONTACT_SOURCE, INDUSTRY, CALL_OUTCOME,
  RELATIONSHIP_GROUP_HEAD,
} = require('../../src/common/util/helper');

// Every enumerated value the seed writes is one the application already defines in
// helper.js: taken from it wholesale, or, where a realistic subset or weighting is
// wanted, checked against it when this module loads. A value the UI does not
// recognise cannot be seeded by accident, and the two cannot drift apart silently.
const valuesOf = (options) => options.map((option) => option.value);

const known = (label, subset, canonical) => {
  const allowed = new Set(valuesOf(canonical));
  const unknown = subset
    .map((entry) => (Array.isArray(entry) ? entry[0] : entry))
    .filter((value) => !allowed.has(value));
  if (unknown.length > 0) {
    throw new Error(`${label}: not defined in helper.js: ${unknown.join(', ')}`);
  }
  return subset;
};

// Repetition, and [value, weight] pairs, skew the draw towards the common cases.
const MARITAL_STATUSES = known(
  'marital status',
  ['Not married', 'Married', 'Married', 'Married', 'Divorced', 'Widowed'],
  MARITAL_STATUS,
);
const RISK_PROFILES = known('risk profile', [['Low', 3], ['Medium', 5], ['High', 2]], RISK_PROFILE);
const CONTACT_STATUSES = valuesOf(CONTACT_STATUS);
const CONTACT_SOURCES = known('contact source', [
  ['Referrals', 5], ['Organic Search', 2], ['Offline word of mouth', 4],
  ['Direct Traffic', 2], ['Paid Search', 1], ['Organic Social', 1], ['Email marketing', 1],
], CONTACT_SOURCE);
const INDUSTRIES = known('industry', [
  'Information Technology/IT', 'Banking/Mortgage', 'Hospital/Health Care', 'Education Management',
  'Real Estate/Mortgage', 'Financial Services', 'Pharmaceuticals', 'Construction',
  'Retail Industry', 'Telecommunications', 'Automotive', 'Legal Services',
], INDUSTRY);
const CALL_OUTCOMES = known('call outcome', [
  'Connected', 'Connected', 'No answer', 'Left voicemail', 'Follow-up required',
  'Meeting scheduled', 'Busy', 'Not interested', 'Bad timing',
], CALL_OUTCOME);
const GROUP_HEAD_RELATIONS = known(
  'group head relation',
  ['Self', 'Mother', 'Father', 'Daughter', 'Son', 'Sister', 'Brother'],
  RELATIONSHIP_GROUP_HEAD,
);

// Meeting outcomes are free text in the application, so these are the seed's own.
const MEETING_OUTCOMES = [
  'Portfolio review completed', 'Proposal discussed', 'Documents collected',
  'Risk profiling done', 'Follow-up scheduled', 'Onboarding completed',
];

const NOTE_TEMPLATES = [
  'Reviewed portfolio allocation. Client comfortable with current equity exposure.',
  'Discussed tax saving options under Section 80C before the March deadline.',
  'Client is planning to buy a house in the next two years; suggested moving part of the corpus to a short duration fund.',
  'Explained the new capital gains treatment on debt funds. Client had questions about grandfathering.',
  'Updated KYC documents received. Address proof pending.',
  'Client wants to start an SIP for their daughter\'s education. Target horizon 12 years.',
  'Requested a consolidated account statement for filing returns.',
  'Discussed increasing term insurance cover after the salary revision.',
  'Client concerned about market volatility. Reassured on the long term plan and rebalancing schedule.',
  'Nominee details updated across all folios.',
  'Retirement planning review. Current corpus on track for the 2041 target.',
  'Switched from regular to direct plan on two folios to reduce expense ratio.',
];

const EMAIL_TEMPLATES = [
  'Sent the quarterly portfolio statement and the rebalancing summary.',
  'Shared the SIP performance report for the last twelve months.',
  'Emailed the KYC update form along with the checklist of required documents.',
  'Sent the tax statement for the financial year.',
  'Shared a fund factsheet and the scheme information document as requested.',
  'Sent the renewal reminder for the health insurance policy.',
  'Forwarded the AMC notice on the change in fund manager.',
];

const TASK_TEMPLATES = [
  ['Follow up on pending KYC', 'Documentation', 'KYC'],
  ['Schedule annual portfolio review', 'Review', 'Portfolio'],
  ['Send SIP renewal reminder', 'Reminder', 'Transaction'],
  ['Collect nominee update form', 'Documentation', 'Compliance'],
  ['Prepare retirement projection', 'Planning', 'Advisory'],
  ['Reconcile folio statement mismatch', 'Operations', 'Transaction'],
];

const DEAL_TYPES = ['New Investment', 'Top-up', 'Switch', 'Insurance', 'Renewal'];
const PAYMENT_MODES = ['NEFT', 'UPI', 'Cheque', 'RTGS', 'Auto Debit'];
const INVESTMENT_DURATIONS = ['1 year', '3 years', '5 years', '10 years', 'Perpetual'];

const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');

/*
 * Seeds one org. `refs` carries the ids of the global lookup rows, which are shared
 * across tenants. Returns a summary for the run log.
 */
const seedOrg = async (client, spec, refs) => {
  const helpers = makeHelpers(createRng(spec.rngSeed));
  const {
    int, pick, sample, bool, dateBetween, isoDate, weighted,
  } = helpers;

  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 182 * 24 * 60 * 60 * 1000);

  // --- Org and staff ------------------------------------------------------
  const { rows: [org] } = await client.query(
    `INSERT INTO org_details (org_name, org_size, org_website, subscription_plans_plan_id, status)
     VALUES ($1, $2, $3, $4, 'active') RETURNING org_id`,
    [spec.orgName, spec.orgSize, spec.orgWebsite, refs.planId],
  );
  const orgId = org.org_id;

  const passwordHash = await bcrypt.hash(spec.demoPassword, 10);

  const staffRows = spec.staff.map((member, index) => [
    orgId,
    member.firstName,
    member.lastName,
    index === 0 ? spec.demoEmail : member.email,
    index === 0 ? spec.demoEmail : member.email,
    passwordHash,
    member.role,
    member.jobTitle,
    // Anything other than 'unverified' can log in. See src/common/auth/authController.js.
    'verified',
  ]);

  const staff = await insertMany(client, {
    table: 'org_user',
    columns: ['org_id', 'first_name', 'last_name', 'email', 'username', 'password_hash',
      'user_roles_user_roles_id', 'job_title', 'status'],
    rows: staffRows,
  }, { returning: 'user_id, first_name' });

  const staffIds = staff.map((row) => row.user_id);
  const ownerId = staffIds[0];

  // Audit triggers need a tenant context, and the owner is the plausible author of
  // seeded history.
  await setTenantContext(client, orgId, ownerId);

  // --- Contact types ------------------------------------------------------
  // 'Customer' must exist exactly: the dashboard KPI counts rows joined to it.
  // See src/tenant/contact/contactDAL.js getContactStats.
  const contactTypes = await insertMany(client, {
    table: 'contact_type',
    columns: ['org_id', 'contact_type'],
    rows: [['Customer'], ['Prospect'], ['Lead'], ['Former client']].map(([t]) => [orgId, t]),
  }, { returning: 'contact_type_id, contact_type' });
  const customerTypeId = contactTypes.find((t) => t.contact_type === 'Customer').contact_type_id;

  // --- Product catalogue --------------------------------------------------
  const products = await insertMany(client, {
    table: 'product',
    columns: ['org_id', 'product_name', 'is_active'],
    rows: PRODUCTS.map((name) => [orgId, name, true]),
  }, { returning: 'product_id, product_name' });

  const companies = await insertMany(client, {
    table: 'company',
    columns: ['org_id', 'company_name'],
    rows: FUND_HOUSES.map((house) => [orgId, house.company]),
  }, { returning: 'company_id, company_name' });

  // One company_product per fund house, tied to the equity mutual fund category:
  // enough to hang schemes off without inventing a full product matrix.
  const equityProductId = products.find((p) => p.product_name === 'Equity Mutual Fund').product_id;
  const companyProducts = await insertMany(client, {
    table: 'company_product',
    columns: ['org_id', 'company_id', 'product_product_id'],
    rows: companies.map((c) => [orgId, c.company_id, equityProductId]),
  }, { returning: 'company_product_id, company_id' });

  const schemeRows = [];
  FUND_HOUSES.forEach((house) => {
    const company = companies.find((c) => c.company_name === house.company);
    const companyProduct = companyProducts.find((cp) => cp.company_id === company.company_id);
    house.schemes.forEach((schemeName) => {
      schemeRows.push([
        orgId, company.company_id, schemeName, companyProduct.company_product_id,
        true, false, pick(refs.registrarIds),
      ]);
    });
  });
  const schemes = await insertMany(client, {
    table: 'scheme',
    columns: ['org_id', 'company_id', 'scheme_name', 'company_product_id', 'is_active',
      'is_close_ended', 'registrar_registrar_id'],
    rows: schemeRows,
  }, { returning: 'scheme_id, company_id, scheme_name' });

  const brokers = await insertMany(client, {
    table: 'broker',
    columns: ['org_id', 'broker_code', 'broker_name', 'broker_type', 'is_active'],
    rows: BROKERS.map((b) => [orgId, b.code, b.name, b.type, true]),
  }, { returning: 'broker_id' });

  const schemeBrokers = await insertMany(client, {
    table: 'scheme_broker',
    columns: ['org_id', 'company_id', 'scheme_id', 'broker_broker_id'],
    rows: schemes.map((s, i) => [
      orgId, s.company_id, s.scheme_id, brokers[i % brokers.length].broker_id,
    ]),
  }, { returning: 'scheme_broker_id, company_id, scheme_id, broker_broker_id' });

  const dealStages = await insertMany(client, {
    table: 'deal_stage',
    columns: ['org_id', 'deal_stage'],
    rows: DEAL_STAGES.map((stage) => [orgId, stage]),
  }, { returning: 'deal_stage_id, deal_stage' });

  const transactionModes = await insertMany(client, {
    table: 'transaction_mode',
    columns: ['org_id', 'transaction_mode'],
    rows: TRANSACTION_MODES.map((mode) => [orgId, mode]),
  }, { returning: 'transaction_mode_id' });

  // --- Households and contacts -------------------------------------------
  // Contacts are grouped into households, which is what the group head fields on the
  // contact form model. Sizes are drawn first and the groups created to match, rather
  // than guessing a count from an average: guessing leaves the tail of contacts with
  // no group of their own, and they end up crowded into the last one.
  const householdSizes = [];
  let assigned = 0;
  while (assigned < spec.contactCount) {
    // Most households are a single contact; some are couples or families.
    const size = Math.min(weighted([[1, 6], [2, 3], [3, 1]]), spec.contactCount - assigned);
    householdSizes.push(size);
    assigned += size;
  }

  const groups = await insertMany(client, {
    table: 'group_codes',
    columns: ['org_id', 'is_active'],
    rows: householdSizes.map(() => [orgId, true]),
  }, { returning: 'group_id' });

  const contactRows = [];
  const contactMeta = [];
  let groupCursor = -1;
  let membersLeftInHousehold = 0;
  let currentGroupId = null;
  let currentSurname = null;
  let startsNewHousehold = false;

  for (let i = 0; i < spec.contactCount; i += 1) {
    if (membersLeftInHousehold === 0) {
      groupCursor += 1;
      currentGroupId = groups[groupCursor].group_id;
      membersLeftInHousehold = householdSizes[groupCursor];
      currentSurname = pick(SURNAMES);
      startsNewHousehold = true;
    }
    // Exactly one member of each household is its head, and it is the first one
    // generated. The others take a relation to that head.
    const isGroupHead = startsNewHousehold;
    startsNewHousehold = false;
    membersLeftInHousehold -= 1;

    const isMale = bool(0.55);
    const firstName = isMale ? pick(MALE_FIRST_NAMES) : pick(FEMALE_FIRST_NAMES);
    const middleName = bool(0.35) ? pick(MIDDLE_NAMES) : null;
    const city = pick(CITIES);
    const dob = dateBetween(new Date(1955, 0, 1), new Date(2003, 11, 31));
    const maritalStatus = pick(MARITAL_STATUSES);
    const isCustomer = bool(0.62);
    const contactTypeId = isCustomer
      ? customerTypeId
      : pick(contactTypes.filter((t) => t.contact_type_id !== customerTypeId)).contact_type_id;

    const emailLocal = `${slugify(firstName)}.${slugify(currentSurname)}${i}`;
    const email = `${emailLocal}@example.com`;

    contactRows.push([
      orgId,
      contactTypeId,
      currentGroupId,
      isGroupHead,
      isGroupHead ? 'Self' : pick(GROUP_HEAD_RELATIONS.slice(1)),
      firstName,
      middleName,
      currentSurname,
      isoDate(dob),
      maritalStatus,
      maritalStatus === 'Married'
        ? isoDate(dateBetween(new Date(1985, 0, 1), new Date(2023, 11, 31)))
        : null,
      // Annual income in rupees, skewed towards the middle of an advisory book.
      weighted([[int(400000, 900000), 3], [int(900000, 2500000), 5],
        [int(2500000, 8000000), 2], [int(8000000, 30000000), 1]]),
      email,
      email,
      bool(0.04),
      pick(refs.cityIds),
      weighted([[refs.residenceStatusByName.Resident, 8],
        [refs.residenceStatusByName['Non resident Indian'], 2],
        [refs.residenceStatusByName['Overseas Citizen of India'], 1]]),
      pick(refs.professionIds),
      weighted(RISK_PROFILES),
      pick(staffIds),
      pick(CONTACT_STATUSES),
      bool(0.3) ? `${pick(SURNAMES)} & Associates` : null,
      pick(INDUSTRIES),
      weighted(CONTACT_SOURCES),
      bool(0.94),
    ]);

    contactMeta.push({
      groupId: currentGroupId, city, firstName, lastName: currentSurname,
    });
  }

  const contacts = await insertMany(client, {
    table: 'contact',
    columns: ['org_id', 'contact_type', 'group_codes_group_id', 'group_head',
      'group_head_relation', 'first_name', 'middle_name', 'last_name', 'dob',
      'marital_status', 'anniversary_date', 'gross_annual_income', 'email',
      'correspondence_email', 'political_exposure', 'birth_place_city_id',
      'residence_status_residence_status_id', 'profession_profession_id', 'risk_profile',
      'contact_owner', 'contact_status', 'org_name', 'industry', 'contact_source', 'is_active'],
    rows: contactRows,
  }, { returning: 'contact_id' });

  const contactIds = contacts.map((c) => c.contact_id);

  // --- Addresses ----------------------------------------------------------
  // address_type must be exactly 'personal' or 'work': the contact DAL filters on
  // those literals.
  const correspondenceRows = [];
  contactIds.forEach((contactId, i) => {
    const meta = contactMeta[i];
    const cityId = refs.cityIdByName[meta.city.name];
    correspondenceRows.push([
      orgId, contactId, 'personal',
      `${int(1, 400)}, ${pick(BUILDING_NAMES)}, ${pick(STREET_NAMES)}`,
      cityId, pick(meta.city.pincodes),
      `+9122${int(10000000, 99999999)}`,
      `+91${int(70000, 99999)}${int(10000, 99999)}`,
    ]);
    if (bool(0.35)) {
      correspondenceRows.push([
        orgId, contactId, 'work',
        `${pick(BUILDING_NAMES)} Business Park, ${pick(STREET_NAMES)}`,
        cityId, pick(meta.city.pincodes),
        `+9122${int(10000000, 99999999)}`,
        `+91${int(70000, 99999)}${int(10000, 99999)}`,
      ]);
    }
  });
  await insertMany(client, {
    table: 'contact_correspondence',
    columns: ['org_id', 'contact_id', 'address_type', 'address', 'city_city_id',
      'pincode', 'phone_number', 'mobile_number'],
    rows: correspondenceRows,
  });

  // --- Activities ---------------------------------------------------------
  // Dense on a subset so some contacts have a rich timeline worth opening, sparse
  // elsewhere so the list does not look uniformly synthetic. meeting, email, task,
  // deal and transaction have no write endpoint: the timeline and global search read
  // them, so without seeds those features look broken rather than empty.
  const hotCount = Math.min(spec.hotContactCount, contactIds.length);
  const hotContacts = sample(contactIds, hotCount);
  const isHot = new Set(hotContacts);

  const timestamp = () => dateBetween(sixMonthsAgo, now);
  const noteRows = [];
  const callRows = [];
  const meetingRows = [];
  const emailRows = [];
  const taskRows = [];
  const dealRows = [];

  contactIds.forEach((contactId) => {
    const hot = isHot.has(contactId);
    // Every contact gets at least one note and one call, so opening any record
    // exercises the timeline against data that is actually there. An empty timeline
    // is indistinguishable from a broken one.
    const counts = {
      note: hot ? int(4, 10) : int(1, 3),
      call: hot ? int(3, 8) : int(1, 3),
      meeting: hot ? int(2, 5) : weighted([[0, 3], [1, 4], [2, 2]]),
      email: hot ? int(2, 6) : weighted([[0, 3], [1, 4], [2, 2]]),
      task: hot ? int(1, 3) : weighted([[0, 6], [1, 4]]),
      deal: hot ? int(1, 3) : weighted([[0, 6], [1, 3], [2, 1]]),
    };

    for (let i = 0; i < counts.note; i += 1) {
      noteRows.push([orgId, contactId, pick(staffIds), timestamp(), pick(NOTE_TEMPLATES)]);
    }
    for (let i = 0; i < counts.call; i += 1) {
      const at = timestamp();
      callRows.push([
        orgId, contactId, pick(staffIds), at,
        `Call regarding ${pick(['SIP top-up', 'portfolio review', 'KYC documents', 'market update', 'redemption request'])}.`,
        isoDate(at), `${String(int(9, 18)).padStart(2, '0')}:${pick(['00', '15', '30', '45'])}:00`,
        pick(CALL_OUTCOMES),
      ]);
    }
    for (let i = 0; i < counts.meeting; i += 1) {
      const at = timestamp();
      meetingRows.push([
        orgId, contactId, pick(staffIds), at,
        `Met at ${pick(['the client office', 'our office', 'a video call', 'the client residence'])} to review holdings.`,
        pick(['30 minutes', '45 minutes', '1 hour', '90 minutes']),
        isoDate(at), `${String(int(10, 17)).padStart(2, '0')}:${pick(['00', '30'])}:00`,
        pick(MEETING_OUTCOMES),
      ]);
    }
    for (let i = 0; i < counts.email; i += 1) {
      emailRows.push([orgId, contactId, pick(staffIds), timestamp(), pick(EMAIL_TEMPLATES)]);
    }
    for (let i = 0; i < counts.task; i += 1) {
      const [name, type, queryType] = pick(TASK_TEMPLATES);
      const scheme = pick(schemes);
      taskRows.push([
        orgId, scheme.company_id, scheme.scheme_id, pick(staffIds), contactId,
        name, type, queryType, `${name} for this client before the end of the quarter.`,
        timestamp(),
      ]);
    }
    for (let i = 0; i < counts.deal; i += 1) {
      const at = timestamp();
      dealRows.push([
        orgId, contactId, pick(staffIds), at,
        pick(dealStages).deal_stage_id,
        weighted([[int(50000, 300000), 5], [int(300000, 1500000), 3], [int(1500000, 10000000), 1]]),
        isoDate(new Date(at.getTime() + int(7, 120) * 24 * 60 * 60 * 1000)),
        pick(DEAL_TYPES),
      ]);
    }
  });

  await insertMany(client, {
    table: 'note',
    columns: ['org_id', 'contact_id', 'note_creator_user_id', 'note_create_timestamp', 'note_description'],
    rows: noteRows,
  });
  await insertMany(client, {
    table: 'call',
    columns: ['org_id', 'contact_id', 'call_creator_user_id', 'call_create_timestamp',
      'call_description', 'call_activity_date', 'call_activity_time', 'call_outcome'],
    rows: callRows,
  });
  await insertMany(client, {
    table: 'meeting',
    columns: ['org_id', 'contact_id', 'meeting_creator_user_id', 'meeting_create_timestamp',
      'meeting_description', 'meeting_duration', 'meeting_activity_date', 'meeting_activity_time',
      'meeting_outcome'],
    rows: meetingRows,
  });
  await insertMany(client, {
    table: 'email',
    columns: ['org_id', 'contact_id', 'email_creator_user_id', 'email_create_timestamp', 'email_description'],
    rows: emailRows,
  });
  const tasks = await insertMany(client, {
    table: 'task',
    columns: ['org_id', 'company_id', 'scheme_id', 'task_owner_user_id', 'contact_id',
      'task_name', 'task_type', 'task_query_type', 'task_description', 'task_create_timestamp'],
    rows: taskRows,
  }, { returning: 'task_id' });

  await insertMany(client, {
    table: 'tasks_meta',
    columns: ['task_task_id', 'meta_key', 'meta_value'],
    rows: tasks.map((t) => [
      t.task_id, 'due_date', dateBetween(now, new Date(now.getTime() + 60 * 86400000)),
    ]),
  });

  const deals = await insertMany(client, {
    table: 'deal',
    columns: ['org_id', 'contact_id', 'deal_creator_user_id', 'deal_create_timestamp',
      'deal_stage_deal_stage_id', 'deal_amount', 'close_date', 'deal_type'],
    rows: dealRows,
  }, { returning: 'deal_id, contact_id, deal_amount' });

  // Each deal is allocated across one or two schemes, which is how a real proposal
  // is put together and what makes the deal panel worth looking at.
  const dealSchemeRows = [];
  deals.forEach((deal) => {
    const chosen = sample(schemes, bool(0.4) ? 2 : 1);
    const perScheme = Math.floor(Number(deal.deal_amount) / chosen.length);
    chosen.forEach((scheme) => {
      dealSchemeRows.push([
        orgId, deal.contact_id, scheme.company_id, deal.deal_id, scheme.scheme_id,
        perScheme,
        pick(['Lumpsum', 'Monthly SIP', 'Quarterly SIP']),
      ]);
    });
  });
  await insertMany(client, {
    table: 'deal_scheme',
    columns: ['org_id', 'contact_id', 'scheme_company_id', 'deal_deal_id', 'scheme_scheme_id',
      'deal_scheme_amount', 'deal_scheme_duration_mode'],
    rows: dealSchemeRows,
  });

  // Transactions only for customers with a closed deal, so the money that appears
  // in the ledger corresponds to business that was actually won.
  const transactionRows = [];
  deals.forEach((deal) => {
    if (!bool(0.55)) return;
    const sb = pick(schemeBrokers);
    const at = dateBetween(sixMonthsAgo, now);
    transactionRows.push([
      orgId, deal.contact_id, at, isoDate(at), pick(staffIds),
      pick(['Purchase', 'Purchase', 'Additional Purchase', 'Switch', 'Redemption']),
      Math.round(Number(deal.deal_amount) / int(1, 4)),
      pick(transactionModes).transaction_mode_id,
      pick(PAYMENT_MODES),
      int(100000000, 999999999),
      pick(BANKS),
      sb.scheme_broker_id, sb.company_id, sb.scheme_id, sb.broker_broker_id,
      pick(INVESTMENT_DURATIONS),
      `${int(10000000, 99999999)}/${int(10, 99)}`,
      pick(['Processed via RTA.', 'Cheque cleared.', 'Auto debit mandate active.', 'Units allotted.']),
    ]);
  });
  await insertMany(client, {
    table: 'transaction',
    columns: ['org_id', 'contact_id', 'transaction_create_timestamp', 'transaction_date',
      'transaction_creator_user_id', 'transaction_type', 'transaction_amount',
      'transaction_mode_id', 'payment_mode', 'cheque_utr_transaction_ref', 'bank_name',
      'scheme_broker_scheme_broker_id', 'scheme_broker_company_id', 'scheme_broker_scheme_id',
      'scheme_broker_broker_broker_id', 'investment_duration', 'folio_application_no',
      'transaction_notes'],
    rows: transactionRows,
  });

  // Product preferences drive part of the contact profile.
  const preferenceRows = [];
  contactIds.forEach((contactId) => {
    sample(products, int(1, 3)).forEach((product) => {
      preferenceRows.push([orgId, contactId, product.product_id]);
    });
  });
  await insertMany(client, {
    table: 'contact_product_preference',
    columns: ['org_id', 'contact_id', 'product_product_id'],
    rows: preferenceRows,
  });

  return {
    orgName: spec.orgName,
    orgId,
    staff: staffIds.length,
    contacts: contactIds.length,
    addresses: correspondenceRows.length,
    notes: noteRows.length,
    calls: callRows.length,
    meetings: meetingRows.length,
    emails: emailRows.length,
    tasks: taskRows.length,
    deals: dealRows.length,
    transactions: transactionRows.length,
    schemes: schemeRows.length,
  };
};

module.exports = { seedOrg };
