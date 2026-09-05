-- Initial schema (baseline).
--
-- The schema as it stood when migration tracking was introduced: the audit schema,
-- the pg_trgm and uuid-ossp extensions, 33 tables with their constraints and
-- indexes, three SECURITY DEFINER audit trigger functions with their 19 triggers,
-- and every row-level security policy.
--
-- Tenant isolation lives entirely in those policies rather than in query
-- predicates, so a database created without this migration would not be a
-- partially working one; it would serve every tenant's data to every other tenant.
--
-- Run this as plutus_admin (see db/bootstrap/roles.sql). Ownership is left to
-- whoever runs the migration, and the application's admin pool connects as that
-- same role: it bypasses RLS by owning the tables, which is why FORCE ROW LEVEL
-- SECURITY must stay off everywhere. PROJECT_DOCUMENTATION.md, section 6, covers
-- the two-pool model.

-- Up Migration

CREATE SCHEMA audit;

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';

CREATE FUNCTION audit.if_contact_activity_modified_func() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'audit'
    AS $$
DECLARE
    v_old_data JSONB;
    v_new_data JSONB;
    result JSONB;
    v_record RECORD;
    v_orgid TEXT;
    v_userid TEXT;
BEGIN
    /*  If this actually for real auditing (where you need to log EVERY action),
        then you would need to use something like dblink or plperl that could log outside the transaction,
        regardless of whether the transaction committed or rolled back.
    */
    
    v_orgid := current_setting('app.current_tenant');
    v_userid := current_setting('app.current_userid');

    if (TG_OP = 'UPDATE') then
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);

        result := v_new_data;
        FOR v_record IN SELECT * FROM jsonb_each(v_old_data) LOOP
            IF result @> jsonb_build_object(v_record.key,v_record.value)
                THEN result = result - v_record.key;
            ELSIF result ? v_record.key THEN CONTINUE;
            ELSE
                result = result || jsonb_build_object(v_record.key,'null');
            END IF;
        END LOOP;

        insert into audit.activity_contact_log (schema_name,table_name,org_id,user_id,action,original_data,new_data,diff_data,query) 
        values (TG_TABLE_SCHEMA::TEXT,TG_TABLE_NAME::TEXT,v_orgid,v_userid,substring(TG_OP,1,1),v_old_data,v_new_data,result,current_query());
        RETURN NEW;
    elsif (TG_OP = 'DELETE') then
        v_old_data := to_jsonb(OLD);
        insert into audit.activity_contact_log (schema_name,table_name,org_id,user_id,action,original_data,query)
        values (TG_TABLE_SCHEMA::TEXT,TG_TABLE_NAME::TEXT,v_orgid,v_userid,substring(TG_OP,1,1),v_old_data, current_query());
        RETURN OLD;
    elsif (TG_OP = 'INSERT') then
        v_new_data := to_jsonb(NEW);
        insert into audit.activity_contact_log (schema_name,table_name,org_id,user_id,action,new_data,query)
        values (TG_TABLE_SCHEMA::TEXT,TG_TABLE_NAME::TEXT,v_orgid,v_userid,substring(TG_OP,1,1),v_new_data, current_query());
        RETURN NEW;
    else
        RAISE WARNING '[AUDIT.IF_CONTACT_ACTIVITY_MODIFIED_FUNC] - Other action occurred: %, at %',TG_OP,now();
        RETURN NULL;
    end if;

EXCEPTION
    WHEN data_exception THEN
        RAISE WARNING '[AUDIT.IF_CONTACT_ACTIVITY_MODIFIED_FUNC] - UDF ERROR [DATA EXCEPTION] - SQLSTATE: %, SQLERRM: %',SQLSTATE,SQLERRM;
        RETURN NULL;
    WHEN unique_violation THEN
        RAISE WARNING '[AUDIT.IF_CONTACT_ACTIVITY_MODIFIED_FUNC] - UDF ERROR [UNIQUE] - SQLSTATE: %, SQLERRM: %',SQLSTATE,SQLERRM;
        RETURN NULL;
    WHEN others THEN
        RAISE WARNING '[AUDIT.IF_CONTACT_ACTIVITY_MODIFIED_FUNC] - UDF ERROR [OTHER] - SQLSTATE: %, SQLERRM: %',SQLSTATE,SQLERRM;
        RETURN NULL;
END;
$$;

CREATE FUNCTION audit.if_contact_prop_modified_func() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'audit'
    AS $$
DECLARE
    v_old_data JSONB;
    v_new_data JSONB;
    result JSONB;
    v_record RECORD;
    v_orgid TEXT;
    v_userid TEXT;
BEGIN
    /*  If this actually for real auditing (where you need to log EVERY action),
        then you would need to use something like dblink or plperl that could log outside the transaction,
        regardless of whether the transaction committed or rolled back.
    */
    
    v_orgid := current_setting('app.current_tenant');
    v_userid := current_setting('app.current_userid');

    if (TG_OP = 'UPDATE') then
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);

        result := v_new_data;
        FOR v_record IN SELECT * FROM jsonb_each(v_old_data) LOOP
            IF result @> jsonb_build_object(v_record.key,v_record.value)
                THEN result = result - v_record.key;
            ELSIF result ? v_record.key THEN CONTINUE;
            ELSE
                result = result || jsonb_build_object(v_record.key,'null');
            END IF;
        END LOOP;

        insert into audit.contact_property_log (schema_name,table_name,org_id,user_id,action,original_data,new_data,diff_data,query) 
        values (TG_TABLE_SCHEMA::TEXT,TG_TABLE_NAME::TEXT,v_orgid,v_userid,substring(TG_OP,1,1),v_old_data,v_new_data,result,current_query());
        RETURN NEW;
    elsif (TG_OP = 'DELETE') then
        v_old_data := to_jsonb(OLD);
        insert into audit.contact_property_log (schema_name,table_name,org_id,user_id,action,original_data,query)
        values (TG_TABLE_SCHEMA::TEXT,TG_TABLE_NAME::TEXT,v_orgid,v_userid,substring(TG_OP,1,1),v_old_data, current_query());
        RETURN OLD;
    elsif (TG_OP = 'INSERT') then
        v_new_data := to_jsonb(NEW);
        insert into audit.contact_property_log (schema_name,table_name,org_id,user_id,action,new_data,query)
        values (TG_TABLE_SCHEMA::TEXT,TG_TABLE_NAME::TEXT,v_orgid,v_userid,substring(TG_OP,1,1),v_new_data, current_query());
        RETURN NEW;
    else
        RAISE WARNING '[AUDIT.IF_CONTACT_PROP_MODIFIED_FUNC] - Other action occurred: %, at %',TG_OP,now();
        RETURN NULL;
    end if;

