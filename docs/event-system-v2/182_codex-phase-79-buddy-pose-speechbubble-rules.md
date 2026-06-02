# Phase 79 Buddy Pose + Speech Bubble Rules

## Pose Library

### `buddy_pointing`
- purpose: direct attention to a visible cause
- best for: rootbound, drainage, pot checks
- sample events: `shared_rootbound_warning`, `outdoor_pot_dries_by_afternoon`
- bubble fit: high
- priority: high

### `buddy_magnifier`
- purpose: inspection and evidence framing
- best for: early pests, subtle marks, underside checks
- sample events: `shared_early_pest_signs_mild`, `outdoor_early_pest_pressure_leaf_underside`
- bubble fit: medium
- priority: high

### `buddy_warning`
- purpose: urgent but calm caution
- best for: heat spikes, wind stress, escalation clues
- sample events: `outdoor_heatwave_dry_wind`, `indoor_heat_stress_air`
- bubble fit: high
- priority: high

### `buddy_thinking`
- purpose: de-escalation and diagnosis pause
- best for: misread symptom moments
- sample events: `shared_panic_watering_misread`
- bubble fit: high
- priority: high

### `buddy_measuring`
- purpose: measured setup and parameter checks
- best for: pH, spacing, timing, setup discipline
- sample events: `indoor_soil_ph_out_of_range`, `shared_light_distance_error`
- bubble fit: low
- priority: medium

### `buddy_airflow_fan`
- purpose: airflow and climate relation cue
- best for: VPD and fan/air exchange themes
- sample events: `indoor_vpd_mismatch_veg`, `indoor_fan_failure_airflow_drop`
- bubble fit: medium
- priority: high

### `buddy_water_check`
- purpose: deliberate water decision guidance
- best for: midday drydown, panic-watering prevention
- sample events: `outdoor_pot_dries_by_afternoon`, `shared_panic_watering_misread`
- bubble fit: high
- priority: high

### `buddy_light_check`
- purpose: light distance and load calibration
- best for: light burn and canopy-top pressure
- sample events: `indoor_light_burn_canopy_top`
- bubble fit: high
- priority: medium

### `buddy_root_check`
- purpose: root pressure and pot volume teaching
- best for: rootbound and compaction context
- sample events: `shared_rootbound_warning`, `indoor_rootzone_airless_medium`
- bubble fit: medium
- priority: high

### `buddy_calm_down`
- purpose: recovery framing without panic
- best for: mild stress follow-ups
- sample events: `indoor_overtraining_stall_mild`
- bubble fit: medium
- priority: medium

### `buddy_recovery_observe`
- purpose: positive coaching after stabilization
- best for: recovery beats
- sample events: `shared_observation_recovery_after_stress`
- bubble fit: high
- priority: medium

## Speech Bubble Rules
- max length: 2-5 words
- role: emotional cue only
- never replace core event text
- avoid technical jargon

Good uses:
- `Erst prüfen!`
- `Zu heiss!`
- `Nicht panisch giessen!`
- `Unterseiten checken!`
- `Mehr Luft!`
- `Abstand prüfen!`
- `Wurzeln brauchen Luft!`
- `Kurz beobachten.`

Skip bubble when:
- close-up evidence needs full visual focus
- iconography already carries intent
- bubble would duplicate title or coach text

Localization guidance:
- safest default for production scale: icon-led or very short locale variants
- do not hard-bake one language into a shared master asset set
- keep bubble text as overlay-ready variant or locale-specific export
