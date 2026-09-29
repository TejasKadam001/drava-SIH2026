-- Drava | V1: core relational schema
-- Portable across PostgreSQL and H2 (PostgreSQL mode).

-- ---- Access control ----
create table if not exists roles (
    role_id                     varchar(30),
    description                 varchar(255),
    constraint pk_roles primary key (role_id)
);

create table if not exists users (
    user_id                     varchar(50),
    username                    varchar(100)  not null,
    email                       varchar(150)  not null,
    password_hash               varchar(255)  not null,
    role_id                     varchar(30),
    is_active                   boolean       default true,
    created_at                  timestamp     default current_timestamp,
    constraint pk_users primary key (user_id),
    constraint uq_users_username unique (username),
    constraint uq_users_email unique (email),
    constraint fk_users_role_id foreign key (role_id) references roles (role_id)
);

create table if not exists audit_logs (
    log_id                      bigserial,
    timestamp                   timestamp     default current_timestamp,
    user_id                     varchar(50),
    action                      varchar(100)  not null,
    well_id                     varchar(50),
    request_ip                  varchar(50),
    details                     text,
    constraint pk_audit_logs primary key (log_id)
);

-- ---- Asset registry ----
create table if not exists reservoirs (
    reservoir_id                varchar(50),
    name                        varchar(100)  not null,
    basin                       varchar(100)  not null,
    formation                   varchar(100)  not null,
    initial_temperature_c       numeric(6,2),
    initial_pressure_bar        numeric(6,2),
    api_gravity                 numeric(4,2),
    native_viscosity_cp         numeric(8,2),
    constraint pk_reservoirs primary key (reservoir_id)
);

create table if not exists wells (
    well_id                     varchar(50),
    well_name                   varchar(100)  not null,
    reservoir_id                varchar(50),
    depth_m                     numeric(8,2)  not null,
    pump_depth_m                numeric(8,2)  not null,
    tubing_id_mm                numeric(6,2)  not null,
    casing_id_mm                numeric(6,2)  not null,
    active_cycle_number         int           default 1,
    status                      varchar(30)   default 'ACTIVE_PRODUCTION',
    data_source_mode            varchar(30)   default 'SIMULATION',
    created_at                  timestamp     default current_timestamp,
    constraint pk_wells primary key (well_id),
    constraint fk_wells_reservoir_id foreign key (reservoir_id) references reservoirs (reservoir_id)
);

create table if not exists well_completion (
    completion_id               varchar(50),
    well_id                     varchar(50),
    tubing_od_in                numeric(4,2),
    casing_od_in                numeric(4,2),
    perforation_top_m           numeric(8,2),
    perforation_bottom_m        numeric(8,2),
    sand_control_type           varchar(50),
    installed_at                timestamp     default current_timestamp,
    constraint pk_well_completion primary key (completion_id),
    constraint fk_well_completion_well_id foreign key (well_id) references wells (well_id)
);

-- ---- Live & historical operations ----
create table if not exists telemetry (
    telemetry_id                bigserial,
    time                        timestamp     not null,
    well_id                     varchar(50),
    bottomhole_temp_c           numeric(6,2),
    bottomhole_pressure_bar     numeric(6,2),
    wellhead_pressure_bar       numeric(6,2),
    oil_rate_bpd                numeric(8,2),
    water_rate_bpd              numeric(8,2),
    steam_rate_bpd              numeric(8,2),
    viscosity_est_cp            numeric(8,2),
    spm                         numeric(5,2),
    stroke_length_m             numeric(4,2),
    vfd_frequency_hz            numeric(5,2),
    peak_polished_rod_load_lbs  numeric(8,2),
    min_polished_rod_load_lbs   numeric(8,2),
    motor_power_kw              numeric(6,2),
    rod_floating_detected       boolean       default false,
    rod_floating_risk           numeric(5,4),
    data_quality_status         varchar(20)   default 'GOOD',
    constraint pk_telemetry primary key (telemetry_id),
    constraint fk_telemetry_well_id foreign key (well_id) references wells (well_id)
);

