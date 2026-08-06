--
-- PostgreSQL database cluster dump
--

\restrict dpqY0MuBzAyolUdD3Rh3022CJG5cAYBbLCY5yPKVF3cZ9WRq57onphWJPnm6npc

SET default_transaction_read_only = off;

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

--
-- Roles
--

CREATE ROLE _avnadmin_auditing;
ALTER ROLE _avnadmin_auditing WITH NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB NOLOGIN NOREPLICATION NOBYPASSRLS;
CREATE ROLE _avnadmin_managed;
ALTER ROLE _avnadmin_managed WITH NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB NOLOGIN NOREPLICATION NOBYPASSRLS;
CREATE ROLE _avnadmin_monitor;
ALTER ROLE _avnadmin_monitor WITH NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB LOGIN NOREPLICATION NOBYPASSRLS;
CREATE ROLE _doadmin_auditing;
ALTER ROLE _doadmin_auditing WITH NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB NOLOGIN NOREPLICATION NOBYPASSRLS;
CREATE ROLE _doadmin_managed;
ALTER ROLE _doadmin_managed WITH NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB NOLOGIN NOREPLICATION NOBYPASSRLS;
CREATE ROLE _doadmin_monitor;
ALTER ROLE _doadmin_monitor WITH NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB LOGIN NOREPLICATION NOBYPASSRLS;
CREATE ROLE _dodb;
ALTER ROLE _dodb WITH SUPERUSER INHERIT NOCREATEROLE NOCREATEDB LOGIN REPLICATION NOBYPASSRLS;
CREATE ROLE _dodb_repl;
ALTER ROLE _dodb_repl WITH NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB LOGIN REPLICATION NOBYPASSRLS;
CREATE ROLE _dodb_rewind;
ALTER ROLE _dodb_rewind WITH NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB LOGIN NOREPLICATION NOBYPASSRLS;
CREATE ROLE avnadmin_group;
ALTER ROLE avnadmin_group WITH NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB NOLOGIN NOREPLICATION NOBYPASSRLS;
CREATE ROLE doadmin;
ALTER ROLE doadmin WITH NOSUPERUSER INHERIT CREATEROLE CREATEDB LOGIN REPLICATION BYPASSRLS;
CREATE ROLE doadmin_group;
ALTER ROLE doadmin_group WITH NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB NOLOGIN NOREPLICATION NOBYPASSRLS;
CREATE ROLE postgres;
ALTER ROLE postgres WITH SUPERUSER INHERIT CREATEROLE CREATEDB LOGIN REPLICATION BYPASSRLS;
CREATE ROLE readonly;
ALTER ROLE readonly WITH NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB NOLOGIN NOREPLICATION NOBYPASSRLS;
CREATE ROLE readwrite;
ALTER ROLE readwrite WITH NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB NOLOGIN NOREPLICATION NOBYPASSRLS;
CREATE ROLE tenant;
ALTER ROLE tenant WITH NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB LOGIN NOREPLICATION NOBYPASSRLS;

--
-- User Configurations
--

--
-- User Config "_avnadmin_monitor"
--

ALTER ROLE _avnadmin_monitor SET "pgaudit.log" TO 'none';
ALTER ROLE _avnadmin_monitor SET "pg_stat_statements.track" TO 'none';
ALTER ROLE _avnadmin_monitor SET "pg_stat_monitor.pgsm_track" TO 'none';
ALTER ROLE _avnadmin_monitor SET "extwlist.extensions" TO '';

--
-- User Config "_dodb"
--

ALTER ROLE _dodb SET default_transaction_isolation TO 'read committed';
ALTER ROLE _dodb SET "pgaudit.log" TO 'none';
ALTER ROLE _dodb SET default_transaction_read_only TO 'off';
ALTER ROLE _dodb SET "timescaledb.disable_load" TO 'on';
ALTER ROLE _dodb SET avn_wal_sender_stop_timeout TO '-1';
ALTER ROLE _dodb SET "pg_stat_statements.track" TO 'none';
ALTER ROLE _dodb SET "pg_stat_monitor.pgsm_track" TO 'none';

--
-- User Config "postgres"
--

ALTER ROLE postgres SET default_transaction_isolation TO 'read committed';
ALTER ROLE postgres SET "pgaudit.log" TO 'none';
ALTER ROLE postgres SET default_transaction_read_only TO 'off';
ALTER ROLE postgres SET "timescaledb.disable_load" TO 'on';
ALTER ROLE postgres SET avn_wal_sender_stop_timeout TO '-1';
ALTER ROLE postgres SET "pg_stat_statements.track" TO 'none';
ALTER ROLE postgres SET "pg_stat_monitor.pgsm_track" TO 'none';


