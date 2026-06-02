# Codex Phase 106 - Event Asset Backlog Overview

## Scope

Phase 106 is a read-only asset backlog and prioritization pass.

- No image generation
- No asset integration
- No AssetRef changes
- No runtime/app/event/locale changes

## Catalog Verification

Verified current catalog counts:

- Events: `22`
- Learning cards: `9`
- Chains: `2`

## Asset Inventory Snapshot

Observed generated review assets:

- Full-scene candidates present: `3` (Rootbound style candidate, Early Pest full-scene candidate, Heat/Wind full-scene candidate)
- Background-only candidates present: `3`
- Final asset directories under `assets/events/v2/final/`: none present

## Event Status Matrix

Status values used:

- `full_scene_promotion_ready`
- `full_scene_revision_pending`
- `manual_generation_ready`
- `background_available_needs_full_scene`
- `needs_background_or_prompt_prep`
- `low_priority_later`
- `not_applicable_yet`

| Event ID | Category | Full-scene candidate found | Background candidate found | Event JSON assetRef hint | Status | Notes |
|---|---|---|---|---|---|---|
| `shared_rootbound_warning` | water | `assets/events/v2/_generated/review/shared_rootbound_warning/candidate_full_scene_02.png` | yes | no | `full_scene_promotion_ready` | QA 19/20, style anchor |
| `shared_early_pest_signs_mild` | pest | `assets/events/v2/_generated/full-scene/review/shared_early_pest_signs_mild/candidate_full_scene_01.png` | yes | no | `full_scene_promotion_ready` | QA 19/20 |
| `outdoor_heatwave_dry_wind` | environment | `assets/events/v2/_generated/full-scene/review/outdoor_heatwave_dry_wind/candidate_full_scene_02.png` | yes | no | `full_scene_revision_pending` | QA 19/20, revision gain not proven |
| `indoor_vpd_mismatch_veg` | environment | no | no | no | `manual_generation_ready` | high demo and coaching value |
| `indoor_light_burn_canopy_top` | environment | no | no | no | `manual_generation_ready` | visually clear canopy symptom |
| `indoor_soil_ph_out_of_range` | nutrition | no | no | no | `manual_generation_ready` | high learning value |
| `outdoor_pot_dries_by_afternoon` | water | no | no | no | `manual_generation_ready` | strong behavior/event clarity |
| `outdoor_early_pest_pressure_leaf_underside` | pest | no | no | no | `manual_generation_ready` | strong close-up pest cue potential |
| `shared_substrate_drainage_compaction` | water | no | no | no | `manual_generation_ready` | root/media symptom can be visualized well |
| `indoor_rootzone_airless_medium` | water | no | no | no | `manual_generation_ready` | clear instructional rootzone scene |
| `indoor_fan_failure_airflow_drop` | environment | no | no | no | `manual_generation_ready` | strong airflow coaching opportunity |
| `shared_panic_watering_misread` | water | no | no | no | `manual_generation_ready` | behavior correction event, coach-friendly |
| `indoor_overtraining_stall_mild` | special | no | no | no | `low_priority_later` | useful, but lower urgency than core climate/water cues |
| `shared_observation_recovery_after_stress` | positive | no | no | no | `low_priority_later` | positive beat, better after core warning set |
| `indoor_dry_rootball` | water | no | no | no | `low_priority_later` | related to water set, second wave |
| `indoor_heat_stress_air` | environment | no | no | no | `low_priority_later` | partly overlapping with Heat/Wind family |
| `indoor_light_nutrient_tox_early` | nutrition | no | no | no | `low_priority_later` | nuanced symptom, later wave |
| `indoor_overwatering_early` | water | no | no | no | `low_priority_later` | covered by panic/drainage set first |
| `outdoor_cold_night_stress` | environment | no | no | no | `low_priority_later` | less immediate than heat/airflow demos |
| `outdoor_heavy_rain_waterlogging_risk` | water | no | no | no | `low_priority_later` | weather edge case, later wave |
| `outdoor_wind_exposure_stem_stress` | environment | no | no | no | `low_priority_later` | overlaps with airflow/wind family |
| `shared_light_distance_error` | environment | no | no | no | `low_priority_later` | can follow light-burn hero |

Note: Event JSON scan found no existing final assetRef hints in current event files.

## Known Candidate Lock

The following statuses are carried forward as binding baseline:

- `shared_rootbound_warning`: `full_scene_promotion_ready` (`19/20`)
- `shared_early_pest_signs_mild`: `full_scene_promotion_ready` (`19/20`)
- `outdoor_heatwave_dry_wind`: `full_scene_revision_pending` (`19/20`, no proven revision gain)
