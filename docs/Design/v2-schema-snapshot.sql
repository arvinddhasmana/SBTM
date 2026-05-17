--
-- PostgreSQL database dump
--

-- Dumped from database version 15.4
-- Dumped by pg_dump version 15.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';


--
-- Name: identity_provider_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.identity_provider_enum AS ENUM (
    'local',
    'oidc:ocsb',
    'oidc:ocdsb'
);


--
-- Name: stx_absence_route_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stx_absence_route_type_enum AS ENUM (
    'AM',
    'PM',
    'BOTH'
);


--
-- Name: stx_absence_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stx_absence_status_enum AS ENUM (
    'pending',
    'confirmed',
    'rejected',
    'cancelled'
);


--
-- Name: stx_agency_kind_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stx_agency_kind_enum AS ENUM (
    'sta',
    'board',
    'operator'
);


--
-- Name: stx_alert_category_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stx_alert_category_enum AS ENUM (
    'route_cancelled',
    'route_delayed',
    'route_deviation',
    'safety',
    'weather',
    'general'
);


--
-- Name: stx_alert_channel_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stx_alert_channel_enum AS ENUM (
    'push',
    'sms',
    'email',
    'in_app'
);


--
-- Name: stx_alert_delivery_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stx_alert_delivery_status_enum AS ENUM (
    'queued',
    'sent',
    'delivered',
    'failed',
    'suppressed'
);


--
-- Name: stx_alert_scope_kind_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stx_alert_scope_kind_enum AS ENUM (
    'sta',
    'board',
    'school',
    'route',
    'trip',
    'run',
    'stop',
    'student'
);


--
-- Name: stx_alert_severity_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stx_alert_severity_enum AS ENUM (
    'info',
    'warning',
    'critical'
);


--
-- Name: stx_alert_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stx_alert_status_enum AS ENUM (
    'draft',
    'active',
    'resolved',
    'cancelled',
    'expired'
);


--
-- Name: stx_boarding_event_kind_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stx_boarding_event_kind_enum AS ENUM (
    'boarded',
    'alighted',
    'no_show',
    'boarded_at_alt_stop',
    'refused'
);


--
-- Name: stx_boarding_event_source_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stx_boarding_event_source_enum AS ENUM (
    'driver_app',
    'rfid',
    'smarttag'
);


--
-- Name: stx_direction_kind_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stx_direction_kind_enum AS ENUM (
    'am',
    'pm',
    'midday',
    'kindergarten',
    'activity'
);


--
-- Name: stx_eligibility_direction_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stx_eligibility_direction_enum AS ENUM (
    'am',
    'pm',
    'midday'
);


--
-- Name: stx_eligibility_kind_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stx_eligibility_kind_enum AS ENUM (
    'mandatory',
    'courtesy',
    'hazard_exemption',
    'medical',
    'none'
);


--
-- Name: stx_ridership_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stx_ridership_status_enum AS ENUM (
    'active',
    'pending',
    'revoked'
);


--
-- Name: stx_run_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stx_run_status_enum AS ENUM (
    'scheduled',
    'in_progress',
    'completed',
    'cancelled',
    'delayed'
);


--
-- Name: stx_shape_source_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stx_shape_source_enum AS ENUM (
    'sta_import',
    'sbtm_generated',
    'sta_admin_edited'
);


--
-- Name: stx_stop_kind_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stx_stop_kind_enum AS ENUM (
    'pickup',
    'school',
    'transfer',
    'daycare',
    'hazard_relocation'
);


--
-- Name: stx_student_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stx_student_status_enum AS ENUM (
    'enrolled',
    'inactive',
    'graduated',
    'withdrawn'
);


--
-- Name: stx_vehicle_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stx_vehicle_status_enum AS ENUM (
    'active',
    'maintenance',
    'inactive'
);


