# Codex Phase 108 - Complete Event Asset Production Queue

## Catalog Coverage

Read-only verification:

- event IDs checked: `22`
- learning cards: `9`
- chains: `2`

## Current Known Candidate Baseline

1. `shared_rootbound_warning`
- status: `promotion_ready_candidate`
- QA: `19/20`
- candidate: `assets/events/v2/_generated/review/shared_rootbound_warning/candidate_full_scene_02.png`

2. `shared_early_pest_signs_mild`
- status: `promotion_ready_candidate`
- QA: `19/20`
- candidate: `assets/events/v2/_generated/full-scene/review/shared_early_pest_signs_mild/candidate_full_scene_01.png`

3. `outdoor_heatwave_dry_wind`
- status: `revision_needed`
- candidate: `assets/events/v2/_generated/full-scene/review/outdoor_heatwave_dry_wind/candidate_full_scene_02.png`
- note: revision gain not proven versus prior baseline

4. `indoor_vpd_mismatch_veg`
- imported full-scene candidate in repo: not found
- status: `manual_generation_ready`
- note: if manually generated candidate appears, apply stricter event-fit check (not friendly/happy Buddy tone)

## Full Event Status Matrix

| Event ID | Category | Status | Notes |
|---|---|---|---|
| `shared_rootbound_warning` | water | `promotion_ready_candidate` | style anchor |
| `shared_early_pest_signs_mild` | pest | `promotion_ready_candidate` | strong trial candidate |
| `outdoor_heatwave_dry_wind` | environment | `revision_needed` | candidate exists, no proven improvement |
| `indoor_vpd_mismatch_veg` | environment | `manual_generation_ready` | high-value next target |
| `indoor_light_burn_canopy_top` | environment | `manual_generation_ready` | high symptom clarity |
| `indoor_soil_ph_out_of_range` | nutrition | `manual_generation_ready` | strong learning value |
| `outdoor_pot_dries_by_afternoon` | water | `manual_generation_ready` | simple high-impact scenario |
| `outdoor_early_pest_pressure_leaf_underside` | pest | `manual_generation_ready` | strong buddy inspection fit |
| `shared_substrate_drainage_compaction` | water | `manual_generation_ready` | good root/substrate storytelling |
| `indoor_rootzone_airless_medium` | water | `manual_generation_ready` | rootzone coaching scenario |
| `indoor_fan_failure_airflow_drop` | environment | `manual_generation_ready` | airflow cue visibility |
| `shared_panic_watering_misread` | water | `manual_generation_ready` | player mistake coaching |
| `indoor_dry_rootball` | water | `manual_generation_ready` | water-state readability |
| `indoor_heat_stress_air` | environment | `manual_generation_ready` | climate stress family |
| `indoor_light_nutrient_tox_early` | nutrition | `manual_generation_ready` | nuanced nutrient/light cue |
| `indoor_overwatering_early` | water | `manual_generation_ready` | complementary water warning |
| `outdoor_cold_night_stress` | environment | `low_priority_later` | lower immediate demo impact |
| `outdoor_heavy_rain_waterlogging_risk` | water | `low_priority_later` | weather edge case |
| `outdoor_wind_exposure_stem_stress` | environment | `low_priority_later` | overlaps airflow/wind queue |
| `shared_light_distance_error` | environment | `low_priority_later` | can follow light burn |
| `indoor_overtraining_stall_mild` | special | `low_priority_later` | later coaching wave |
| `shared_observation_recovery_after_stress` | positive | `low_priority_later` | recovery/positive beat |

## Batch Sequence (Manual Production)

### Batch 3 - Indoor Core Problems

- `indoor_vpd_mismatch_veg`
- `indoor_light_burn_canopy_top`
- `indoor_soil_ph_out_of_range`

### Batch 4 - Water / Rootzone / Substrate

- `outdoor_pot_dries_by_afternoon`
- `shared_substrate_drainage_compaction`
- `indoor_rootzone_airless_medium`

### Batch 5 - Airflow / Environment

- `indoor_fan_failure_airflow_drop`
- `indoor_heat_stress_air`
- `outdoor_wind_exposure_stem_stress`

### Batch 6 - Pest / Observation / Recovery

- `outdoor_early_pest_pressure_leaf_underside`
- `shared_observation_recovery_after_stress`
- `indoor_light_nutrient_tox_early`

### Batch 7 - Player Mistakes / Training

