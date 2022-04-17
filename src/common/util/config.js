require("dotenv").config();

const production_pg_info = null;
const dev_pg_info = {
  user: process.env.DEV_PGUSER,
  host: process.env.DEV_PGHOST,
  database: process.env.DEV_PGDATABASE,
  password: process.env.DEV_PGPASSWORD,
  port: process.env.PGPORT,
};
const test_pg_info = null;

const PG_CONNECTION_OBJ =
  process.env.NODE_ENV === "test"
    ? test_pg_info
    : process.env.NODE_ENV === "development"
    ? dev_pg_info
    : process.env.NODE_ENV === "production"
    ? production_pg_info
    : null;

const PORT = process.env.PORT || 3001;

module.exports = {
  PG_CONNECTION_OBJ,
  PORT,
};
