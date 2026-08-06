-- 001_enable_rls_on_audit_tables.sql
--
-- Brings the audit tables under the same tenant isolation as the rest of the
-- schema. They carry an org_id column but had no row-level security, so unlike
-- every public.* table they were not constrained by app.current_tenant.
--
-- The policy is FOR SELECT only. Nothing but the audit triggers should ever write
-- to an audit log, and with no permissive policy covering INSERT/UPDATE/DELETE
-- those commands are denied outright for the tenant role.
--
-- Trigger writes are unaffected: all three audit functions are SECURITY DEFINER
-- owned by doadmin, which has BYPASSRLS. No application code writes to these
-- tables directly.
--
-- org_id here is `text` and nullable, unlike the `uuid NOT NULL` columns on public
-- tables, so this compares as text rather than reusing the ::uuid cast used by the
-- public.* policies. The trigger functions write org_id straight from
-- current_setting('app.current_tenant'), so both sides are the same string. A NULL
-- org_id yields NULL, not true, which hides the row — fail-closed, as intended.

BEGIN;

ALTER TABLE audit.activity_contact_log  ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.contact_property_log  ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.other_activity_log    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON audit.activity_contact_log;
CREATE POLICY tenant_isolation_policy ON audit.activity_contact_log
  FOR SELECT USING (org_id = current_setting('app.current_tenant'));

DROP POLICY IF EXISTS tenant_isolation_policy ON audit.contact_property_log;
CREATE POLICY tenant_isolation_policy ON audit.contact_property_log
  FOR SELECT USING (org_id = current_setting('app.current_tenant'));

DROP POLICY IF EXISTS tenant_isolation_policy ON audit.other_activity_log;
CREATE POLICY tenant_isolation_policy ON audit.other_activity_log
  FOR SELECT USING (org_id = current_setting('app.current_tenant'));

COMMIT;
