# Phase 72 Batch 2 + Chains + CrossRefs Notes

## Scope

- Added the 2 remaining Phase-70 catalog candidates:
  - `indoor_overtraining_stall_mild`
  - `shared_observation_recovery_after_stress`
- Added the first 2 chain files:
  - `watering_rootzone_chain`
  - `airflow_climate_chain`
- Refreshed the old 12-event Shadow Bridge matrix expectation to a catalog-size-based check.

## Intentional Deviation Handling

The Phase-72 start text suggested alternate placeholder candidates (`shared_training_stress_recovery_window`, `indoor_equipment_timer_misread`).
The Phase-70 approved plan named different remaining candidates.
This batch follows the approved Phase-70 plan and therefore implements:

- `indoor_overtraining_stall_mild`
- `shared_observation_recovery_after_stress`

## Chain CrossRefs

### watering_rootzone_chain

Steps:
- `shared_panic_watering_misread`
- `outdoor_pot_dries_by_afternoon`
- `shared_substrate_drainage_compaction`
- `indoor_rootzone_airless_medium`
- `shared_observation_recovery_after_stress`

Related event chain hooks patched:
- `shared_panic_watering_misread.startsChain = watering_rootzone_chain`
- `outdoor_pot_dries_by_afternoon.advancesChainsOnOutcome -> step_drainage`
- `shared_substrate_drainage_compaction.advancesChainsOnOutcome -> step_rootzone`
- `indoor_rootzone_airless_medium.advancesChainsOnOutcome -> step_recover`

### airflow_climate_chain

Steps:
- `indoor_fan_failure_airflow_drop`
- `indoor_vpd_mismatch_veg`
- `indoor_heat_stress_air`
- `outdoor_wind_exposure_stem_stress`
- `outdoor_heatwave_dry_wind`

Related event chain hooks patched:
- `indoor_fan_failure_airflow_drop.startsChain = airflow_climate_chain`
- `indoor_vpd_mismatch_veg.advancesChainsOnOutcome -> step_heat`
- `indoor_heat_stress_air.advancesChainsOnOutcome -> step_wind / step_heatwave`
- `outdoor_wind_exposure_stem_stress.advancesChainsOnOutcome -> step_heatwave`

## Temporary Learning-Ref Mappings

Still intentionally temporary until dedicated cards exist:
- `indoor_light_burn_canopy_top -> lc_climate_vpd_basics`
- `outdoor_early_pest_pressure_leaf_underside -> lc_climate_vpd_basics`
- `indoor_overtraining_stall_mild -> lc_climate_vpd_basics`
- `shared_observation_recovery_after_stress -> lc_watering_basics`

## Asset Decisions

No new assets were generated.
All new events and chains use existing fallback-safe assets:
- event covers remain in existing `assets/events/*.png`
- chain covers use `assets/events/event-stress-recovery.png`

## Follow-up Candidates

Recommended Phase-73 quality lift:
- add dedicated learning cards for training recovery and pest observation
- review temporary learning-ref mappings
- improve release-candidate health score beyond the current development-ready level
