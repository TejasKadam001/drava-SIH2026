-- Drava | V2: reference and demo rows
-- Plain ANSI SQL, valid on PostgreSQL and H2.

insert into roles (role_id, description) values
    ('ADMIN',    'Asset administrator with full access'),
    ('ENGINEER', 'Petroleum, reservoir and production engineer'),
    ('OPERATOR', 'Field production operator'),
    ('VIEWER',   'Read-only observer');

-- Demo accounts. Hashes are BCrypt placeholders; the demo password is 'password123'.
insert into users (user_id, username, email, password_hash, role_id, is_active) values
    ('USR-001', 'admin',          'admin@oilindia.in',    '$2a$10$wTkyrW6zN6d9sM2aQ8qDceG7N1G0pA2Xm4zJ8h9dK6qE0wA2Xm4zJ', 'ADMIN',    true),
    ('USR-002', 'anmol_engineer', 'engineer@oilindia.in', '$2a$10$wTkyrW6zN6d9sM2aQ8qDceG7N1G0pA2Xm4zJ8h9dK6qE0wA2Xm4zJ', 'ENGINEER', true),
    ('USR-003', 'field_operator', 'operator@oilindia.in', '$2a$10$wTkyrW6zN6d9sM2aQ8qDceG7N1G0pA2Xm4zJ8h9dK6qE0wA2Xm4zJ', 'OPERATOR', true);

insert into reservoirs
    (reservoir_id, name, basin, formation, initial_temperature_c, initial_pressure_bar, api_gravity, native_viscosity_cp)
values
    ('RES-BAGHEWALA-01', 'Baghewala Heavy Oil Reservoir', 'Bikaner-Nagaur Basin', 'Jodhpur Sandstone', 47.0, 55.0, 18.2, 4200.0);

insert into wells
    (well_id, well_name, reservoir_id, depth_m, pump_depth_m, tubing_id_mm, casing_id_mm, active_cycle_number, status, data_source_mode)
values
    ('BW-DEMO-001', 'Baghewala Demo Well 001 (Thermal Decay Stage)',     'RES-BAGHEWALA-01', 950.0, 900.0, 62.0, 152.4, 3, 'ACTIVE_PRODUCTION', 'SIMULATION'),
    ('BW-DEMO-002', 'Baghewala Demo Well 002 (Peak Thermal Stage)',      'RES-BAGHEWALA-01', 960.0, 910.0, 62.0, 152.4, 4, 'ACTIVE_PRODUCTION', 'SIMULATION'),
    ('BW-DEMO-003', 'Baghewala Demo Well 003 (Critical Cooling Warning)', 'RES-BAGHEWALA-01', 940.0, 890.0, 62.0, 152.4, 2, 'ACTIVE_PRODUCTION', 'SIMULATION');

insert into well_completion
    (completion_id, well_id, tubing_od_in, casing_od_in, perforation_top_m, perforation_bottom_m, sand_control_type)
values
    ('COMP-001', 'BW-DEMO-001', 2.875, 7.0, 930.0, 948.0, 'Wire-Wrapped Screen'),
    ('COMP-002', 'BW-DEMO-002', 2.875, 7.0, 935.0, 955.0, 'Slotted Liner'),
    ('COMP-003', 'BW-DEMO-003', 2.875, 7.0, 920.0, 938.0, 'Gravel Pack');

insert into model_versions
    (model_version_id, model_name, version_string, training_dataset, mae, rmse, status)
values
    ('MDL-PROD-V1', 'hybrid_production_forecaster', 'v1.4.0', 'Tier-A Volve + Tier-B Baghewala literature', 4.20, 6.10, 'ACTIVE'),
    ('MDL-FAIL-V1', 'failure_intelligence_risk',    'v1.4.0', 'PetroBench + literature dyno cards',       0.05, 0.08, 'ACTIVE'),
    ('MDL-ANOM-V1', 'telemetry_anomaly_detector',   'v1.4.0', 'Baghewala synthetic normal telemetry',     0.02, 0.04, 'ACTIVE');