create table if not exists production_history (
    record_id                   bigserial,
    well_id                     varchar(50),
    production_date             date          not null,
    oil_bpd                     numeric(8,2)  not null,
    water_bpd                   numeric(8,2),
    gas_mscfd                   numeric(8,2),
    hours_on_stream             numeric(4,2)  default 24.0,
    constraint pk_production_history primary key (record_id),
    constraint fk_production_history_well_id foreign key (well_id) references wells (well_id)
);

create table if not exists srp_operations (
    operation_id                bigserial,
    well_id                     varchar(50),
    timestamp                   timestamp     default current_timestamp,
    spm                         numeric(5,2)  not null,
    stroke_length_m             numeric(4,2)  not null,
    vfd_frequency_hz            numeric(5,2)  not null,
    mode                        varchar(30)   default 'THERMAL_TRACKING',
    constraint pk_srp_operations primary key (operation_id),
    constraint fk_srp_operations_well_id foreign key (well_id) references wells (well_id)
);

create table if not exists failure_events (
    event_id                    bigserial,
    well_id                     varchar(50),
    timestamp                   timestamp     default current_timestamp,
    failure_type                varchar(50)   not null,
    severity                    varchar(20)   not null,
    description                 text,
    workover_required           boolean       default false,
    estimated_cost_inr          numeric(12,2),
    constraint pk_failure_events primary key (event_id),
    constraint fk_failure_events_well_id foreign key (well_id) references wells (well_id)
);

-- ---- Cyclic steam stimulation ----
create table if not exists css_cycles (
    cycle_id                    varchar(60),
    well_id                     varchar(50),
    cycle_number                int           not null,
    steam_mass_tons             numeric(8,2)  not null,
    steam_temp_c                numeric(6,2)  not null,
    steam_pressure_bar          numeric(6,2)  not null,
    soak_days                   numeric(4,1)  not null,
    production_days             int,
    cumulative_oil_bbl          numeric(10,2),
    cumulative_sor              numeric(6,2),
    cycle_status                varchar(30)   default 'COMPLETED',
    started_at                  timestamp,
    ended_at                    timestamp,
    constraint pk_css_cycles primary key (cycle_id),
    constraint fk_css_cycles_well_id foreign key (well_id) references wells (well_id)
);

create table if not exists steam_injection (
    injection_id                bigserial,
    cycle_id                    varchar(60),
    injection_day               int           not null,
    daily_steam_tons            numeric(8,2),
    wellhead_temp_c             numeric(6,2),
    wellhead_pressure_bar       numeric(6,2),
    steam_quality               numeric(4,3),
    constraint pk_steam_injection primary key (injection_id),
    constraint fk_steam_injection_cycle_id foreign key (cycle_id) references css_cycles (cycle_id)
);

-- ---- Machine learning registry ----
create table if not exists model_versions (
    model_version_id            varchar(50),
    model_name                  varchar(100)  not null,
    version_string              varchar(30)   not null,
    trained_at                  timestamp     default current_timestamp,
    training_dataset            varchar(255),
    mae                         numeric(6,3),
    rmse                        numeric(6,3),
    status                      varchar(30)   default 'ACTIVE',
    constraint pk_model_versions primary key (model_version_id)
);

create table if not exists predictions (
    prediction_id               bigserial,
    well_id                     varchar(50),
    model_version_id            varchar(50),
    created_at                  timestamp     default current_timestamp,
    horizon_days                int           not null,
    predicted_production_bpd    numeric(8,2),
    lower_95_bpd                numeric(8,2),
    upper_95_bpd                numeric(8,2),
    confidence_level            varchar(20)   default 'HIGH',
    constraint pk_predictions primary key (prediction_id),
    constraint fk_predictions_well_id foreign key (well_id) references wells (well_id),
    constraint fk_predictions_model_version_id foreign key (model_version_id) references model_versions (model_version_id)
);

