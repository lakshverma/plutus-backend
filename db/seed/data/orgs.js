/*
 * The two seeded tenants.
 *
 * Two rather than one is deliberate. Tenant isolation is enforced by row-level
 * security, and a single tenant cannot exercise it: only signing in as the second org
 * and finding none of the first org's data confirms the policies actually bind.
 *
 * Credentials come from the environment so the repository holds none. SEED_DEMO_*
 * covers the primary org; the second org's login derives from it, so a single pair of
 * variables configures both.
 */

const { ROLES } = require('../../../src/common/util/helper');

const demoEmail = process.env.SEED_DEMO_EMAIL || 'demo@plutus.example';
const demoPassword = process.env.SEED_DEMO_PASSWORD;

// No fallback on purpose. A default here would be a known password committed to a
// public repository, and a deployment that forgot to set the variable would ship it.
if (!demoPassword) {
  throw new Error('SEED_DEMO_PASSWORD is not set. See .env.example.');
}

// Same mailbox with a plus tag, so both logins stay obviously related and a single
// inbox receives anything either of them triggers.
const secondaryEmail = demoEmail.includes('@')
  ? demoEmail.replace('@', '+beta@')
  : 'demo+beta@plutus.example';

const ORGS = [
  {
    key: 'alpha',
    orgName: 'Meridian Wealth Advisors',
    orgSize: '11-50',
    orgWebsite: 'https://meridianwealth.example',
    demoEmail,
    demoPassword,
    // Fixed so every run and every nightly reset produces the same book of business.
    rngSeed: 20260101,
    contactCount: 1000,
    hotContactCount: 100,
    staff: [
      // The first entry is the account SEED_DEMO_EMAIL signs in as, and must be
      // role 2: every protected route in the frontend is gated on it (src/app/App.js).
      {
        firstName: 'Ananya', lastName: 'Krishnan', role: ROLES.admin, jobTitle: 'Principal Adviser', email: null,
      },
      {
        firstName: 'Rohan', lastName: 'Deshpande', role: ROLES.admin, jobTitle: 'Senior Wealth Manager', email: 'rohan.deshpande@meridianwealth.example',
      },
      {
        firstName: 'Meera', lastName: 'Iyer', role: ROLES.standard, jobTitle: 'Relationship Manager', email: 'meera.iyer@meridianwealth.example',
      },
      {
        firstName: 'Vikram', lastName: 'Singh', role: ROLES.standard, jobTitle: 'Investment Analyst', email: 'vikram.singh@meridianwealth.example',
      },
      {
        firstName: 'Priya', lastName: 'Nair', role: ROLES.standard, jobTitle: 'Client Servicing', email: 'priya.nair@meridianwealth.example',
      },
    ],
  },
  {
    key: 'beta',
    orgName: 'Sunrise Financial Planners',
    orgSize: '1-10',
    orgWebsite: 'https://sunriseplanners.example',
    demoEmail: secondaryEmail,
    demoPassword,
    rngSeed: 20260202,
    contactCount: 20,
    hotContactCount: 6,
    staff: [
      {
        firstName: 'Arjun', lastName: 'Mehta', role: ROLES.admin, jobTitle: 'Founder', email: null,
      },
      {
        firstName: 'Sneha', lastName: 'Patil', role: ROLES.standard, jobTitle: 'Adviser', email: 'sneha.patil@sunriseplanners.example',
      },
    ],
  },
];

module.exports = { ORGS, demoEmail, secondaryEmail };