EXCEPTION
    WHEN data_exception THEN
        RAISE WARNING '[AUDIT.IF_CONTACT_PROP_MODIFIED_FUNC] - UDF ERROR [DATA EXCEPTION] - SQLSTATE: %, SQLERRM: %',SQLSTATE,SQLERRM;
        RETURN NULL;
    WHEN unique_violation THEN
        RAISE WARNING '[AUDIT.IF_CONTACT_PROP_MODIFIED_FUNC] - UDF ERROR [UNIQUE] - SQLSTATE: %, SQLERRM: %',SQLSTATE,SQLERRM;
        RETURN NULL;
    WHEN others THEN
        RAISE WARNING '[AUDIT.IF_CONTACT_PROP_MODIFIED_FUNC] - UDF ERROR [OTHER] - SQLSTATE: %, SQLERRM: %',SQLSTATE,SQLERRM;
        RETURN NULL;
END;
$$;

CREATE FUNCTION audit.if_other_modified_func() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'audit'
    AS $$
DECLARE
    v_old_data JSONB;
    v_new_data JSONB;
    result JSONB;
    v_record RECORD;
    v_orgid TEXT;
    v_userid TEXT;
BEGIN
    /*  If this actually for real auditing (where you need to log EVERY action),
        then you would need to use something like dblink or plperl that could log outside the transaction,
        regardless of whether the transaction committed or rolled back.
    */
    
    v_orgid := current_setting('app.current_tenant');
    v_userid := current_setting('app.current_userid');

    if (TG_OP = 'UPDATE') then
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);

        result := v_new_data;
        FOR v_record IN SELECT * FROM jsonb_each(v_old_data) LOOP
            IF result @> jsonb_build_object(v_record.key,v_record.value)
                THEN result = result - v_record.key;
            ELSIF result ? v_record.key THEN CONTINUE;
            ELSE
                result = result || jsonb_build_object(v_record.key,'null');
            END IF;
        END LOOP;

        insert into audit.other_activity_log (schema_name,table_name,org_id,user_id,action,original_data,new_data,diff_data,query) 
        values (TG_TABLE_SCHEMA::TEXT,TG_TABLE_NAME::TEXT,v_orgid,v_userid,substring(TG_OP,1,1),v_old_data,v_new_data,result,current_query());
        RETURN NEW;
    elsif (TG_OP = 'DELETE') then
        v_old_data := to_jsonb(OLD);
        insert into audit.other_activity_log (schema_name,table_name,org_id,user_id,action,original_data,query)
        values (TG_TABLE_SCHEMA::TEXT,TG_TABLE_NAME::TEXT,v_orgid,v_userid,substring(TG_OP,1,1),v_old_data, current_query());
        RETURN OLD;
    elsif (TG_OP = 'INSERT') then
        v_new_data := to_jsonb(NEW);
        insert into audit.other_activity_log (schema_name,table_name,org_id,user_id,action,new_data,query)
        values (TG_TABLE_SCHEMA::TEXT,TG_TABLE_NAME::TEXT,v_orgid,v_userid,substring(TG_OP,1,1),v_new_data, current_query());
        RETURN NEW;
    else
        RAISE WARNING '[AUDIT.OTHER_ACTIVITY_LOG] - Other action occurred: %, at %',TG_OP,now();
        RETURN NULL;
    end if;

EXCEPTION
    WHEN data_exception THEN
        RAISE WARNING '[AUDIT.OTHER_ACTIVITY_LOG] - UDF ERROR [DATA EXCEPTION] - SQLSTATE: %, SQLERRM: %',SQLSTATE,SQLERRM;
        RETURN NULL;
    WHEN unique_violation THEN
        RAISE WARNING '[AUDIT.OTHER_ACTIVITY_LOG] - UDF ERROR [UNIQUE] - SQLSTATE: %, SQLERRM: %',SQLSTATE,SQLERRM;
        RETURN NULL;
    WHEN others THEN
        RAISE WARNING '[AUDIT.OTHER_ACTIVITY_LOG] - UDF ERROR [OTHER] - SQLSTATE: %, SQLERRM: %',SQLSTATE,SQLERRM;
        RETURN NULL;
END;
$$;

CREATE TABLE audit.activity_contact_log (
    event_id bigint NOT NULL,
    schema_name text NOT NULL,
    table_name text NOT NULL,
    org_id text,
    user_id text,
    action_tstamp timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    statement_tstamp timestamp with time zone DEFAULT statement_timestamp() NOT NULL,
    action text NOT NULL,
    original_data jsonb,
    new_data jsonb,
    diff_data jsonb,
    query text,
    CONSTRAINT activity_contact_log_action_check CHECK ((action = ANY (ARRAY['I'::text, 'D'::text, 'U'::text])))
)
WITH (fillfactor='100');