create table if not exists anomalies (
    anomaly_id                  bigserial,
    well_id                     varchar(50),
    timestamp                   timestamp     default current_timestamp,
    anomaly_type                varchar(50)   not null,
    severity                    varchar(20)   not null,
    anomaly_score               numeric(6,4),
    root_cause                  text,
    constraint pk_anomalies primary key (anomaly_id),
    constraint fk_anomalies_well_id foreign key (well_id) references wells (well_id)
);

-- ---- Optimisation & copilot ----
create table if not exists scenarios (
    scenario_id                 varchar(60),
    name                        varchar(100)  not null,
    well_id                     varchar(50),
    created_by                  varchar(50),
    created_at                  timestamp     default current_timestamp,
    steam_volume_tons           numeric(8,2),
    soak_days                   numeric(4,1),
    spm                         numeric(5,2),
    stroke_length_m             numeric(4,2),
    simulated_production_bpd    numeric(8,2),
    simulated_sor               numeric(6,2),
    simulated_risk              numeric(5,4),
    is_feasible                 boolean       default true,
    constraint pk_scenarios primary key (scenario_id),
    constraint fk_scenarios_well_id foreign key (well_id) references wells (well_id),
    constraint fk_scenarios_created_by foreign key (created_by) references users (user_id)
);

create table if not exists optimization_runs (
    run_id                      varchar(60),
    well_id                     varchar(50),
    started_at                  timestamp     default current_timestamp,
    algorithm                   varchar(100)  not null,
    weight_prod                 numeric(4,3),
    weight_sor                  numeric(4,3),
    weight_energy               numeric(4,3),
    weight_risk                 numeric(4,3),
    status                      varchar(30)   default 'CONVERGED',
    constraint pk_optimization_runs primary key (run_id),
    constraint fk_optimization_runs_well_id foreign key (well_id) references wells (well_id)
);

create table if not exists recommendations (
    recommendation_id           varchar(60),
    run_id                      varchar(60),
    well_id                     varchar(50),
    generated_at                timestamp     default current_timestamp,
    recommended_spm             numeric(5,2),
    recommended_stroke_m        numeric(4,2),
    recommended_vfd_hz          numeric(5,2),
    recommended_steam_tons      numeric(8,2),
    recommended_soak_days       numeric(4,1),
    expected_prod_change_pct    numeric(5,2),
    expected_sor_change_pct     numeric(5,2),
    expected_energy_change_pct  numeric(5,2),
    expected_risk_change_pct    numeric(5,2),
    confidence_pct              numeric(5,2),
    rationale                   text,
    approval_status             varchar(30)   default 'PENDING_REVIEW',
    reviewed_by                 varchar(50),
    reviewed_at                 timestamp,
    audit_notes                 text,
    constraint pk_recommendations primary key (recommendation_id),
    constraint fk_recommendations_run_id foreign key (run_id) references optimization_runs (run_id),
    constraint fk_recommendations_well_id foreign key (well_id) references wells (well_id)
);

create table if not exists agent_sessions (
    session_id                  varchar(60),
    well_id                     varchar(50),
    user_id                     varchar(50),
    started_at                  timestamp     default current_timestamp,
    query_count                 int           default 0,
    constraint pk_agent_sessions primary key (session_id),
    constraint fk_agent_sessions_well_id foreign key (well_id) references wells (well_id),
    constraint fk_agent_sessions_user_id foreign key (user_id) references users (user_id)
);

-- ---- Lookup indexes ----
create index if not exists ix_telemetry_well_id_time on telemetry (well_id, time);
create index if not exists ix_production_history_well_id_production_date on production_history (well_id, production_date);
create index if not exists ix_failure_events_well_id on failure_events (well_id);
create index if not exists ix_css_cycles_well_id_cycle_number on css_cycles (well_id, cycle_number);
create index if not exists ix_srp_operations_well_id on srp_operations (well_id);
create index if not exists ix_predictions_well_id on predictions (well_id);
create index if not exists ix_anomalies_well_id on anomalies (well_id);
create index if not exists ix_recommendations_well_id on recommendations (well_id);
create index if not exists ix_audit_logs_user_id on audit_logs (user_id);