--
-- Role memberships
--

GRANT _avnadmin_auditing TO _avnadmin_managed WITH INHERIT TRUE GRANTED BY postgres;
GRANT _avnadmin_managed TO avnadmin_group WITH INHERIT TRUE GRANTED BY postgres;
GRANT _doadmin_auditing TO _doadmin_managed WITH INHERIT TRUE GRANTED BY postgres;
GRANT _doadmin_managed TO doadmin WITH INHERIT TRUE GRANTED BY postgres;
GRANT _doadmin_managed TO doadmin_group WITH INHERIT TRUE GRANTED BY postgres;
GRANT avnadmin_group TO doadmin WITH ADMIN OPTION, INHERIT TRUE GRANTED BY postgres;
GRANT doadmin_group TO doadmin WITH ADMIN OPTION, INHERIT TRUE GRANTED BY postgres;
GRANT pg_create_subscription TO _avnadmin_managed WITH ADMIN OPTION, INHERIT TRUE GRANTED BY postgres;
GRANT pg_create_subscription TO _doadmin_managed WITH ADMIN OPTION, INHERIT TRUE GRANTED BY postgres;
GRANT pg_monitor TO _avnadmin_monitor WITH INHERIT TRUE GRANTED BY postgres;
GRANT pg_monitor TO _doadmin_monitor WITH INHERIT TRUE GRANTED BY postgres;
GRANT pg_read_all_stats TO _avnadmin_managed WITH ADMIN OPTION, INHERIT TRUE GRANTED BY postgres;
GRANT pg_read_all_stats TO _doadmin_managed WITH ADMIN OPTION, INHERIT TRUE GRANTED BY postgres;
GRANT pg_signal_backend TO _avnadmin_managed WITH INHERIT TRUE GRANTED BY postgres;
GRANT pg_signal_backend TO _doadmin_managed WITH INHERIT TRUE GRANTED BY postgres;
GRANT pg_stat_scan_tables TO _avnadmin_managed WITH INHERIT TRUE GRANTED BY postgres;
GRANT pg_stat_scan_tables TO _doadmin_managed WITH INHERIT TRUE GRANTED BY postgres;
GRANT readonly TO doadmin WITH ADMIN OPTION, INHERIT FALSE, SET FALSE GRANTED BY postgres;
GRANT readonly TO doadmin WITH INHERIT TRUE GRANTED BY doadmin;
GRANT readwrite TO doadmin WITH ADMIN OPTION, INHERIT FALSE, SET FALSE GRANTED BY postgres;
GRANT readwrite TO tenant WITH INHERIT TRUE GRANTED BY doadmin;
GRANT readwrite TO doadmin WITH INHERIT TRUE GRANTED BY doadmin;
GRANT tenant TO doadmin WITH ADMIN OPTION, INHERIT FALSE, SET FALSE GRANTED BY postgres;
GRANT tenant TO doadmin WITH INHERIT TRUE GRANTED BY doadmin;


--
-- Role privileges on configuration parameters
--