ALTER TABLE audit.activity_contact_log ALTER COLUMN event_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME audit.activity_contact_log_event_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE audit.contact_property_log (
    event_id bigint NOT NULL,
    schema_name text NOT NULL,
    table_name text NOT NULL,
    org_id text,
    user_id text,
    action_tstamp timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    statement_tstamp timestamp with time zone DEFAULT statement_timestamp() NOT NULL,
    action text NOT NULL,
    original_data jsonb,
    new_data jsonb,
    diff_data jsonb,
    query text,
    CONSTRAINT contact_property_log_action_check CHECK ((action = ANY (ARRAY['I'::text, 'D'::text, 'U'::text])))
)
WITH (fillfactor='100');

ALTER TABLE audit.contact_property_log ALTER COLUMN event_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME audit.contact_property_log_event_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE audit.other_activity_log (
    event_id bigint NOT NULL,
    schema_name text NOT NULL,
    table_name text NOT NULL,
    org_id text,
    user_id text,
    action_tstamp timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    statement_tstamp timestamp with time zone DEFAULT statement_timestamp() NOT NULL,
    action text NOT NULL,
    original_data jsonb,
    new_data jsonb,
    diff_data jsonb,
    query text,
    CONSTRAINT other_activity_log_action_check CHECK ((action = ANY (ARRAY['I'::text, 'D'::text, 'U'::text])))
)
WITH (fillfactor='100');

ALTER TABLE audit.other_activity_log ALTER COLUMN event_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME audit.other_activity_log_event_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.broker (
    org_id uuid NOT NULL,
    broker_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    broker_code text NOT NULL,
    broker_name text NOT NULL,
    broker_type text NOT NULL,
    is_active boolean NOT NULL
);

CREATE TABLE public.call (
    org_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    call_id bigint NOT NULL,
    call_creator_user_id uuid NOT NULL,
    call_create_timestamp timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    call_description text NOT NULL,
    call_activity_date date NOT NULL,
    call_activity_time time without time zone NOT NULL,
    call_outcome text NOT NULL
);

ALTER TABLE public.call ALTER COLUMN call_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.call_call_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.city (
    city_id integer NOT NULL,
    city_name text NOT NULL,
    country_name text NOT NULL
);

ALTER TABLE public.city ALTER COLUMN city_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.city_city_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.company (
    org_id uuid NOT NULL,
    company_id integer NOT NULL,
    company_name text NOT NULL
);

ALTER TABLE public.company ALTER COLUMN company_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.company_company_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.company_product (
    org_id uuid NOT NULL,
    company_id integer NOT NULL,
    company_product_id bigint NOT NULL,
    product_product_id bigint NOT NULL
);

ALTER TABLE public.company_product ALTER COLUMN company_product_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.company_product_company_product_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.contact (
    org_id uuid NOT NULL,
    contact_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    referred_by uuid,
    contact_type integer NOT NULL,
    group_codes_group_id bigint NOT NULL,
    group_head boolean NOT NULL,
    group_head_relation text NOT NULL,
    first_name text NOT NULL,
    middle_name text,
    last_name text NOT NULL,
    dob date NOT NULL,
    marital_status text NOT NULL,
    anniversary_date date,
    gross_annual_income integer NOT NULL,
    email text NOT NULL,
    correspondence_email text NOT NULL,
    political_exposure boolean NOT NULL,
    birth_place_city_id integer NOT NULL,
    residence_status_residence_status_id integer NOT NULL,
    non_res_tax_id text,
    profession_profession_id integer NOT NULL,
    loan_details text,
    risk_profile text NOT NULL,
    contact_owner uuid NOT NULL,
    contact_status text,
    org_name text,
    industry text,
    contact_source text NOT NULL,
    is_active boolean
);

CREATE TABLE public.contact_correspondence (
    org_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    correspondence_id bigint NOT NULL,
    address_type text NOT NULL,
    address text,
    city_city_id integer,
    pincode text,
    phone_number text,
    mobile_number text
);

ALTER TABLE public.contact_correspondence ALTER COLUMN correspondence_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.contact_correspondence_correspondence_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.contact_product_preference (
    org_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    preference_id bigint NOT NULL,
    product_product_id bigint NOT NULL
);

ALTER TABLE public.contact_product_preference ALTER COLUMN preference_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.contact_product_preference_preference_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.contact_type (
    org_id uuid NOT NULL,
    contact_type_id integer NOT NULL,
    contact_type text NOT NULL
);

ALTER TABLE public.contact_type ALTER COLUMN contact_type_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.contact_type_contact_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.deal (
    org_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    deal_id bigint NOT NULL,
    deal_creator_user_id uuid NOT NULL,
    deal_create_timestamp timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deal_stage_deal_stage_id bigint NOT NULL,
    deal_amount bigint NOT NULL,
    close_date date NOT NULL,
    deal_type text NOT NULL
);

ALTER TABLE public.deal ALTER COLUMN deal_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.deal_deal_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.deal_scheme (
    org_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    scheme_company_id integer NOT NULL,
    deal_deal_id bigint NOT NULL,
    deal_scheme_id bigint NOT NULL,
    scheme_scheme_id bigint NOT NULL,
    deal_scheme_amount bigint NOT NULL,
    deal_scheme_duration_mode text NOT NULL
);

ALTER TABLE public.deal_scheme ALTER COLUMN deal_scheme_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.deal_scheme_deal_scheme_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.deal_stage (
    org_id uuid NOT NULL,
    deal_stage_id bigint NOT NULL,
    deal_stage text NOT NULL
);

ALTER TABLE public.deal_stage ALTER COLUMN deal_stage_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.deal_stage_deal_stage_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.email (
    org_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    email_id bigint NOT NULL,
    email_creator_user_id uuid NOT NULL,
    email_create_timestamp timestamp without time zone NOT NULL,
    email_description text NOT NULL
);

ALTER TABLE public.email ALTER COLUMN email_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.email_email_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.group_codes (
    org_id uuid NOT NULL,
    group_id bigint NOT NULL,
    is_active boolean NOT NULL
);

