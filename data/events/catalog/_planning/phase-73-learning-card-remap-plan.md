# Phase 73 Learning-Card Remap Plan

## Planned New Cards

- `lc_light_intensity_distance_basics`
- `lc_pest_observation_basics`
- `lc_training_recovery_basics`
- optional: `lc_recovery_observation_basics`

## Planned Remaps

### Light / Distance
- `indoor_light_burn_canopy_top`
- `shared_light_distance_error`

### Pest Observation
- `outdoor_early_pest_pressure_leaf_underside`
- `shared_early_pest_signs_mild`

### Training Recovery
- `indoor_overtraining_stall_mild`

### Recovery Observation
- `shared_observation_recovery_after_stress`
- preferred target: `lc_recovery_observation_basics`
- fallback if Phase 74 scope stays smaller: keep temporarily, then move in Phase 75

## Keep As-Is

These current mappings already feel semantically stable and should not be touched first:
- `lc_rootzone_oxygen_basics`
- `lc_airflow_fundamentals`
- `lc_ph_nutrient_uptake_basics`
- core watering mappings on true watering events
