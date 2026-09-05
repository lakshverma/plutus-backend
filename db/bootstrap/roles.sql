-- Creates the application's two database roles.
--
-- Roles are cluster-level and carry passwords, so they do not belong in a tracked
-- migration: the migration history is committed, and a password must not be. This
-- runs once per database, before the first migration, via bootstrap.js alongside it,
-- connected as the role the hosting provider created the database with. That
-- provider role is used for nothing else: it can create roles and databases, and
-- application traffic has no business holding a credential that can.
--
-- The passwords arrive as run-time parameters set by the script with bound values.
-- DDL cannot take bind parameters, so format(%L) quotes them into the statements;
-- passing them through current_setting keeps them out of the SQL text itself.

DO $do$
DECLARE
  admin_password  text := current_setting('plutus.admin_password');
  tenant_password text := current_setting('plutus.tenant_password');
BEGIN
  IF coalesce(admin_password, '') = '' THEN
    RAISE EXCEPTION 'ADMIN_DB_PASSWORD is empty';
  END IF;
  IF coalesce(tenant_password, '') = '' THEN
    RAISE EXCEPTION 'TENANT_DB_PASSWORD is empty';
  END IF;

  -- plutus_admin runs the migrations and so owns every table, which is what lets it
  -- bypass row-level security: an owner is exempt from a table's policies unless
  -- FORCE ROW LEVEL SECURITY is set, and it is deliberately not. The application's
  -- admin pool, the seeds and the migrations all connect as this role. It cannot
  -- create roles or databases; those stay with the provider role.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'plutus_admin') THEN
    EXECUTE format(
      'ALTER ROLE plutus_admin WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD %L',
      admin_password
    );
    RAISE NOTICE 'role "plutus_admin" already existed; password and attributes updated';
  ELSE
    EXECUTE format(
      'CREATE ROLE plutus_admin WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD %L',
      admin_password
    );
    RAISE NOTICE 'role "plutus_admin" created';
  END IF;

  -- plutus_tenant owns nothing and has BYPASSRLS = false, so every policy binds for
  -- it. This is the role the application serves tenant requests through, and the
  -- reason a bug in a query cannot reach another tenant's rows.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'plutus_tenant') THEN
    EXECUTE format(
      'ALTER ROLE plutus_tenant WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD %L',
      tenant_password
    );
    RAISE NOTICE 'role "plutus_tenant" already existed; password and attributes updated';
  ELSE
    EXECUTE format(
      'CREATE ROLE plutus_tenant WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD %L',
      tenant_password
    );
    RAISE NOTICE 'role "plutus_tenant" created';
  END IF;

  EXECUTE format('GRANT CONNECT ON DATABASE %I TO plutus_admin, plutus_tenant', current_database());

  -- CREATE on the database is what allows the migration to add the audit schema and
  -- install the (trusted) extensions; CREATE on public is what allows the tables.
  EXECUTE format('GRANT CREATE ON DATABASE %I TO plutus_admin', current_database());
  GRANT USAGE, CREATE ON SCHEMA public TO plutus_admin;
  GRANT USAGE ON SCHEMA public TO plutus_tenant;
END
$do$;
