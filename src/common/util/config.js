/* eslint-disable no-nested-ternary */
/* eslint-disable camelcase */
require('dotenv').config();

const production_pg_info = null;
const dev_pg_info = {
  user: process.env.DEV_PGUSER,
  host: process.env.DEV_PGHOST,
  database: process.env.DEV_PGDATABASE,
  password: process.env.DEV_PGPASSWORD,
  port: process.env.PGPORT,
};
const test_pg_info = null;

const production_tenant_info = null;

const dev_tenant_info = {
  user: process.env.DEV_TENANTUSER,
  host: process.env.DEV_PGHOST,
  database: process.env.DEV_PGDATABASE,
  password: process.env.DEV_TENANTPASSWORD,
  port: process.env.PGPORT,
};

const test_tenant_info = null;

const PG_CONNECTION_OBJ = process.env.NODE_ENV === 'test'
  ? test_pg_info
  : process.env.NODE_ENV === 'development'
    ? dev_pg_info
    : process.env.NODE_ENV === 'production'
      ? production_pg_info
      : null;

const PG_TENANT_CONNECTION_OBJ = process.env.NODE_ENV === 'test'
  ? test_tenant_info
  : process.env.NODE_ENV === 'development'
    ? dev_tenant_info
    : process.env.NODE_ENV === 'production'
      ? production_tenant_info
      : null;

const TENANT_CONTEXT = {
  orgId: '',
  userId: '',
  get tenantInfo() {
    return String(this.orgId);
  },
  set tenantInfo(uuid) {
    this.orgId = uuid;
  },
  get userInfo() {
    return String(this.userId);
  },
  set userInfo(uuid) {
    this.userId = uuid;
  },
};

const ZEPTOMAIL_CONFIG = {
  url: process.env.ZEPTOMAIL_API_URL,
  bounceAddress: process.env.ZEPTOMAIL_BOUNCE_ADDRESS,
  fromEmail: process.env.ZEPTOMAIL_FROM_ADDRESS,
  fromName: process.env.ZEPTOMAIL_FROM_NAME,
  signup: {
    token: process.env.ZEPTOMAIL_SIGNUP_TOKEN,
    templateKey: process.env.ZEPTOMAIL_SIGNUP_TEMPLATE_KEY,
  },
  signupTenant: {
    token: process.env.ZEPTOMAIL_SIGNUP_TOKEN,
    templateKey: process.env.ZEPTOMAIL_TENANT_SIGNUP_TEMPLATE_KEY,
  },
  recover: {
    token: process.env.ZEPTOMAIL_RECOVER_TOKEN,
    templateKey: {
      passwordResetLink: process.env.ZEPTOMAIL_PASSWORD_RESET_TEMPLATE_KEY,
      passwordResetSuccess: process.env.ZEPTOMAIL_RESET_SUCCESS_KEY,
    },
  },
};

const PORT = process.env.PORT || 3001;

module.exports = {
  PG_CONNECTION_OBJ,
  PG_TENANT_CONNECTION_OBJ,
  TENANT_CONTEXT,
  ZEPTOMAIL_CONFIG,
  PORT,
};