GRANT SET ON PARAMETER "anon.algorithm" TO doadmin_group WITH GRANT OPTION;
GRANT SET ON PARAMETER "anon.algorithm" TO avnadmin_group WITH GRANT OPTION;
GRANT SET ON PARAMETER "anon.dummy_locale" TO doadmin_group WITH GRANT OPTION;
GRANT SET ON PARAMETER "anon.dummy_locale" TO avnadmin_group WITH GRANT OPTION;
GRANT SET ON PARAMETER "anon.k_anonymity_provider" TO doadmin_group WITH GRANT OPTION;
GRANT SET ON PARAMETER "anon.k_anonymity_provider" TO avnadmin_group WITH GRANT OPTION;
GRANT SET ON PARAMETER "anon.masking_policies" TO doadmin_group WITH GRANT OPTION;
GRANT SET ON PARAMETER "anon.masking_policies" TO avnadmin_group WITH GRANT OPTION;
GRANT SET ON PARAMETER "anon.maskschema" TO doadmin_group WITH GRANT OPTION;
GRANT SET ON PARAMETER "anon.maskschema" TO avnadmin_group WITH GRANT OPTION;
GRANT SET ON PARAMETER "anon.privacy_by_default" TO doadmin_group WITH GRANT OPTION;
GRANT SET ON PARAMETER "anon.privacy_by_default" TO avnadmin_group WITH GRANT OPTION;
GRANT SET ON PARAMETER "anon.restrict_to_trusted_schemas" TO doadmin_group WITH GRANT OPTION;
GRANT SET ON PARAMETER "anon.restrict_to_trusted_schemas" TO avnadmin_group WITH GRANT OPTION;
GRANT SET ON PARAMETER "anon.salt" TO doadmin_group WITH GRANT OPTION;
GRANT SET ON PARAMETER "anon.salt" TO avnadmin_group WITH GRANT OPTION;
GRANT SET ON PARAMETER "anon.sourceschema" TO doadmin_group WITH GRANT OPTION;
GRANT SET ON PARAMETER "anon.sourceschema" TO avnadmin_group WITH GRANT OPTION;
GRANT SET ON PARAMETER "anon.static_masking" TO doadmin_group WITH GRANT OPTION;
GRANT SET ON PARAMETER "anon.static_masking" TO avnadmin_group WITH GRANT OPTION;
GRANT SET ON PARAMETER "anon.strict_mode" TO doadmin_group WITH GRANT OPTION;
GRANT SET ON PARAMETER "anon.strict_mode" TO avnadmin_group WITH GRANT OPTION;
GRANT SET ON PARAMETER "anon.transparent_dynamic_masking" TO doadmin_group WITH GRANT OPTION;
GRANT SET ON PARAMETER "anon.transparent_dynamic_masking" TO avnadmin_group WITH GRANT OPTION;
GRANT SET ON PARAMETER "pgaudit.feature_enabled" TO _doadmin_auditing;
GRANT SET ON PARAMETER "pgaudit.feature_enabled" TO _avnadmin_auditing;
GRANT SET ON PARAMETER "pgaudit.log" TO _doadmin_auditing;
GRANT SET ON PARAMETER "pgaudit.log" TO _avnadmin_auditing;
GRANT SET ON PARAMETER "pgaudit.log_catalog" TO _doadmin_auditing;
GRANT SET ON PARAMETER "pgaudit.log_catalog" TO _avnadmin_auditing;
GRANT SET ON PARAMETER "pgaudit.log_client" TO _doadmin_auditing;
GRANT SET ON PARAMETER "pgaudit.log_client" TO _avnadmin_auditing;
GRANT SET ON PARAMETER "pgaudit.log_level" TO _doadmin_auditing;
GRANT SET ON PARAMETER "pgaudit.log_level" TO _avnadmin_auditing;
GRANT SET ON PARAMETER "pgaudit.log_max_string_length" TO _doadmin_auditing;
GRANT SET ON PARAMETER "pgaudit.log_max_string_length" TO _avnadmin_auditing;
GRANT SET ON PARAMETER "pgaudit.log_nested_statements" TO _doadmin_auditing;
GRANT SET ON PARAMETER "pgaudit.log_nested_statements" TO _avnadmin_auditing;
GRANT SET ON PARAMETER "pgaudit.log_parameter" TO _doadmin_auditing;
GRANT SET ON PARAMETER "pgaudit.log_parameter" TO _avnadmin_auditing;
GRANT SET ON PARAMETER "pgaudit.log_parameter_max_size" TO _doadmin_auditing;
GRANT SET ON PARAMETER "pgaudit.log_parameter_max_size" TO _avnadmin_auditing;
GRANT SET ON PARAMETER "pgaudit.log_relation" TO _doadmin_auditing;
GRANT SET ON PARAMETER "pgaudit.log_relation" TO _avnadmin_auditing;
GRANT SET ON PARAMETER "pgaudit.log_rows" TO _doadmin_auditing;
GRANT SET ON PARAMETER "pgaudit.log_rows" TO _avnadmin_auditing;
GRANT SET ON PARAMETER "pgaudit.log_statement" TO _doadmin_auditing;
GRANT SET ON PARAMETER "pgaudit.log_statement" TO _avnadmin_auditing;
GRANT SET ON PARAMETER "pgaudit.log_statement_once" TO _doadmin_auditing;
GRANT SET ON PARAMETER "pgaudit.log_statement_once" TO _avnadmin_auditing;


\unrestrict dpqY0MuBzAyolUdD3Rh3022CJG5cAYBbLCY5yPKVF3cZ9WRq57onphWJPnm6npc

--
-- PostgreSQL database cluster dump complete
--