ALTER TABLE public.group_codes ALTER COLUMN group_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.group_codes_group_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.meeting (
    org_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    meeting_id bigint NOT NULL,
    meeting_creator_user_id uuid NOT NULL,
    meeting_create_timestamp timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    meeting_description text,
    meeting_duration text NOT NULL,
    meeting_activity_date date NOT NULL,
    meeting_activity_time time without time zone NOT NULL,
    meeting_outcome text NOT NULL
);

ALTER TABLE public.meeting ALTER COLUMN meeting_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.meeting_meeting_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.note (
    org_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    note_id bigint NOT NULL,
    note_creator_user_id uuid NOT NULL,
    note_create_timestamp timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    note_description text NOT NULL
);

ALTER TABLE public.note ALTER COLUMN note_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.note_note_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.org_details (
    org_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    org_name text NOT NULL,
    org_size text NOT NULL,
    org_website text,
    subscription_plans_plan_id uuid NOT NULL,
    status text NOT NULL
);

CREATE TABLE public.org_user (
    org_id uuid NOT NULL,
    user_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    first_name text NOT NULL,
    middle_name text,
    last_name text NOT NULL,
    email text NOT NULL,
    username text NOT NULL,
    password_hash text NOT NULL,
    user_roles_user_roles_id integer NOT NULL,
    job_title text,
    status text NOT NULL
);

CREATE TABLE public.product (
    org_id uuid NOT NULL,
    product_id bigint NOT NULL,
    product_name text NOT NULL,
    is_active boolean NOT NULL
);

ALTER TABLE public.product ALTER COLUMN product_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.product_product_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.profession (
    profession_id integer NOT NULL,
    profession_name text NOT NULL
);

ALTER TABLE public.profession ALTER COLUMN profession_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.profession_profession_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.registrar (
    registrar_id integer NOT NULL,
    registrar_name text NOT NULL,
    registrar_address text NOT NULL,
    registrar_contact_number text,
    registrar_contact_person text NOT NULL,
    registrar_email text
);

ALTER TABLE public.registrar ALTER COLUMN registrar_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.registrar_registrar_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.residence_status (
    residence_status_id integer NOT NULL,
    residence_status text NOT NULL
);

ALTER TABLE public.residence_status ALTER COLUMN residence_status_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.residence_status_residence_status_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.scheme (
    org_id uuid NOT NULL,
    company_id integer NOT NULL,
    scheme_id bigint NOT NULL,
    scheme_name text NOT NULL,
    company_product_id bigint NOT NULL,
    is_active boolean NOT NULL,
    is_close_ended boolean NOT NULL,
    start_date date,
    end_date date,
    registrar_registrar_id integer
);

CREATE TABLE public.scheme_broker (
    org_id uuid NOT NULL,
    company_id integer NOT NULL,
    scheme_id bigint NOT NULL,
    broker_broker_id uuid NOT NULL,
    scheme_broker_id bigint NOT NULL
);

ALTER TABLE public.scheme_broker ALTER COLUMN scheme_broker_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.scheme_broker_scheme_broker_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

ALTER TABLE public.scheme ALTER COLUMN scheme_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.scheme_scheme_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.subscription_plans (
    plan_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    plan_name text NOT NULL,
    plan_type text NOT NULL,
    plan_cost_inr integer NOT NULL
);