- `indoor_overtraining_stall_mild`
- `shared_panic_watering_misread`
- `indoor_overwatering_early`

### Batch 8 - Later / Seasonal / Secondary

- `outdoor_cold_night_stress`
- `outdoor_heavy_rain_waterlogging_risk`
- `shared_light_distance_error`
- `indoor_dry_rootball`

## Per-Event Compact Production Data (Queue)

Common required references for all queue entries:

- `assets/buddy referenz/master/buddy_master_front_neutral_arms_down_v1.png`
- `assets/buddy referenz/master/buddy_master_side_neutral_profile_v1.png`
- style: `assets/events/v2/_generated/review/shared_rootbound_warning/candidate_full_scene_02.png`
- optional: `assets/buddy referenz/master/buddy_master_front_happy_open_arms_v1.png`

Output naming in manual import folder:

```text
assets/events/v2/_manual_import/full-scene/{eventId}__candidate_01.png
```

Review target mapping after import:

```text
assets/events/v2/_generated/full-scene/review/{eventId}/candidate_full_scene_01.png
```

### Batch 3

`indoor_vpd_mismatch_veg`
- buddy action: focused/concerned climate coach (not happy)
- image content: indoor veg climate mismatch stress, recoverable
- QA focus: event-fit over decorative scene

`indoor_light_burn_canopy_top`
- buddy action: points at top-canopy stress zone
- image content: mild-to-moderate top light burn cues
- QA focus: canopy readability and no overdrama

`indoor_soil_ph_out_of_range`
- buddy action: explains rootzone/uptake mismatch
- image content: subtle pH-related stress signs, recoverable
- QA focus: botanical plausibility and clear context

### Batch 4

`outdoor_pot_dries_by_afternoon`
- buddy action: warns about afternoon dry pot stress
- image content: outdoor pot drying pattern in warm daylight
- QA focus: dryness readability without dead plant

`shared_substrate_drainage_compaction`
- buddy action: points to compacted substrate/rootzone issue
- image content: drainage compaction clues in substrate/pot context
- QA focus: substrate cue clarity

`indoor_rootzone_airless_medium`
- buddy action: cautious rootzone oxygen warning
- image content: heavy/wet/airless medium visual cues
- QA focus: rootzone plausibility

### Batch 5

`indoor_fan_failure_airflow_drop`
- buddy action: airflow warning
- image content: indoor stagnant air context around stressed canopy
- QA focus: airflow issue legibility

`indoor_heat_stress_air`
- buddy action: temperature stress coaching
- image content: indoor heat stress with non-catastrophic cues
- QA focus: distinguish from light burn

`outdoor_wind_exposure_stem_stress`
- buddy action: wind stress caution
- image content: stem/leaf wind strain without disaster
- QA focus: wind-specific stress signals

### Batch 6

`outdoor_early_pest_pressure_leaf_underside`
- buddy action: underside inspection
- image content: early mild pest traces, no monsters
- QA focus: mild but visible pest pattern

`shared_observation_recovery_after_stress`
- buddy action: calm progress confirmation
- image content: recovering plant state, subtle improvement
- QA focus: positive but realistic recovery

`indoor_light_nutrient_tox_early`
- buddy action: cautious mixed-cause warning
- image content: early nutrient/light tox hints, not severe
- QA focus: ambiguity control and plausibility

### Batch 7

`indoor_overtraining_stall_mild`
- buddy action: technique caution
- image content: mild training stall signs
- QA focus: no damage exaggeration

`shared_panic_watering_misread`
- buddy action: correction coach
- image content: overreaction watering context
- QA focus: behavior-learning clarity

`indoor_overwatering_early`
- buddy action: gentle water restraint warning
- image content: early overwatering cues
- QA focus: distinguish from drought/root issues

### Batch 8

`outdoor_cold_night_stress`
- buddy action: cold-night warning
- image content: cool outdoor dawn/night stress hints
- QA focus: temperature cue clarity

`outdoor_heavy_rain_waterlogging_risk`
- buddy action: waterlogging risk warning
- image content: soaked outdoor conditions, recoverable plant
- QA focus: risk-vs-damage balance

`shared_light_distance_error`
- buddy action: spacing correction
- image content: light-distance mismatch context
- QA focus: clear source of stress

`indoor_dry_rootball`
- buddy action: rootball moisture warning
- image content: dry rootball stress context
- QA focus: rootball-specific readability

