# Phase 112 - Trial Asset Set v1

## trial_asset_set_v1 Classification
- `ready`: 8
- `usable_with_watch`: 6
- `temporary_usable_needs_revision`: 8
- `blocked_no_asset`: 0
- `blocked_reject`: 0

## Selection Rule
Use best existing candidate per event now, and defer visual polish to backlog unless a candidate is technically unusable.

## Ready
- indoor_dry_rootball
- indoor_rootzone_airless_medium
- outdoor_pot_dries_by_afternoon
- outdoor_wind_exposure_stem_stress
- shared_early_pest_signs_mild
- shared_panic_watering_misread
- shared_rootbound_warning
- shared_substrate_drainage_compaction

## Usable With Watch
- indoor_overtraining_stall_mild
- indoor_overwatering_early
- outdoor_cold_night_stress
- outdoor_early_pest_pressure_leaf_underside
- outdoor_heavy_rain_waterlogging_risk
- shared_observation_recovery_after_stress

## Temporary Usable Needs Revision
- indoor_fan_failure_airflow_drop
- indoor_heat_stress_air
- indoor_light_burn_canopy_top
- indoor_light_nutrient_tox_early
- indoor_soil_ph_out_of_range
- indoor_vpd_mismatch_veg
- outdoor_heatwave_dry_wind
- shared_light_distance_error

## Blocked
- blocked_no_asset: none
- blocked_reject: none

## Technical Promotion Planning (no execution)
For every usable event, later final targets remain:
- `assets/events/v2/final/{eventId}/hero.webp`
- `assets/events/v2/final/{eventId}/hero@2x.webp`
- `assets/events/v2/final/{eventId}/fallback.webp`

Not performed in this phase:
- no webp conversion
- no final file creation
- no AssetRef edits
- no event file edits
