# Phase 74 Learning-Card Backfill Notes

## Scope
- Added 4 learning cards total.
- 3 planned core cards implemented:
  - `lc_light_intensity_distance_basics`
  - `lc_pest_observation_basics`
  - `lc_training_recovery_basics`
- Optional card implemented after review:
  - `lc_recovery_observation_basics`

## Why Optional Card Was Included
`shared_observation_recovery_after_stress` is a positive recovery observation beat, not a training-specific beat. Mapping it to `lc_training_recovery_basics` would still be better than watering, but it would collapse two different lessons:
- training needs recovery windows
- after a good correction, observe before over-correcting again

A dedicated recovery observation card keeps the lesson cleaner and improves later UI-Lab clarity.

## Event Remaps
- `indoor_light_burn_canopy_top`
  - from `lc_climate_vpd_basics`
  - to `lc_light_intensity_distance_basics`
- `shared_light_distance_error`
  - from `lc_climate_vpd_basics`
  - to `lc_light_intensity_distance_basics`
- `outdoor_early_pest_pressure_leaf_underside`
  - from `lc_climate_vpd_basics`
  - to `lc_pest_observation_basics`
- `shared_early_pest_signs_mild`
  - from `lc_climate_vpd_basics`
  - to `lc_pest_observation_basics`
- `indoor_overtraining_stall_mild`
  - from `lc_climate_vpd_basics`
  - to `lc_training_recovery_basics`
- `shared_observation_recovery_after_stress`
  - from `lc_watering_basics`
  - to `lc_recovery_observation_basics`

## linkedEventIds Refresh
- `lc_climate_vpd_basics` narrowed to true climate/VPD cases.
- `lc_watering_basics` no longer carries the recovery observation event.
- All new cards now own explicit `linkedEventIds` that match their remapped events.

## Asset Notes
- New learning cards use validator-safe fallback hero assets.
- No new asset files were created.
- No asset-integrity blockers or warnings remain after the hero-asset adjustment.

## Quality Impact
- Temporary learning-ref set from the known Phase-73 backlog is fully cleared.
- Semantic fit between events and cards is stronger.
- Chain authoring benefits because chain steps now point to more specific learning beats.
- Health score did not rise above Phase-72 because the validator still counts many informational diagnostics, and four additional learning-card files also increase total info volume.