--
-- Name: users_role_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.users_role_enum AS ENUM (
    'SUPER_ADMIN',
    'STA_ADMIN',
    'BOARD_ADMIN',
    'SCHOOL_ADMIN',
    'OPERATOR_ADMIN',
    'DRIVER',
    'PARENT'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: agency; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agency (
    agency_id text NOT NULL,
    agency_name text NOT NULL,
    agency_url text NOT NULL,
    agency_timezone text DEFAULT 'America/Toronto'::text NOT NULL,
    agency_lang text,
    agency_phone text,
    agency_email text,
    stx_agency_kind public.stx_agency_kind_enum NOT NULL,
    stx_parent_agency_id text,
    stx_sta_id uuid,
    stx_board_id uuid,
    stx_operator_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: attributions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attributions (
    attribution_id text NOT NULL,
    organization_name text NOT NULL,
    is_producer boolean DEFAULT false NOT NULL,
    is_operator boolean DEFAULT false NOT NULL,
    is_authority boolean DEFAULT false NOT NULL,
    attribution_url text,
    attribution_email text,
    attribution_phone text
);


--
-- Name: calendar; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar (
    service_id text NOT NULL,
    monday boolean DEFAULT false NOT NULL,
    tuesday boolean DEFAULT false NOT NULL,
    wednesday boolean DEFAULT false NOT NULL,
    thursday boolean DEFAULT false NOT NULL,
    friday boolean DEFAULT false NOT NULL,
    saturday boolean DEFAULT false NOT NULL,
    sunday boolean DEFAULT false NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL
);


--
-- Name: calendar_dates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_dates (
    service_id text NOT NULL,
    exception_date date NOT NULL,
    exception_type integer NOT NULL,
    CONSTRAINT calendar_dates_exception_type_check CHECK ((exception_type = ANY (ARRAY[1, 2])))
);


--
-- Name: feed_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feed_info (
    feed_publisher_name text NOT NULL,
    feed_publisher_url text NOT NULL,
    feed_lang text DEFAULT 'en'::text NOT NULL,
    feed_start_date date,
    feed_end_date date,
    feed_version text,
    feed_contact_email text
);


--
-- Name: routes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.routes (
    route_id text NOT NULL,
    agency_id text,
    route_short_name text,
    route_long_name text,
    route_type integer DEFAULT 712 NOT NULL,
    route_color text,
    route_text_color text,
    stx_sta_id uuid NOT NULL,
    stx_school_id uuid NOT NULL,
    stx_direction_kind public.stx_direction_kind_enum NOT NULL,
    stx_shape_source public.stx_shape_source_enum DEFAULT 'sta_import'::public.stx_shape_source_enum NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: shapes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shapes (
    shape_id text NOT NULL,
    shape_pt_lat double precision NOT NULL,
    shape_pt_lon double precision NOT NULL,
    shape_pt_sequence integer NOT NULL,
    shape_dist_traveled double precision
);


--
-- Name: stop_times; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stop_times (
    trip_id text NOT NULL,
    stop_sequence integer NOT NULL,
    arrival_time text NOT NULL,
    departure_time text NOT NULL,
    stop_id text NOT NULL,
    pickup_type integer DEFAULT 0 NOT NULL,
    drop_off_type integer DEFAULT 0 NOT NULL,
    stx_dwell_seconds integer
);


--
-- Name: stops; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stops (
    stop_id text NOT NULL,
    stop_name text NOT NULL,
    stop_lat double precision NOT NULL,
    stop_lon double precision NOT NULL,
    location_type integer DEFAULT 0 NOT NULL,
    parent_station text,
    stx_stop_kind public.stx_stop_kind_enum DEFAULT 'pickup'::public.stx_stop_kind_enum NOT NULL,
    stx_hazard_zone boolean DEFAULT false NOT NULL,
    stx_school_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stx_alert_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stx_alert_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alert_id uuid NOT NULL,
    action text NOT NULL,
    actor_user_id uuid,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stx_alert_deliveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stx_alert_deliveries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alert_id uuid NOT NULL,
    user_id uuid NOT NULL,
    channel public.stx_alert_channel_enum NOT NULL,
    status public.stx_alert_delivery_status_enum DEFAULT 'queued'::public.stx_alert_delivery_status_enum NOT NULL,
    attempted_at timestamp with time zone,
    delivered_at timestamp with time zone,
    error_text text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stx_alert_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stx_alert_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    scope_kind public.stx_alert_scope_kind_enum NOT NULL,
    scope_ref text NOT NULL,
    channels public.stx_alert_channel_enum[] DEFAULT ARRAY['push'::public.stx_alert_channel_enum] NOT NULL,
    muted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stx_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stx_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sta_id uuid NOT NULL,
    category public.stx_alert_category_enum NOT NULL,
    severity public.stx_alert_severity_enum DEFAULT 'info'::public.stx_alert_severity_enum NOT NULL,
    scope_kind public.stx_alert_scope_kind_enum NOT NULL,
    scope_ref text NOT NULL,
    title text NOT NULL,
    body text,
    status public.stx_alert_status_enum DEFAULT 'active'::public.stx_alert_status_enum NOT NULL,
    starts_at timestamp with time zone DEFAULT now() NOT NULL,
    ends_at timestamp with time zone,
    service_date date,
    created_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stx_bell_schedule_dates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stx_bell_schedule_dates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bell_schedule_id uuid NOT NULL,
    school_id uuid,
    service_date date NOT NULL,
    am_bell time without time zone,
    midday_bell time without time zone,
    pm_bell time without time zone,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stx_bell_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stx_bell_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    board_id uuid NOT NULL,
    code text NOT NULL,
    description text,
    am_bell time without time zone,
    midday_bell time without time zone,
    pm_bell time without time zone,
    kindergarten_am_bell time without time zone,
    kindergarten_pm_bell time without time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: stx_boarding_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stx_boarding_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    run_id uuid NOT NULL,
    stop_id text NOT NULL,
    student_id uuid NOT NULL,
    event_kind public.stx_boarding_event_kind_enum NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    recorded_by_driver_id uuid,
    source public.stx_boarding_event_source_enum DEFAULT 'driver_app'::public.stx_boarding_event_source_enum NOT NULL,
    location public.geography(Point,4326),
    notes text
);


--
-- Name: stx_boards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stx_boards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sta_id uuid NOT NULL,
    name text NOT NULL,
    short_code text NOT NULL,
    region text,
    language text DEFAULT 'en'::text NOT NULL,
    external_ids jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: stx_calendar_link; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stx_calendar_link (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_id text NOT NULL,
    board_id uuid,
    school_id uuid,
    CONSTRAINT stx_calendar_link_check CHECK (((board_id IS NOT NULL) OR (school_id IS NOT NULL)))
);


--
-- Name: stx_drivers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stx_drivers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    operator_id uuid NOT NULL,
    user_id uuid,
    license_number bytea,
    license_class text,
    license_expiry date,
    medical_expiry date,
    background_check_date date,
    external_ids jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: stx_eligibility; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stx_eligibility (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    direction public.stx_eligibility_direction_enum NOT NULL,
    eligibility_kind public.stx_eligibility_kind_enum NOT NULL,
    effective_from date NOT NULL,
    effective_to date,
    approved_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stx_guardians; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stx_guardians (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    legal_name bytea NOT NULL,
    email bytea,
    phone bytea,
    preferred_language text DEFAULT 'en'::text NOT NULL,
    external_ids jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: stx_operator_contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stx_operator_contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    operator_id uuid NOT NULL,
    sta_id uuid NOT NULL,
    board_id uuid,
    effective_from date NOT NULL,
    effective_to date,
    route_count integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: stx_operators; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stx_operators (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    legal_name text NOT NULL,
    trade_name text,
    contact_email text,
    contact_phone text,
    external_ids jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: stx_ridership; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stx_ridership (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    trip_id text NOT NULL,
    stop_id text NOT NULL,
    direction_id integer DEFAULT 0 NOT NULL,
    effective_from date NOT NULL,
    effective_to date,
    status public.stx_ridership_status_enum DEFAULT 'active'::public.stx_ridership_status_enum NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stx_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stx_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_date date NOT NULL,
    trip_ids text[] NOT NULL,
    vehicle_id uuid NOT NULL,
    driver_id uuid NOT NULL,
    backup_driver_id uuid,
    status public.stx_run_status_enum DEFAULT 'scheduled'::public.stx_run_status_enum NOT NULL,
    cancellation_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: stx_schools; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stx_schools (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    board_id uuid NOT NULL,
    name text NOT NULL,
    address text,
    location public.geography(Point,4326),
    time_zone text DEFAULT 'America/Toronto'::text NOT NULL,
    bell_schedule_id uuid,
    alerts_enabled boolean DEFAULT true NOT NULL,
    external_ids jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: stx_sta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stx_sta (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    short_code text NOT NULL,
    region text,
    time_zone text DEFAULT 'America/Toronto'::text NOT NULL,
    languages text[] DEFAULT ARRAY['en'::text] NOT NULL,
    boarding_event_retention_days integer DEFAULT 395 NOT NULL,
    alert_retention_days integer DEFAULT 730 NOT NULL,
    import_cadence text DEFAULT 'quarterly'::text NOT NULL,
    external_ids jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: stx_student_absences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stx_student_absences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    trip_date date NOT NULL,
    route_type public.stx_absence_route_type_enum NOT NULL,
    confirmation_status public.stx_absence_status_enum DEFAULT 'pending'::public.stx_absence_status_enum NOT NULL,
    reported_by_user_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stx_student_guardians; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stx_student_guardians (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    guardian_id uuid NOT NULL,
    relationship text NOT NULL,
    is_primary_pickup boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stx_students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stx_students (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id uuid NOT NULL,
    board_student_number bytea,
    legal_name bytea NOT NULL,
    preferred_name bytea,
    grade text,
    date_of_birth bytea,
    home_address bytea,
    home_location public.geography(Point,4326),
    status public.stx_student_status_enum DEFAULT 'enrolled'::public.stx_student_status_enum NOT NULL,
    medical_flags jsonb DEFAULT '{}'::jsonb NOT NULL,
    transport_flags jsonb DEFAULT '{}'::jsonb NOT NULL,
    external_ids jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: stx_vehicles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stx_vehicles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    operator_id uuid NOT NULL,
    license_plate text NOT NULL,
    capacity_seated integer,
    capacity_wheelchair integer,
    equipment jsonb DEFAULT '{}'::jsonb NOT NULL,
    status public.stx_vehicle_status_enum DEFAULT 'active'::public.stx_vehicle_status_enum NOT NULL,
    external_ids jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: translations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.translations (
    table_name text NOT NULL,
    field_name text NOT NULL,
    language text NOT NULL,
    translation text NOT NULL,
    record_id text DEFAULT ''::text NOT NULL,
    record_sub_id text DEFAULT ''::text NOT NULL,
    field_value text DEFAULT ''::text NOT NULL
);


--
-- Name: trips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trips (
    trip_id text NOT NULL,
    route_id text NOT NULL,
    service_id text NOT NULL,
    shape_id text,
    trip_headsign text,
    direction_id integer DEFAULT 0 NOT NULL,
    block_id text,
    stx_run_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    "passwordHash" text,
    role public.users_role_enum DEFAULT 'PARENT'::public.users_role_enum NOT NULL,
    "firstName" text,
    "lastName" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "invitationToken" text,
    "invitationExpiresAt" timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    identity_provider public.identity_provider_enum DEFAULT 'local'::public.identity_provider_enum NOT NULL,
    preferred_language text DEFAULT 'en'::text NOT NULL,
    anchor_kind text,
    anchor_id uuid
);


--
-- Name: agency agency_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agency
    ADD CONSTRAINT agency_pkey PRIMARY KEY (agency_id);


--
-- Name: attributions attributions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attributions
    ADD CONSTRAINT attributions_pkey PRIMARY KEY (attribution_id);


--
-- Name: calendar_dates calendar_dates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_dates
    ADD CONSTRAINT calendar_dates_pkey PRIMARY KEY (service_id, exception_date);


--
-- Name: calendar calendar_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar
    ADD CONSTRAINT calendar_pkey PRIMARY KEY (service_id);


--
-- Name: feed_info feed_info_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feed_info
    ADD CONSTRAINT feed_info_pkey PRIMARY KEY (feed_publisher_name);


--
-- Name: routes routes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_pkey PRIMARY KEY (route_id);


--
-- Name: shapes shapes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shapes
    ADD CONSTRAINT shapes_pkey PRIMARY KEY (shape_id, shape_pt_sequence);


--
-- Name: stop_times stop_times_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stop_times
    ADD CONSTRAINT stop_times_pkey PRIMARY KEY (trip_id, stop_sequence);


--
-- Name: stops stops_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stops
    ADD CONSTRAINT stops_pkey PRIMARY KEY (stop_id);


--
-- Name: stx_alert_audit stx_alert_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_alert_audit
    ADD CONSTRAINT stx_alert_audit_pkey PRIMARY KEY (id);


--
-- Name: stx_alert_deliveries stx_alert_deliveries_alert_id_user_id_channel_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_alert_deliveries
    ADD CONSTRAINT stx_alert_deliveries_alert_id_user_id_channel_key UNIQUE (alert_id, user_id, channel);


--
-- Name: stx_alert_deliveries stx_alert_deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_alert_deliveries
    ADD CONSTRAINT stx_alert_deliveries_pkey PRIMARY KEY (id);


--
-- Name: stx_alert_subscriptions stx_alert_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_alert_subscriptions
    ADD CONSTRAINT stx_alert_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: stx_alert_subscriptions stx_alert_subscriptions_user_id_scope_kind_scope_ref_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_alert_subscriptions
    ADD CONSTRAINT stx_alert_subscriptions_user_id_scope_kind_scope_ref_key UNIQUE (user_id, scope_kind, scope_ref);


--
-- Name: stx_alerts stx_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_alerts
    ADD CONSTRAINT stx_alerts_pkey PRIMARY KEY (id);


--
-- Name: stx_bell_schedule_dates stx_bell_schedule_dates_bell_schedule_id_school_id_service__key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_bell_schedule_dates
    ADD CONSTRAINT stx_bell_schedule_dates_bell_schedule_id_school_id_service__key UNIQUE (bell_schedule_id, school_id, service_date);


--
-- Name: stx_bell_schedule_dates stx_bell_schedule_dates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_bell_schedule_dates
    ADD CONSTRAINT stx_bell_schedule_dates_pkey PRIMARY KEY (id);


--
-- Name: stx_bell_schedules stx_bell_schedules_board_id_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_bell_schedules
    ADD CONSTRAINT stx_bell_schedules_board_id_code_key UNIQUE (board_id, code);


--
-- Name: stx_bell_schedules stx_bell_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_bell_schedules
    ADD CONSTRAINT stx_bell_schedules_pkey PRIMARY KEY (id);


--
-- Name: stx_boarding_events stx_boarding_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_boarding_events
    ADD CONSTRAINT stx_boarding_events_pkey PRIMARY KEY (id);


--
-- Name: stx_boards stx_boards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_boards
    ADD CONSTRAINT stx_boards_pkey PRIMARY KEY (id);


--
-- Name: stx_boards stx_boards_sta_id_short_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_boards
    ADD CONSTRAINT stx_boards_sta_id_short_code_key UNIQUE (sta_id, short_code);


--
-- Name: stx_calendar_link stx_calendar_link_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_calendar_link
    ADD CONSTRAINT stx_calendar_link_pkey PRIMARY KEY (id);


--
-- Name: stx_drivers stx_drivers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_drivers
    ADD CONSTRAINT stx_drivers_pkey PRIMARY KEY (id);


--
-- Name: stx_eligibility stx_eligibility_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_eligibility
    ADD CONSTRAINT stx_eligibility_pkey PRIMARY KEY (id);


--
-- Name: stx_guardians stx_guardians_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_guardians
    ADD CONSTRAINT stx_guardians_pkey PRIMARY KEY (id);


--
-- Name: stx_operator_contracts stx_operator_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_operator_contracts
    ADD CONSTRAINT stx_operator_contracts_pkey PRIMARY KEY (id);


--
-- Name: stx_operators stx_operators_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_operators
    ADD CONSTRAINT stx_operators_pkey PRIMARY KEY (id);


--
-- Name: stx_ridership stx_ridership_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_ridership
    ADD CONSTRAINT stx_ridership_pkey PRIMARY KEY (id);


--
-- Name: stx_runs stx_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_runs
    ADD CONSTRAINT stx_runs_pkey PRIMARY KEY (id);


--
-- Name: stx_schools stx_schools_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_schools
    ADD CONSTRAINT stx_schools_pkey PRIMARY KEY (id);


--
-- Name: stx_sta stx_sta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_sta
    ADD CONSTRAINT stx_sta_pkey PRIMARY KEY (id);


--
-- Name: stx_sta stx_sta_short_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_sta
    ADD CONSTRAINT stx_sta_short_code_key UNIQUE (short_code);


--
-- Name: stx_student_absences stx_student_absences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_student_absences
    ADD CONSTRAINT stx_student_absences_pkey PRIMARY KEY (id);


--
-- Name: stx_student_guardians stx_student_guardians_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_student_guardians
    ADD CONSTRAINT stx_student_guardians_pkey PRIMARY KEY (id);


--
-- Name: stx_student_guardians stx_student_guardians_student_id_guardian_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_student_guardians
    ADD CONSTRAINT stx_student_guardians_student_id_guardian_id_key UNIQUE (student_id, guardian_id);


--
-- Name: stx_students stx_students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_students
    ADD CONSTRAINT stx_students_pkey PRIMARY KEY (id);


--
-- Name: stx_vehicles stx_vehicles_operator_id_license_plate_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_vehicles
    ADD CONSTRAINT stx_vehicles_operator_id_license_plate_key UNIQUE (operator_id, license_plate);


--
-- Name: stx_vehicles stx_vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_vehicles
    ADD CONSTRAINT stx_vehicles_pkey PRIMARY KEY (id);


--
-- Name: translations translations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.translations
    ADD CONSTRAINT translations_pkey PRIMARY KEY (table_name, field_name, language, record_id, record_sub_id, field_value);


--
-- Name: trips trips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_pkey PRIMARY KEY (trip_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_invitationToken_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "users_invitationToken_key" UNIQUE ("invitationToken");


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_absences_student_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_absences_student_date ON public.stx_student_absences USING btree (student_id, trip_date);


--
-- Name: idx_agency_sta; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agency_sta ON public.agency USING btree (stx_sta_id);


--
-- Name: idx_alert_audit_alert; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alert_audit_alert ON public.stx_alert_audit USING btree (alert_id, created_at DESC);


--
-- Name: idx_alert_deliv_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alert_deliv_user ON public.stx_alert_deliveries USING btree (user_id, created_at DESC);


--
-- Name: idx_alert_subs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alert_subs_user ON public.stx_alert_subscriptions USING btree (user_id);


--
-- Name: idx_alerts_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alerts_scope ON public.stx_alerts USING btree (scope_kind, scope_ref);


--
-- Name: idx_alerts_sta_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alerts_sta_active ON public.stx_alerts USING btree (sta_id, status, starts_at DESC);


--
-- Name: idx_boarding_run; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_boarding_run ON public.stx_boarding_events USING btree (run_id, recorded_at);


--
-- Name: idx_boarding_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_boarding_student ON public.stx_boarding_events USING btree (student_id, recorded_at);


--
-- Name: idx_calendar_link_board; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_link_board ON public.stx_calendar_link USING btree (board_id);


--
-- Name: idx_calendar_link_school; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_link_school ON public.stx_calendar_link USING btree (school_id);


--
-- Name: idx_drivers_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drivers_user ON public.stx_drivers USING btree (user_id);


--
-- Name: idx_eligibility_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eligibility_student ON public.stx_eligibility USING btree (student_id);


--
-- Name: idx_guardians_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_guardians_user ON public.stx_guardians USING btree (user_id);


--
-- Name: idx_ridership_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ridership_student ON public.stx_ridership USING btree (student_id);


--
-- Name: idx_ridership_trip_stop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ridership_trip_stop ON public.stx_ridership USING btree (trip_id, stop_id);


--
-- Name: idx_routes_school; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_routes_school ON public.routes USING btree (stx_school_id);


--
-- Name: idx_routes_sta; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_routes_sta ON public.routes USING btree (stx_sta_id);


--
-- Name: idx_runs_driver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_runs_driver ON public.stx_runs USING btree (driver_id, service_date);


--
-- Name: idx_runs_service_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_runs_service_date ON public.stx_runs USING btree (service_date);


--
-- Name: idx_runs_vehicle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_runs_vehicle ON public.stx_runs USING btree (vehicle_id, service_date);


--
-- Name: idx_sg_guardian; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sg_guardian ON public.stx_student_guardians USING btree (guardian_id);


--
-- Name: idx_sg_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sg_student ON public.stx_student_guardians USING btree (student_id);


--
-- Name: idx_shapes_shape; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shapes_shape ON public.shapes USING btree (shape_id);


--
-- Name: idx_stop_times_stop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stop_times_stop ON public.stop_times USING btree (stop_id);


--
-- Name: idx_stops_school; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stops_school ON public.stops USING btree (stx_school_id);


--
-- Name: idx_students_school; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_school ON public.stx_students USING btree (school_id);


--
-- Name: idx_trips_route; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trips_route ON public.trips USING btree (route_id);


--
-- Name: idx_trips_run; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trips_run ON public.trips USING btree (stx_run_id);


--
-- Name: uniq_operators_legal_entity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_operators_legal_entity_id ON public.stx_operators USING btree (((external_ids ->> 'legal_entity_id'::text))) WHERE (external_ids ? 'legal_entity_id'::text);


--
-- Name: agency agency_stx_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agency
    ADD CONSTRAINT agency_stx_board_id_fkey FOREIGN KEY (stx_board_id) REFERENCES public.stx_boards(id) ON DELETE CASCADE;


--
-- Name: agency agency_stx_operator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agency
    ADD CONSTRAINT agency_stx_operator_id_fkey FOREIGN KEY (stx_operator_id) REFERENCES public.stx_operators(id) ON DELETE CASCADE;


--
-- Name: agency agency_stx_parent_agency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agency
    ADD CONSTRAINT agency_stx_parent_agency_id_fkey FOREIGN KEY (stx_parent_agency_id) REFERENCES public.agency(agency_id) ON DELETE SET NULL;


--
-- Name: agency agency_stx_sta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agency
    ADD CONSTRAINT agency_stx_sta_id_fkey FOREIGN KEY (stx_sta_id) REFERENCES public.stx_sta(id) ON DELETE CASCADE;


--
-- Name: calendar_dates calendar_dates_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_dates
    ADD CONSTRAINT calendar_dates_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.calendar(service_id) ON DELETE CASCADE;


--
-- Name: routes routes_agency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES public.agency(agency_id) ON DELETE SET NULL;


--
-- Name: routes routes_stx_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_stx_school_id_fkey FOREIGN KEY (stx_school_id) REFERENCES public.stx_schools(id) ON DELETE RESTRICT;


--
-- Name: routes routes_stx_sta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_stx_sta_id_fkey FOREIGN KEY (stx_sta_id) REFERENCES public.stx_sta(id) ON DELETE RESTRICT;


--
-- Name: stop_times stop_times_stop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stop_times
    ADD CONSTRAINT stop_times_stop_id_fkey FOREIGN KEY (stop_id) REFERENCES public.stops(stop_id) ON DELETE RESTRICT;


--
-- Name: stop_times stop_times_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stop_times
    ADD CONSTRAINT stop_times_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(trip_id) ON DELETE CASCADE;


--
-- Name: stops stops_parent_station_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stops
    ADD CONSTRAINT stops_parent_station_fkey FOREIGN KEY (parent_station) REFERENCES public.stops(stop_id) ON DELETE SET NULL;


--
-- Name: stops stops_stx_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stops
    ADD CONSTRAINT stops_stx_school_id_fkey FOREIGN KEY (stx_school_id) REFERENCES public.stx_schools(id) ON DELETE CASCADE;


--
-- Name: stx_alert_audit stx_alert_audit_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_alert_audit
    ADD CONSTRAINT stx_alert_audit_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: stx_alert_audit stx_alert_audit_alert_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_alert_audit
    ADD CONSTRAINT stx_alert_audit_alert_id_fkey FOREIGN KEY (alert_id) REFERENCES public.stx_alerts(id) ON DELETE CASCADE;


--
-- Name: stx_alert_deliveries stx_alert_deliveries_alert_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_alert_deliveries
    ADD CONSTRAINT stx_alert_deliveries_alert_id_fkey FOREIGN KEY (alert_id) REFERENCES public.stx_alerts(id) ON DELETE CASCADE;


--
-- Name: stx_alert_deliveries stx_alert_deliveries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_alert_deliveries
    ADD CONSTRAINT stx_alert_deliveries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: stx_alert_subscriptions stx_alert_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_alert_subscriptions
    ADD CONSTRAINT stx_alert_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: stx_alerts stx_alerts_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_alerts
    ADD CONSTRAINT stx_alerts_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: stx_alerts stx_alerts_sta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_alerts
    ADD CONSTRAINT stx_alerts_sta_id_fkey FOREIGN KEY (sta_id) REFERENCES public.stx_sta(id) ON DELETE CASCADE;


--
-- Name: stx_bell_schedule_dates stx_bell_schedule_dates_bell_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_bell_schedule_dates
    ADD CONSTRAINT stx_bell_schedule_dates_bell_schedule_id_fkey FOREIGN KEY (bell_schedule_id) REFERENCES public.stx_bell_schedules(id) ON DELETE CASCADE;


--
-- Name: stx_bell_schedule_dates stx_bell_schedule_dates_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_bell_schedule_dates
    ADD CONSTRAINT stx_bell_schedule_dates_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.stx_schools(id) ON DELETE CASCADE;


--
-- Name: stx_bell_schedules stx_bell_schedules_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_bell_schedules
    ADD CONSTRAINT stx_bell_schedules_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.stx_boards(id) ON DELETE CASCADE;


--
-- Name: stx_boarding_events stx_boarding_events_recorded_by_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_boarding_events
    ADD CONSTRAINT stx_boarding_events_recorded_by_driver_id_fkey FOREIGN KEY (recorded_by_driver_id) REFERENCES public.stx_drivers(id) ON DELETE SET NULL;


--
-- Name: stx_boarding_events stx_boarding_events_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_boarding_events
    ADD CONSTRAINT stx_boarding_events_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.stx_runs(id) ON DELETE CASCADE;


--
-- Name: stx_boarding_events stx_boarding_events_stop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_boarding_events
    ADD CONSTRAINT stx_boarding_events_stop_id_fkey FOREIGN KEY (stop_id) REFERENCES public.stops(stop_id) ON DELETE RESTRICT;


--
-- Name: stx_boarding_events stx_boarding_events_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_boarding_events
    ADD CONSTRAINT stx_boarding_events_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.stx_students(id) ON DELETE CASCADE;


--
-- Name: stx_boards stx_boards_sta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_boards
    ADD CONSTRAINT stx_boards_sta_id_fkey FOREIGN KEY (sta_id) REFERENCES public.stx_sta(id) ON DELETE RESTRICT;


--
-- Name: stx_calendar_link stx_calendar_link_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_calendar_link
    ADD CONSTRAINT stx_calendar_link_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.stx_boards(id) ON DELETE CASCADE;


--
-- Name: stx_calendar_link stx_calendar_link_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_calendar_link
    ADD CONSTRAINT stx_calendar_link_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.stx_schools(id) ON DELETE CASCADE;


--
-- Name: stx_calendar_link stx_calendar_link_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_calendar_link
    ADD CONSTRAINT stx_calendar_link_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.calendar(service_id) ON DELETE CASCADE;


--
-- Name: stx_drivers stx_drivers_operator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_drivers
    ADD CONSTRAINT stx_drivers_operator_id_fkey FOREIGN KEY (operator_id) REFERENCES public.stx_operators(id) ON DELETE RESTRICT;


--
-- Name: stx_drivers stx_drivers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_drivers
    ADD CONSTRAINT stx_drivers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: stx_eligibility stx_eligibility_approved_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_eligibility
    ADD CONSTRAINT stx_eligibility_approved_by_user_id_fkey FOREIGN KEY (approved_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: stx_eligibility stx_eligibility_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_eligibility
    ADD CONSTRAINT stx_eligibility_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.stx_students(id) ON DELETE CASCADE;


--
-- Name: stx_guardians stx_guardians_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_guardians
    ADD CONSTRAINT stx_guardians_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: stx_operator_contracts stx_operator_contracts_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_operator_contracts
    ADD CONSTRAINT stx_operator_contracts_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.stx_boards(id) ON DELETE SET NULL;


--
-- Name: stx_operator_contracts stx_operator_contracts_operator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_operator_contracts
    ADD CONSTRAINT stx_operator_contracts_operator_id_fkey FOREIGN KEY (operator_id) REFERENCES public.stx_operators(id) ON DELETE CASCADE;


--
-- Name: stx_operator_contracts stx_operator_contracts_sta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_operator_contracts
    ADD CONSTRAINT stx_operator_contracts_sta_id_fkey FOREIGN KEY (sta_id) REFERENCES public.stx_sta(id) ON DELETE RESTRICT;


--
-- Name: stx_ridership stx_ridership_stop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_ridership
    ADD CONSTRAINT stx_ridership_stop_id_fkey FOREIGN KEY (stop_id) REFERENCES public.stops(stop_id) ON DELETE RESTRICT;


--
-- Name: stx_ridership stx_ridership_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_ridership
    ADD CONSTRAINT stx_ridership_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.stx_students(id) ON DELETE CASCADE;


--
-- Name: stx_ridership stx_ridership_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_ridership
    ADD CONSTRAINT stx_ridership_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(trip_id) ON DELETE CASCADE;


--
-- Name: stx_runs stx_runs_backup_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_runs
    ADD CONSTRAINT stx_runs_backup_driver_id_fkey FOREIGN KEY (backup_driver_id) REFERENCES public.stx_drivers(id) ON DELETE SET NULL;


--
-- Name: stx_runs stx_runs_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_runs
    ADD CONSTRAINT stx_runs_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.stx_drivers(id) ON DELETE RESTRICT;


--
-- Name: stx_runs stx_runs_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_runs
    ADD CONSTRAINT stx_runs_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.stx_vehicles(id) ON DELETE RESTRICT;


--
-- Name: stx_schools stx_schools_bell_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_schools
    ADD CONSTRAINT stx_schools_bell_schedule_id_fkey FOREIGN KEY (bell_schedule_id) REFERENCES public.stx_bell_schedules(id) ON DELETE SET NULL;


--
-- Name: stx_schools stx_schools_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_schools
    ADD CONSTRAINT stx_schools_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.stx_boards(id) ON DELETE RESTRICT;


--
-- Name: stx_student_absences stx_student_absences_reported_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_student_absences
    ADD CONSTRAINT stx_student_absences_reported_by_user_id_fkey FOREIGN KEY (reported_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: stx_student_absences stx_student_absences_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_student_absences
    ADD CONSTRAINT stx_student_absences_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.stx_students(id) ON DELETE CASCADE;


--
-- Name: stx_student_guardians stx_student_guardians_guardian_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_student_guardians
    ADD CONSTRAINT stx_student_guardians_guardian_id_fkey FOREIGN KEY (guardian_id) REFERENCES public.stx_guardians(id) ON DELETE CASCADE;


--
-- Name: stx_student_guardians stx_student_guardians_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_student_guardians
    ADD CONSTRAINT stx_student_guardians_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.stx_students(id) ON DELETE CASCADE;


--
-- Name: stx_students stx_students_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_students
    ADD CONSTRAINT stx_students_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.stx_schools(id) ON DELETE RESTRICT;


--
-- Name: stx_vehicles stx_vehicles_operator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stx_vehicles
    ADD CONSTRAINT stx_vehicles_operator_id_fkey FOREIGN KEY (operator_id) REFERENCES public.stx_operators(id) ON DELETE RESTRICT;


--
-- Name: trips trips_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(route_id) ON DELETE CASCADE;


--
-- Name: trips trips_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.calendar(service_id) ON DELETE RESTRICT;


--
-- Name: trips trips_stx_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_stx_run_id_fkey FOREIGN KEY (stx_run_id) REFERENCES public.stx_runs(id) ON DELETE SET NULL;


--
-- Name: agency; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agency ENABLE ROW LEVEL SECURITY;

--
-- Name: agency agency_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY agency_admin ON public.agency USING ((current_setting('sbtm.user_anchor_kind'::text, true) = ANY (ARRAY['super'::text, 'sta'::text, 'board'::text, 'school'::text, 'operator'::text])));


--
-- Name: routes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;

--
-- Name: routes routes_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY routes_admin ON public.routes USING (((current_setting('sbtm.user_anchor_kind'::text, true) = 'super'::text) OR ((current_setting('sbtm.user_anchor_kind'::text, true) = 'sta'::text) AND ((stx_sta_id)::text = current_setting('sbtm.user_anchor_id'::text, true))) OR ((current_setting('sbtm.user_anchor_kind'::text, true) = 'school'::text) AND ((stx_school_id)::text = current_setting('sbtm.user_anchor_id'::text, true))) OR (current_setting('sbtm.user_anchor_kind'::text, true) = ANY (ARRAY['board'::text, 'operator'::text]))));


--
-- Name: shapes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shapes ENABLE ROW LEVEL SECURITY;

--
-- Name: shapes shapes_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shapes_admin ON public.shapes USING ((current_setting('sbtm.user_anchor_kind'::text, true) = ANY (ARRAY['super'::text, 'sta'::text, 'board'::text, 'school'::text, 'operator'::text])));


--
-- Name: stop_times; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stop_times ENABLE ROW LEVEL SECURITY;

--
-- Name: stop_times stop_times_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stop_times_admin ON public.stop_times USING ((current_setting('sbtm.user_anchor_kind'::text, true) = ANY (ARRAY['super'::text, 'sta'::text, 'board'::text, 'school'::text, 'operator'::text])));


--
-- Name: stops; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stops ENABLE ROW LEVEL SECURITY;

--
-- Name: stops stops_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stops_admin ON public.stops USING ((current_setting('sbtm.user_anchor_kind'::text, true) = ANY (ARRAY['super'::text, 'sta'::text, 'board'::text, 'school'::text, 'operator'::text])));


--
-- Name: stx_student_absences stx_absences_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stx_absences_admin ON public.stx_student_absences USING ((current_setting('sbtm.user_anchor_kind'::text, true) = ANY (ARRAY['super'::text, 'sta'::text, 'board'::text, 'school'::text])));


--
-- Name: stx_alert_audit; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stx_alert_audit ENABLE ROW LEVEL SECURITY;

--
-- Name: stx_alert_audit stx_alert_audit_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stx_alert_audit_admin ON public.stx_alert_audit USING ((current_setting('sbtm.user_anchor_kind'::text, true) = ANY (ARRAY['super'::text, 'sta'::text, 'board'::text, 'school'::text])));


--
-- Name: stx_alert_deliveries stx_alert_deliv_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stx_alert_deliv_admin ON public.stx_alert_deliveries USING ((current_setting('sbtm.user_anchor_kind'::text, true) = ANY (ARRAY['super'::text, 'sta'::text, 'board'::text, 'school'::text])));


--
-- Name: stx_alert_deliveries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stx_alert_deliveries ENABLE ROW LEVEL SECURITY;

--
-- Name: stx_alert_subscriptions stx_alert_subs_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stx_alert_subs_admin ON public.stx_alert_subscriptions USING ((current_setting('sbtm.user_anchor_kind'::text, true) = ANY (ARRAY['super'::text, 'sta'::text, 'board'::text, 'school'::text])));


--
-- Name: stx_alert_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stx_alert_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: stx_alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stx_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: stx_alerts stx_alerts_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stx_alerts_admin ON public.stx_alerts USING (((current_setting('sbtm.user_anchor_kind'::text, true) = 'super'::text) OR ((current_setting('sbtm.user_anchor_kind'::text, true) = 'sta'::text) AND ((sta_id)::text = current_setting('sbtm.user_anchor_id'::text, true))) OR (current_setting('sbtm.user_anchor_kind'::text, true) = ANY (ARRAY['board'::text, 'school'::text, 'operator'::text]))));


--
-- Name: stx_bell_schedule_dates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stx_bell_schedule_dates ENABLE ROW LEVEL SECURITY;

--
-- Name: stx_bell_schedule_dates stx_bell_schedule_dates_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stx_bell_schedule_dates_admin ON public.stx_bell_schedule_dates USING ((current_setting('sbtm.user_anchor_kind'::text, true) = ANY (ARRAY['super'::text, 'sta'::text, 'board'::text, 'school'::text])));


--
-- Name: stx_bell_schedules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stx_bell_schedules ENABLE ROW LEVEL SECURITY;

--
-- Name: stx_bell_schedules stx_bell_schedules_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stx_bell_schedules_admin ON public.stx_bell_schedules USING ((current_setting('sbtm.user_anchor_kind'::text, true) = ANY (ARRAY['super'::text, 'sta'::text, 'board'::text, 'school'::text])));


--
-- Name: stx_boarding_events stx_boarding_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stx_boarding_admin ON public.stx_boarding_events USING ((current_setting('sbtm.user_anchor_kind'::text, true) = ANY (ARRAY['super'::text, 'sta'::text, 'board'::text, 'school'::text, 'operator'::text])));


--
-- Name: stx_boarding_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stx_boarding_events ENABLE ROW LEVEL SECURITY;

--
-- Name: stx_boards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stx_boards ENABLE ROW LEVEL SECURITY;

--
-- Name: stx_boards stx_boards_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stx_boards_admin ON public.stx_boards USING (((current_setting('sbtm.user_anchor_kind'::text, true) = 'super'::text) OR ((current_setting('sbtm.user_anchor_kind'::text, true) = 'sta'::text) AND ((sta_id)::text = current_setting('sbtm.user_anchor_id'::text, true))) OR ((current_setting('sbtm.user_anchor_kind'::text, true) = 'board'::text) AND ((id)::text = current_setting('sbtm.user_anchor_id'::text, true)))));


--
-- Name: stx_calendar_link; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stx_calendar_link ENABLE ROW LEVEL SECURITY;

--
-- Name: stx_calendar_link stx_calendar_link_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stx_calendar_link_admin ON public.stx_calendar_link USING ((current_setting('sbtm.user_anchor_kind'::text, true) = ANY (ARRAY['super'::text, 'sta'::text, 'board'::text, 'school'::text])));


--
-- Name: stx_drivers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stx_drivers ENABLE ROW LEVEL SECURITY;

--
-- Name: stx_drivers stx_drivers_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stx_drivers_admin ON public.stx_drivers USING (((current_setting('sbtm.user_anchor_kind'::text, true) = ANY (ARRAY['super'::text, 'sta'::text, 'board'::text, 'school'::text])) OR ((current_setting('sbtm.user_anchor_kind'::text, true) = 'operator'::text) AND ((operator_id)::text = current_setting('sbtm.user_anchor_id'::text, true)))));


--
-- Name: stx_eligibility; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stx_eligibility ENABLE ROW LEVEL SECURITY;

--
-- Name: stx_eligibility stx_eligibility_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stx_eligibility_admin ON public.stx_eligibility USING ((current_setting('sbtm.user_anchor_kind'::text, true) = ANY (ARRAY['super'::text, 'sta'::text, 'board'::text, 'school'::text])));


--
-- Name: stx_guardians; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stx_guardians ENABLE ROW LEVEL SECURITY;

--
-- Name: stx_guardians stx_guardians_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stx_guardians_admin ON public.stx_guardians USING ((current_setting('sbtm.user_anchor_kind'::text, true) = ANY (ARRAY['super'::text, 'sta'::text, 'board'::text, 'school'::text])));


--
-- Name: stx_operator_contracts stx_op_contracts_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stx_op_contracts_admin ON public.stx_operator_contracts USING (((current_setting('sbtm.user_anchor_kind'::text, true) = 'super'::text) OR ((current_setting('sbtm.user_anchor_kind'::text, true) = 'sta'::text) AND ((sta_id)::text = current_setting('sbtm.user_anchor_id'::text, true))) OR ((current_setting('sbtm.user_anchor_kind'::text, true) = 'operator'::text) AND ((operator_id)::text = current_setting('sbtm.user_anchor_id'::text, true)))));


--
-- Name: stx_operator_contracts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stx_operator_contracts ENABLE ROW LEVEL SECURITY;

--
-- Name: stx_operators; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stx_operators ENABLE ROW LEVEL SECURITY;

--
-- Name: stx_operators stx_operators_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stx_operators_admin ON public.stx_operators USING (((current_setting('sbtm.user_anchor_kind'::text, true) = ANY (ARRAY['super'::text, 'sta'::text])) OR ((current_setting('sbtm.user_anchor_kind'::text, true) = 'operator'::text) AND ((id)::text = current_setting('sbtm.user_anchor_id'::text, true)))));


--
-- Name: stx_ridership; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stx_ridership ENABLE ROW LEVEL SECURITY;

--
-- Name: stx_ridership stx_ridership_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stx_ridership_admin ON public.stx_ridership USING ((current_setting('sbtm.user_anchor_kind'::text, true) = ANY (ARRAY['super'::text, 'sta'::text, 'board'::text, 'school'::text, 'operator'::text])));


--
-- Name: stx_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stx_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: stx_runs stx_runs_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stx_runs_admin ON public.stx_runs USING ((current_setting('sbtm.user_anchor_kind'::text, true) = ANY (ARRAY['super'::text, 'sta'::text, 'board'::text, 'school'::text, 'operator'::text])));


--
-- Name: stx_schools; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stx_schools ENABLE ROW LEVEL SECURITY;

--
-- Name: stx_schools stx_schools_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stx_schools_admin ON public.stx_schools USING (((current_setting('sbtm.user_anchor_kind'::text, true) = 'super'::text) OR (current_setting('sbtm.user_anchor_kind'::text, true) = ANY (ARRAY['sta'::text, 'board'::text])) OR ((current_setting('sbtm.user_anchor_kind'::text, true) = 'school'::text) AND ((id)::text = current_setting('sbtm.user_anchor_id'::text, true)))));


--
-- Name: stx_student_guardians stx_sg_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stx_sg_admin ON public.stx_student_guardians USING ((current_setting('sbtm.user_anchor_kind'::text, true) = ANY (ARRAY['super'::text, 'sta'::text, 'board'::text, 'school'::text])));


--
-- Name: stx_sta; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stx_sta ENABLE ROW LEVEL SECURITY;

--
-- Name: stx_sta stx_sta_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stx_sta_admin ON public.stx_sta USING (((current_setting('sbtm.user_anchor_kind'::text, true) = 'super'::text) OR ((current_setting('sbtm.user_anchor_kind'::text, true) = 'sta'::text) AND ((id)::text = current_setting('sbtm.user_anchor_id'::text, true)))));


--
-- Name: stx_student_absences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stx_student_absences ENABLE ROW LEVEL SECURITY;

--
-- Name: stx_student_guardians; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stx_student_guardians ENABLE ROW LEVEL SECURITY;

--
-- Name: stx_students; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stx_students ENABLE ROW LEVEL SECURITY;

--
-- Name: stx_students stx_students_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stx_students_admin ON public.stx_students USING (((current_setting('sbtm.user_anchor_kind'::text, true) = ANY (ARRAY['super'::text, 'sta'::text, 'board'::text])) OR ((current_setting('sbtm.user_anchor_kind'::text, true) = 'school'::text) AND ((school_id)::text = current_setting('sbtm.user_anchor_id'::text, true)))));


--
-- Name: stx_vehicles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stx_vehicles ENABLE ROW LEVEL SECURITY;

--
-- Name: stx_vehicles stx_vehicles_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stx_vehicles_admin ON public.stx_vehicles USING (((current_setting('sbtm.user_anchor_kind'::text, true) = ANY (ARRAY['super'::text, 'sta'::text, 'board'::text, 'school'::text])) OR ((current_setting('sbtm.user_anchor_kind'::text, true) = 'operator'::text) AND ((operator_id)::text = current_setting('sbtm.user_anchor_id'::text, true)))));


--
-- Name: trips; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

--
-- Name: trips trips_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY trips_admin ON public.trips USING ((current_setting('sbtm.user_anchor_kind'::text, true) = ANY (ARRAY['super'::text, 'sta'::text, 'board'::text, 'school'::text, 'operator'::text])));


--
-- PostgreSQL database dump complete
--

