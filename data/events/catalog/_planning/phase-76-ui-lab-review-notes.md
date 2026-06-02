# Phase 76 UI-Lab Review Notes

## Current Strengths
- full catalog remains structurally clean
- real adapter output is stable
- all viewports reviewed stayed free of horizontal overflow
- compact mode still holds with `0` budget warnings

## Most Important Review Targets
- `shared_rootbound_warning`
- `indoor_vpd_mismatch_veg`
- `indoor_soil_ph_out_of_range`
- `outdoor_heatwave_dry_wind`
- `shared_early_pest_signs_mild`

## Best Current Showcase Events
- `indoor_fan_failure_airflow_drop`
- `indoor_rootzone_airless_medium`
- `shared_observation_recovery_after_stress`

## UI-Lab-Specific Note
Phase 76 fixed a lab-only shape mismatch between adapter output and the existing scenario renderer.
This was required to review the real catalog honestly, but it does not change runtime behavior in the real app.