CREATE TABLE public.task (
    org_id uuid NOT NULL,
    company_id integer NOT NULL,
    scheme_id bigint NOT NULL,
    task_id bigint NOT NULL,
    task_owner_user_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    task_name text NOT NULL,
    task_type text NOT NULL,
    task_query_type text NOT NULL,
    task_description text NOT NULL,
    task_create_timestamp timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE public.task ALTER COLUMN task_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.task_task_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.tasks_meta (
    tasks_meta_id bigint NOT NULL,
    task_task_id bigint NOT NULL,
    meta_key text NOT NULL,
    meta_value timestamp without time zone NOT NULL
);

ALTER TABLE public.tasks_meta ALTER COLUMN tasks_meta_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.tasks_meta_tasks_meta_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.transaction (
    org_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    transaction_id bigint NOT NULL,
    transaction_create_timestamp timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    transaction_date date NOT NULL,
    transaction_creator_user_id uuid NOT NULL,
    transaction_type text NOT NULL,
    joint_holder1 text,
    joint_holder2 text,
    guardian_name text,
    nominee1_name text,
    nominee2_name text,
    transaction_amount bigint NOT NULL,
    transaction_mode_id bigint NOT NULL,
    payment_mode text NOT NULL,
    cheque_utr_transaction_ref bigint NOT NULL,
    bank_name text,
    scheme_broker_scheme_broker_id bigint NOT NULL,
    scheme_broker_company_id integer NOT NULL,
    scheme_broker_scheme_id bigint NOT NULL,
    scheme_broker_broker_broker_id uuid NOT NULL,
    investment_duration text NOT NULL,
    folio_application_no text NOT NULL,
    transaction_notes text NOT NULL
);

CREATE TABLE public.transaction_mode (
    org_id uuid NOT NULL,
    transaction_mode_id bigint NOT NULL,
    transaction_mode text NOT NULL
);

ALTER TABLE public.transaction_mode ALTER COLUMN transaction_mode_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.transaction_mode_transaction_mode_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

ALTER TABLE public.transaction ALTER COLUMN transaction_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.transaction_transaction_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.user_roles (
    user_roles_id integer NOT NULL,
    role_type text NOT NULL
);

ALTER TABLE public.user_roles ALTER COLUMN user_roles_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.user_roles_user_roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

ALTER TABLE ONLY audit.activity_contact_log
    ADD CONSTRAINT activity_contact_log_pkey PRIMARY KEY (event_id);

ALTER TABLE ONLY audit.contact_property_log
    ADD CONSTRAINT contact_property_log_pkey PRIMARY KEY (event_id);

ALTER TABLE ONLY audit.other_activity_log
    ADD CONSTRAINT other_activity_log_pkey PRIMARY KEY (event_id);

ALTER TABLE ONLY public.broker
    ADD CONSTRAINT broker_pk PRIMARY KEY (org_id, broker_id);

ALTER TABLE ONLY public.call
    ADD CONSTRAINT call_pk PRIMARY KEY (org_id, contact_id, call_id);

ALTER TABLE ONLY public.city
    ADD CONSTRAINT city_pk PRIMARY KEY (city_id);

ALTER TABLE ONLY public.company
    ADD CONSTRAINT company_pk PRIMARY KEY (org_id, company_id);

ALTER TABLE ONLY public.company_product
    ADD CONSTRAINT company_product_pk PRIMARY KEY (org_id, company_id, company_product_id);

ALTER TABLE ONLY public.contact_correspondence
    ADD CONSTRAINT contact_correspondence_pk PRIMARY KEY (correspondence_id, org_id, contact_id);

ALTER TABLE ONLY public.contact
    ADD CONSTRAINT contact_pk PRIMARY KEY (org_id, contact_id);

ALTER TABLE ONLY public.contact_product_preference
    ADD CONSTRAINT contact_product_preference_pk PRIMARY KEY (preference_id);

ALTER TABLE ONLY public.contact_type
    ADD CONSTRAINT contact_type_pk PRIMARY KEY (org_id, contact_type_id);

ALTER TABLE ONLY public.deal
    ADD CONSTRAINT deal_pk PRIMARY KEY (org_id, contact_id, deal_id);

ALTER TABLE ONLY public.deal_scheme
    ADD CONSTRAINT deal_scheme_pk PRIMARY KEY (org_id, contact_id, deal_deal_id, scheme_company_id, deal_scheme_id);

ALTER TABLE ONLY public.deal_stage
    ADD CONSTRAINT deal_stage_pk PRIMARY KEY (org_id, deal_stage_id);

ALTER TABLE ONLY public.email
    ADD CONSTRAINT email_pk PRIMARY KEY (org_id, contact_id, email_id);

ALTER TABLE ONLY public.group_codes
    ADD CONSTRAINT group_codes_pk PRIMARY KEY (org_id, group_id);

ALTER TABLE ONLY public.meeting
    ADD CONSTRAINT meeting_pk PRIMARY KEY (org_id, contact_id, meeting_id);

ALTER TABLE ONLY public.note
    ADD CONSTRAINT note_pk PRIMARY KEY (org_id, contact_id, note_id);

ALTER TABLE ONLY public.org_details
    ADD CONSTRAINT org_details_org_name_key UNIQUE (org_name);

ALTER TABLE ONLY public.org_details
    ADD CONSTRAINT org_details_pk PRIMARY KEY (org_id);

ALTER TABLE ONLY public.org_user
    ADD CONSTRAINT org_user_pk PRIMARY KEY (org_id, user_id);

ALTER TABLE ONLY public.product
    ADD CONSTRAINT product_pk PRIMARY KEY (org_id, product_id);

ALTER TABLE ONLY public.profession
    ADD CONSTRAINT profession_pk PRIMARY KEY (profession_id);

ALTER TABLE ONLY public.registrar
    ADD CONSTRAINT registrar_pk PRIMARY KEY (registrar_id);

ALTER TABLE ONLY public.residence_status
    ADD CONSTRAINT residence_status_pk PRIMARY KEY (residence_status_id);

ALTER TABLE ONLY public.scheme_broker
    ADD CONSTRAINT scheme_broker_pk PRIMARY KEY (org_id, company_id, scheme_id, broker_broker_id, scheme_broker_id);

ALTER TABLE ONLY public.scheme
    ADD CONSTRAINT scheme_pk PRIMARY KEY (org_id, company_id, scheme_id);

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_pk PRIMARY KEY (plan_id);

ALTER TABLE ONLY public.task
    ADD CONSTRAINT task_pk PRIMARY KEY (task_id);

ALTER TABLE ONLY public.tasks_meta
    ADD CONSTRAINT tasks_meta_pk PRIMARY KEY (tasks_meta_id);

ALTER TABLE ONLY public.transaction_mode
    ADD CONSTRAINT transaction_mode_pk PRIMARY KEY (org_id, transaction_mode_id);

ALTER TABLE ONLY public.transaction
    ADD CONSTRAINT transaction_pk PRIMARY KEY (transaction_id);

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pk PRIMARY KEY (user_roles_id);

CREATE INDEX activity_contact_log_action_idx ON audit.activity_contact_log USING btree (action);

CREATE INDEX activity_contact_log_action_tstamp_idx ON audit.activity_contact_log USING btree (action_tstamp);

CREATE INDEX activity_contact_log_schema_table_idx ON audit.activity_contact_log USING btree ((((schema_name || '.'::text) || table_name)));

CREATE INDEX contact_property_log_action_idx ON audit.contact_property_log USING btree (action);

CREATE INDEX contact_property_log_action_tstamp_idx ON audit.contact_property_log USING btree (action_tstamp);

CREATE INDEX contact_property_log_schema_table_idx ON audit.contact_property_log USING btree ((((schema_name || '.'::text) || table_name)));

CREATE INDEX other_activity_log_action_idx ON audit.other_activity_log USING btree (action);

CREATE INDEX other_activity_log_action_tstamp_idx ON audit.other_activity_log USING btree (action_tstamp);

CREATE INDEX other_activity_log_schema_table_idx ON audit.other_activity_log USING btree ((((schema_name || '.'::text) || table_name)));

CREATE INDEX contact_search_idx ON public.contact USING gin (to_tsvector('english'::regconfig, ((first_name || ' '::text) || last_name)));

CREATE INDEX email_search_idx ON public.email USING gin (to_tsvector('english'::regconfig, COALESCE(email_description, ''::text)));

CREATE INDEX meeting_search_idx ON public.meeting USING gin (to_tsvector('english'::regconfig, COALESCE(meeting_description, ''::text)));

CREATE INDEX note_search_idx ON public.note USING gin (to_tsvector('english'::regconfig, COALESCE(note_description, ''::text)));

CREATE INDEX task_search_idx ON public.task USING gin (to_tsvector('english'::regconfig, ((COALESCE(task_name, ''::text) || ' '::text) || COALESCE(task_description))));

CREATE TRIGGER broker_if_modified_trg AFTER INSERT OR DELETE OR UPDATE ON public.broker FOR EACH ROW EXECUTE FUNCTION audit.if_other_modified_func();

CREATE TRIGGER call_if_modified_trg AFTER INSERT OR DELETE OR UPDATE ON public.call FOR EACH ROW EXECUTE FUNCTION audit.if_contact_activity_modified_func();

CREATE TRIGGER company_if_modified_trg AFTER INSERT OR DELETE OR UPDATE ON public.company FOR EACH ROW EXECUTE FUNCTION audit.if_other_modified_func();

CREATE TRIGGER company_product_if_modified_trg AFTER INSERT OR DELETE OR UPDATE ON public.company_product FOR EACH ROW EXECUTE FUNCTION audit.if_other_modified_func();

CREATE TRIGGER contact_correspondence_if_modified_trg AFTER INSERT OR DELETE OR UPDATE ON public.contact_correspondence FOR EACH ROW EXECUTE FUNCTION audit.if_contact_prop_modified_func();

CREATE TRIGGER contact_if_modified_trg AFTER INSERT OR DELETE OR UPDATE ON public.contact FOR EACH ROW EXECUTE FUNCTION audit.if_contact_prop_modified_func();

CREATE TRIGGER contact_product_preference_if_modified_trg AFTER INSERT OR DELETE OR UPDATE ON public.contact_product_preference FOR EACH ROW EXECUTE FUNCTION audit.if_contact_prop_modified_func();

CREATE TRIGGER deal_if_modified_trg AFTER INSERT OR DELETE OR UPDATE ON public.deal FOR EACH ROW EXECUTE FUNCTION audit.if_contact_activity_modified_func();

CREATE TRIGGER deal_scheme_if_modified_trg AFTER INSERT OR DELETE OR UPDATE ON public.deal_scheme FOR EACH ROW EXECUTE FUNCTION audit.if_contact_activity_modified_func();

CREATE TRIGGER deal_stage_if_modified_trg AFTER INSERT OR DELETE OR UPDATE ON public.deal_stage FOR EACH ROW EXECUTE FUNCTION audit.if_contact_activity_modified_func();

CREATE TRIGGER meeting_if_modified_trg AFTER INSERT OR DELETE OR UPDATE ON public.meeting FOR EACH ROW EXECUTE FUNCTION audit.if_contact_activity_modified_func();

CREATE TRIGGER note_if_modified_trg AFTER INSERT OR DELETE OR UPDATE ON public.note FOR EACH ROW EXECUTE FUNCTION audit.if_contact_activity_modified_func();

CREATE TRIGGER product_if_modified_trg AFTER INSERT OR DELETE OR UPDATE ON public.product FOR EACH ROW EXECUTE FUNCTION audit.if_other_modified_func();

CREATE TRIGGER scheme_broker_if_modified_trg AFTER INSERT OR DELETE OR UPDATE ON public.scheme_broker FOR EACH ROW EXECUTE FUNCTION audit.if_other_modified_func();

CREATE TRIGGER scheme_if_modified_trg AFTER INSERT OR DELETE OR UPDATE ON public.scheme FOR EACH ROW EXECUTE FUNCTION audit.if_other_modified_func();

CREATE TRIGGER task_if_modified_trg AFTER INSERT OR DELETE OR UPDATE ON public.task FOR EACH ROW EXECUTE FUNCTION audit.if_contact_activity_modified_func();

CREATE TRIGGER tasks_meta_if_modified_trg AFTER INSERT OR DELETE OR UPDATE ON public.tasks_meta FOR EACH ROW EXECUTE FUNCTION audit.if_contact_activity_modified_func();

CREATE TRIGGER transaction_if_modified_trg AFTER INSERT OR DELETE OR UPDATE ON public.transaction FOR EACH ROW EXECUTE FUNCTION audit.if_contact_activity_modified_func();

CREATE TRIGGER transaction_mode_if_modified_trg AFTER INSERT OR DELETE OR UPDATE ON public.transaction_mode FOR EACH ROW EXECUTE FUNCTION audit.if_other_modified_func();

ALTER TABLE ONLY public.broker
    ADD CONSTRAINT broker_org_details FOREIGN KEY (org_id) REFERENCES public.org_details(org_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.call
    ADD CONSTRAINT call_contact FOREIGN KEY (org_id, contact_id) REFERENCES public.contact(org_id, contact_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.call
    ADD CONSTRAINT call_org_user FOREIGN KEY (org_id, call_creator_user_id) REFERENCES public.org_user(org_id, user_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.company
    ADD CONSTRAINT company_org_details FOREIGN KEY (org_id) REFERENCES public.org_details(org_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.company_product
    ADD CONSTRAINT company_product_company FOREIGN KEY (org_id, company_id) REFERENCES public.company(org_id, company_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.company_product
    ADD CONSTRAINT company_product_product FOREIGN KEY (org_id, product_product_id) REFERENCES public.product(org_id, product_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.contact_correspondence
    ADD CONSTRAINT contact_address_city FOREIGN KEY (city_city_id) REFERENCES public.city(city_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.contact
    ADD CONSTRAINT contact_city FOREIGN KEY (birth_place_city_id) REFERENCES public.city(city_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.contact
    ADD CONSTRAINT contact_contact FOREIGN KEY (org_id, referred_by) REFERENCES public.contact(org_id, contact_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.contact_correspondence
    ADD CONSTRAINT contact_contact_correspondence FOREIGN KEY (org_id, contact_id) REFERENCES public.contact(org_id, contact_id);

ALTER TABLE ONLY public.contact
    ADD CONSTRAINT contact_contact_type FOREIGN KEY (org_id, contact_type) REFERENCES public.contact_type(org_id, contact_type_id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public.contact
    ADD CONSTRAINT contact_group_codes FOREIGN KEY (org_id, group_codes_group_id) REFERENCES public.group_codes(org_id, group_id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public.contact
    ADD CONSTRAINT contact_org_details FOREIGN KEY (org_id) REFERENCES public.org_details(org_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.contact
    ADD CONSTRAINT contact_org_user FOREIGN KEY (org_id, contact_owner) REFERENCES public.org_user(org_id, user_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.contact_product_preference
    ADD CONSTRAINT contact_product_preference_contact FOREIGN KEY (org_id, contact_id) REFERENCES public.contact(org_id, contact_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.contact_product_preference
    ADD CONSTRAINT contact_product_preference_product FOREIGN KEY (org_id, product_product_id) REFERENCES public.product(org_id, product_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.contact
    ADD CONSTRAINT contact_profession FOREIGN KEY (profession_profession_id) REFERENCES public.profession(profession_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.contact
    ADD CONSTRAINT contact_residence_status FOREIGN KEY (residence_status_residence_status_id) REFERENCES public.residence_status(residence_status_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.deal
    ADD CONSTRAINT deal_contact FOREIGN KEY (org_id, contact_id) REFERENCES public.contact(org_id, contact_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.deal
    ADD CONSTRAINT deal_deal_stage FOREIGN KEY (org_id, deal_stage_deal_stage_id) REFERENCES public.deal_stage(org_id, deal_stage_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.deal
    ADD CONSTRAINT deal_org_user FOREIGN KEY (org_id, deal_creator_user_id) REFERENCES public.org_user(org_id, user_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.deal_scheme
    ADD CONSTRAINT deal_scheme_deal FOREIGN KEY (org_id, contact_id, deal_deal_id) REFERENCES public.deal(org_id, contact_id, deal_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.deal_scheme
    ADD CONSTRAINT deal_scheme_scheme FOREIGN KEY (org_id, scheme_company_id, scheme_scheme_id) REFERENCES public.scheme(org_id, company_id, scheme_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.deal_stage
    ADD CONSTRAINT deal_stage_org_details FOREIGN KEY (org_id) REFERENCES public.org_details(org_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.email
    ADD CONSTRAINT email_contact FOREIGN KEY (org_id, contact_id) REFERENCES public.contact(org_id, contact_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.email
    ADD CONSTRAINT email_org_user FOREIGN KEY (org_id, email_creator_user_id) REFERENCES public.org_user(org_id, user_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.group_codes
    ADD CONSTRAINT group_codes_org_details FOREIGN KEY (org_id) REFERENCES public.org_details(org_id);

ALTER TABLE ONLY public.meeting
    ADD CONSTRAINT meeting_contact FOREIGN KEY (org_id, contact_id) REFERENCES public.contact(org_id, contact_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.meeting
    ADD CONSTRAINT meeting_org_user FOREIGN KEY (org_id, meeting_creator_user_id) REFERENCES public.org_user(org_id, user_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.note
    ADD CONSTRAINT note_contact FOREIGN KEY (org_id, contact_id) REFERENCES public.contact(org_id, contact_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.note
    ADD CONSTRAINT note_org_user FOREIGN KEY (org_id, note_creator_user_id) REFERENCES public.org_user(org_id, user_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.org_details
    ADD CONSTRAINT org_details_subscription_plans FOREIGN KEY (subscription_plans_plan_id) REFERENCES public.subscription_plans(plan_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.product
    ADD CONSTRAINT product_org_details FOREIGN KEY (org_id) REFERENCES public.org_details(org_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.scheme_broker
    ADD CONSTRAINT scheme_broker_broker FOREIGN KEY (org_id, broker_broker_id) REFERENCES public.broker(org_id, broker_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.scheme_broker
    ADD CONSTRAINT scheme_broker_scheme FOREIGN KEY (org_id, company_id, scheme_id) REFERENCES public.scheme(org_id, company_id, scheme_id);

ALTER TABLE ONLY public.scheme
    ADD CONSTRAINT scheme_company_product FOREIGN KEY (org_id, company_id, company_product_id) REFERENCES public.company_product(org_id, company_id, company_product_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.scheme
    ADD CONSTRAINT scheme_registrar FOREIGN KEY (registrar_registrar_id) REFERENCES public.registrar(registrar_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.task
    ADD CONSTRAINT task_contact FOREIGN KEY (org_id, contact_id) REFERENCES public.contact(org_id, contact_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.task
    ADD CONSTRAINT task_org_user FOREIGN KEY (org_id, task_owner_user_id) REFERENCES public.org_user(org_id, user_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.task
    ADD CONSTRAINT task_scheme FOREIGN KEY (org_id, company_id, scheme_id) REFERENCES public.scheme(org_id, company_id, scheme_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.tasks_meta
    ADD CONSTRAINT tasks_meta_task FOREIGN KEY (task_task_id) REFERENCES public.task(task_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.transaction
    ADD CONSTRAINT transaction_contact FOREIGN KEY (org_id, contact_id) REFERENCES public.contact(org_id, contact_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.transaction_mode
    ADD CONSTRAINT transaction_mode_org_details FOREIGN KEY (org_id) REFERENCES public.org_details(org_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.transaction
    ADD CONSTRAINT transaction_org_user FOREIGN KEY (org_id, transaction_creator_user_id) REFERENCES public.org_user(org_id, user_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.transaction
    ADD CONSTRAINT transaction_scheme_broker FOREIGN KEY (org_id, scheme_broker_company_id, scheme_broker_scheme_id, scheme_broker_broker_broker_id, scheme_broker_scheme_broker_id) REFERENCES public.scheme_broker(org_id, company_id, scheme_id, broker_broker_id, scheme_broker_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.transaction
    ADD CONSTRAINT transaction_transaction_mode FOREIGN KEY (org_id, transaction_mode_id) REFERENCES public.transaction_mode(org_id, transaction_mode_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.org_user
    ADD CONSTRAINT user_org_details FOREIGN KEY (org_id) REFERENCES public.org_details(org_id) ON UPDATE CASCADE;

ALTER TABLE ONLY public.org_user
    ADD CONSTRAINT user_user_roles FOREIGN KEY (user_roles_user_roles_id) REFERENCES public.user_roles(user_roles_id) ON UPDATE CASCADE;

ALTER TABLE audit.activity_contact_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE audit.contact_property_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE audit.other_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON audit.activity_contact_log FOR SELECT USING ((org_id = current_setting('app.current_tenant'::text)));

CREATE POLICY tenant_isolation_policy ON audit.contact_property_log FOR SELECT USING ((org_id = current_setting('app.current_tenant'::text)));

CREATE POLICY tenant_isolation_policy ON audit.other_activity_log FOR SELECT USING ((org_id = current_setting('app.current_tenant'::text)));

ALTER TABLE public.broker ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.call ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.company ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.company_product ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.contact ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.contact_correspondence ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.contact_product_preference ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.contact_type ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.deal ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.deal_scheme ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.deal_stage ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.email ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.group_codes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.meeting ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.note ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.org_details ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.org_user ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.product ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.scheme ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.scheme_broker ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.task ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON public.broker USING ((org_id = (current_setting('app.current_tenant'::text))::uuid));

CREATE POLICY tenant_isolation_policy ON public.call USING ((org_id = (current_setting('app.current_tenant'::text))::uuid));

CREATE POLICY tenant_isolation_policy ON public.company USING ((org_id = (current_setting('app.current_tenant'::text))::uuid));

CREATE POLICY tenant_isolation_policy ON public.company_product USING ((org_id = (current_setting('app.current_tenant'::text))::uuid));

CREATE POLICY tenant_isolation_policy ON public.contact USING ((org_id = (current_setting('app.current_tenant'::text))::uuid));

CREATE POLICY tenant_isolation_policy ON public.contact_correspondence USING ((org_id = (current_setting('app.current_tenant'::text))::uuid));

CREATE POLICY tenant_isolation_policy ON public.contact_product_preference USING ((org_id = (current_setting('app.current_tenant'::text))::uuid));

CREATE POLICY tenant_isolation_policy ON public.contact_type USING ((org_id = (current_setting('app.current_tenant'::text))::uuid));

CREATE POLICY tenant_isolation_policy ON public.deal USING ((org_id = (current_setting('app.current_tenant'::text))::uuid));

CREATE POLICY tenant_isolation_policy ON public.deal_scheme USING ((org_id = (current_setting('app.current_tenant'::text))::uuid));

CREATE POLICY tenant_isolation_policy ON public.deal_stage USING ((org_id = (current_setting('app.current_tenant'::text))::uuid));

CREATE POLICY tenant_isolation_policy ON public.email USING ((org_id = (current_setting('app.current_tenant'::text))::uuid));

CREATE POLICY tenant_isolation_policy ON public.group_codes USING ((org_id = (current_setting('app.current_tenant'::text))::uuid));

CREATE POLICY tenant_isolation_policy ON public.meeting USING ((org_id = (current_setting('app.current_tenant'::text))::uuid));

CREATE POLICY tenant_isolation_policy ON public.note USING ((org_id = (current_setting('app.current_tenant'::text))::uuid));

CREATE POLICY tenant_isolation_policy ON public.org_details USING ((org_id = (current_setting('app.current_tenant'::text))::uuid));

CREATE POLICY tenant_isolation_policy ON public.org_user USING ((org_id = (current_setting('app.current_tenant'::text))::uuid));

CREATE POLICY tenant_isolation_policy ON public.product USING ((org_id = (current_setting('app.current_tenant'::text))::uuid));

CREATE POLICY tenant_isolation_policy ON public.scheme USING ((org_id = (current_setting('app.current_tenant'::text))::uuid));

CREATE POLICY tenant_isolation_policy ON public.scheme_broker USING ((org_id = (current_setting('app.current_tenant'::text))::uuid));

CREATE POLICY tenant_isolation_policy ON public.task USING ((org_id = (current_setting('app.current_tenant'::text))::uuid));

CREATE POLICY tenant_isolation_policy ON public.transaction USING ((org_id = (current_setting('app.current_tenant'::text))::uuid));

CREATE POLICY tenant_isolation_policy ON public.transaction_mode USING ((org_id = (current_setting('app.current_tenant'::text))::uuid));

ALTER TABLE public.transaction ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.transaction_mode ENABLE ROW LEVEL SECURITY;

--
-- Privileges for the application's tenant role.
--
-- plutus_tenant owns nothing and has BYPASSRLS = false, so the policies above
-- genuinely bind for it. Privileges are not what scope its access to one org;
-- the policies are. Guarded so the migration still applies on a database where
-- the role is absent, such as a throwaway branch used to try out a schema change.
--

DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'plutus_tenant') THEN
    GRANT USAGE ON SCHEMA public TO plutus_tenant;
    GRANT USAGE ON SCHEMA audit TO plutus_tenant;

    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO plutus_tenant;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO plutus_tenant;

    -- Audit tables are append-only from triggers. Their policies are FOR SELECT
    -- only, so INSERT is denied to this role regardless of this grant; the trigger
    -- functions are SECURITY DEFINER and write as the owner.
    GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA audit TO plutus_tenant;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA audit TO plutus_tenant;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA audit TO plutus_tenant;

    -- So a table added by a later migration is reachable without a matching
    -- grant having to be remembered.
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO plutus_tenant;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT USAGE, SELECT ON SEQUENCES TO plutus_tenant;
  END IF;
END
$do$;

-- Down Migration

-- Irreversible on purpose. Rolling this back means dropping every table and the
-- data in them, which is never the right answer to a bad deploy. Schema changes
-- roll forward: add a new migration.
SELECT 1;
