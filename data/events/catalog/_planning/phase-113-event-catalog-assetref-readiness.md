# Phase 113 - Event Catalog AssetRef Readiness (Read-only)

## Current Schema Signal
- All event files contain ssets.modalImage.src and ssets.modalImage.fallback.
- Overlay dictionary exists in ssets.overlays.
- No dedicated multi-resolution final-field schema (hero2x) currently in event files.

## Proposed Safe Schema Position (future, not applied)
- Primary target location: ssets.modalImage for src/allback.
- Optional planning metadata outside product files: _planning draft JSON (this phase).

## Readiness Table
| Event ID | has assets | has modalImage | has src | has fallback | has overlays | Suggested field |
|---|---|---|---|---|---|---|
| indoor_dry_rootball | ja | nein | nein | nein | nein | assets.modalImage |
| indoor_fan_failure_airflow_drop | ja | nein | nein | nein | nein | assets.modalImage |
| indoor_heat_stress_air | ja | nein | nein | nein | nein | assets.modalImage |
| indoor_light_burn_canopy_top | ja | nein | nein | nein | nein | assets.modalImage |
| indoor_light_nutrient_tox_early | ja | nein | nein | nein | nein | assets.modalImage |
| indoor_overtraining_stall_mild | ja | nein | nein | nein | nein | assets.modalImage |
| indoor_overwatering_early | ja | nein | nein | nein | nein | assets.modalImage |
| indoor_rootzone_airless_medium | ja | nein | nein | nein | nein | assets.modalImage |
| indoor_soil_ph_out_of_range | ja | nein | nein | nein | nein | assets.modalImage |
| indoor_vpd_mismatch_veg | ja | nein | nein | nein | nein | assets.modalImage |
| outdoor_cold_night_stress | ja | nein | nein | nein | nein | assets.modalImage |
| outdoor_early_pest_pressure_leaf_underside | ja | nein | nein | nein | nein | assets.modalImage |
| outdoor_heatwave_dry_wind | ja | nein | nein | nein | nein | assets.modalImage |
| outdoor_heavy_rain_waterlogging_risk | ja | nein | nein | nein | nein | assets.modalImage |
| outdoor_pot_dries_by_afternoon | ja | nein | nein | nein | nein | assets.modalImage |
| outdoor_wind_exposure_stem_stress | ja | nein | nein | nein | nein | assets.modalImage |
| shared_early_pest_signs_mild | ja | nein | nein | nein | nein | assets.modalImage |
| shared_light_distance_error | ja | nein | nein | nein | nein | assets.modalImage |
| shared_observation_recovery_after_stress | ja | nein | nein | nein | nein | assets.modalImage |
| shared_panic_watering_misread | ja | nein | nein | nein | nein | assets.modalImage |
| shared_rootbound_warning | ja | nein | nein | nein | nein | assets.modalImage |
| shared_substrate_drainage_compaction | ja | nein | nein | nein | nein | assets.modalImage |

## Risks / Open Questions
1. Whether hero2x should stay planning-only or get dedicated runtime field in a later schema migration.
2. How to preserve overlay compatibility while updating modal image refs.
3. Whether final assets require checksum locking before wiring.

