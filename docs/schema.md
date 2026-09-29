# Database schema

Defined in `gateway/src/main/resources/db/migration/`. Flyway applies `V1__init_schema.sql` (tables and indexes) and `V2__seed_data.sql` (roles, demo users, the Baghewala reservoir, three wells, model registry) on start-up. The scripts are portable: local runs use in-memory H2 in PostgreSQL mode; `docker-compose.yml` uses TimescaleDB on PostgreSQL 16.

## Tables by area

| Area | Tables |
| --- | --- |
| Access control | `roles`, `users`, `audit_logs` |
| Asset registry | `reservoirs`, `wells`, `well_completion` |
| Operations | `telemetry`, `production_history`, `srp_operations`, `failure_events` |
| Steam cycles | `css_cycles`, `steam_injection` |
| ML registry | `model_versions`, `predictions`, `anomalies` |
| Planning | `scenarios`, `optimization_runs`, `recommendations`, `agent_sessions` |

## Relationships

```text
roles 1--n users
reservoirs 1--n wells 1--n { well_completion, telemetry, production_history, srp_operations,
                              failure_events, css_cycles, predictions, anomalies,
                              scenarios, optimization_runs, recommendations }
css_cycles 1--n steam_injection
model_versions 1--n predictions
optimization_runs 1--n recommendations
users 1--n { scenarios, agent_sessions }
```

## Notes

- `telemetry` is the high-volume table (about twenty measurement columns per row, indexed on `well_id, time`); on Timescale it is a natural hypertable candidate.
- `recommendations` stores each proposed plan with its expected percentage changes, a rationale and an `approval_status` (`PENDING_REVIEW` by default) so an engineer's decision is recorded.
- `audit_logs` records who did what, for which well, from which IP.
- Constraint names follow `pk_<table>`, `fk_<table>_<column>` and `uq_<table>_<column>`; lookup indexes are named `ix_<table>_<columns>`.
