# Codex Phase 109 - Complete Manual Asset Production List

## 1) Executive Summary

This phase switches to a practical bulk workflow:

- prepare all open Event-V2 Full-Scene Buddy assets at once
- generate manually outside Codex
- drop results into one import folder
- let Codex map/import and run QA in the next phase

Binding style direction remains:

```text
reference_locked_full_scene_buddy_event_image
```

## 2) Current Asset Status

Catalog check:

- events checked: `22`
- existing accepted promotion-ready candidates: `2`
- revision-needed candidate: `1`
- open production tasks: `20` (19 new candidate_01 + 1 revision candidate_02)

Known locked candidates:

1. `shared_rootbound_warning` -> `promotion_ready_candidate` (`19/20`)
2. `shared_early_pest_signs_mild` -> `promotion_ready_candidate` (`19/20`)
3. `outdoor_heatwave_dry_wind` -> `revision_needed` (`19/20`, no proven revision gain)

## 3) Complete Production List

Status values used:

- `promotion_ready_candidate`
- `trial_candidate_with_watch`
- `revision_needed`
- `manual_generation_needed`
- `low_priority_later`
- `not_applicable_yet`

| Event ID | Current status | Existing candidate | New image needed | Priority | Reason |
|---|---|---|---|---|---|
| `shared_rootbound_warning` | `promotion_ready_candidate` | yes | no | low | style master already accepted |
| `shared_early_pest_signs_mild` | `promotion_ready_candidate` | yes | no | low | promotion-ready baseline exists |
| `outdoor_heatwave_dry_wind` | `revision_needed` | yes | yes (`candidate_02`) | high | quality strong but revision gain not proven |
| `indoor_vpd_mismatch_veg` | `manual_generation_needed` | no | yes | high | key indoor climate learning event, prior fit issues |
| `indoor_light_burn_canopy_top` | `manual_generation_needed` | no | yes | high | highly visual symptom, strong demo value |
| `indoor_soil_ph_out_of_range` | `manual_generation_needed` | no | yes | high | core nutrition/rootzone education |
| `outdoor_pot_dries_by_afternoon` | `manual_generation_needed` | no | yes | high | simple high-value outdoor water lesson |
| `shared_substrate_drainage_compaction` | `manual_generation_needed` | no | yes | high | strong root/substrate diagnosis use case |
| `indoor_rootzone_airless_medium` | `manual_generation_needed` | no | yes | high | root oxygen logic important for V2 |
| `indoor_fan_failure_airflow_drop` | `manual_generation_needed` | no | yes | high | airflow issue is visually explainable |
| `outdoor_early_pest_pressure_leaf_underside` | `manual_generation_needed` | no | yes | high | clear pest inspection scenario |
| `shared_panic_watering_misread` | `manual_generation_needed` | no | yes | medium | behavior correction event |
| `indoor_heat_stress_air` | `manual_generation_needed` | no | yes | medium | complements indoor climate set |
| `outdoor_wind_exposure_stem_stress` | `manual_generation_needed` | no | yes | medium | complements airflow/wind family |
| `indoor_overwatering_early` | `manual_generation_needed` | no | yes | medium | core water-state warning |
| `indoor_light_nutrient_tox_early` | `manual_generation_needed` | no | yes | medium | nuanced but important mixed stress |
| `indoor_dry_rootball` | `manual_generation_needed` | no | yes | medium | useful water/root warning |
| `indoor_overtraining_stall_mild` | `low_priority_later` | no | yes | low | later wave training nuance |
| `shared_observation_recovery_after_stress` | `low_priority_later` | no | yes | low | positive recovery beat, later |
| `outdoor_cold_night_stress` | `low_priority_later` | no | yes | low | seasonal/secondary priority |
| `outdoor_heavy_rain_waterlogging_risk` | `low_priority_later` | no | yes | low | edge weather case |
| `shared_light_distance_error` | `low_priority_later` | no | yes | low | follows light-burn educationally |

## 4) Batch Order

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
- `outdoor_heatwave_dry_wind` (revision: `candidate_02`)

### Batch 6 - Pest / Observation / Recovery

- `outdoor_early_pest_pressure_leaf_underside`
- `shared_observation_recovery_after_stress`
- `indoor_light_nutrient_tox_early`

### Batch 7 - Player Mistakes / Training

- `indoor_overtraining_stall_mild`
- `shared_panic_watering_misread`
- `indoor_overwatering_early`

### Batch 8 - Remaining / Lower Priority

- `outdoor_cold_night_stress`
- `outdoor_heavy_rain_waterlogging_risk`
- `shared_light_distance_error`
- `indoor_dry_rootball`

## 5) Import Folder + Naming Rule

Single manual input folder:

```text
assets/events/v2/_manual_import/full-scene/
```

Naming:

```text
{eventId}__candidate_01.png
{eventId}__candidate_02.png
```

Mapping:

- `eventId__candidate_01.png` -> `assets/events/v2/_generated/full-scene/review/{eventId}/candidate_full_scene_01.png`
- `eventId__candidate_02.png` -> `assets/events/v2/_generated/full-scene/review/{eventId}/candidate_full_scene_02.png`

## 6) Batch 3 Detailed Prompts

Batch-3 full prompts are provided in:

- [272_codex-phase-109-generation-prompts-all-open-assets.md](C:/Users/Marco/Desktop/Entwicklung/GrowSim-v2-main/docs/event-system-v2/272_codex-phase-109-generation-prompts-all-open-assets.md)

Critical extra rule for `indoor_vpd_mismatch_veg`:

- Buddy must look focused/concerned, not happy
- no readable sensor numbers/units/labels
- event-fit beats tech-aesthetic

## 7) Prompts For Remaining Open Assets

All remaining open-asset prompts are included in:

- [272_codex-phase-109-generation-prompts-all-open-assets.md](C:/Users/Marco/Desktop/Entwicklung/GrowSim-v2-main/docs/event-system-v2/272_codex-phase-109-generation-prompts-all-open-assets.md)

## 8) QA Rules

Per candidate scoring (0-2 each):

1. Buddy reference consistency
2. Buddy situational action
3. Buddy scene integration
4. Event symptom clarity
5. Botanical plausibility
6. Mobile hero readability
7. No overdramatization
8. No text artifacts
9. Brand consistency
10. Premium overall effect

Thresholds:

- `18-20`: accept
- `14-17`: revise
- `<14`: reject

Hard reject if:

- generic/fake Buddy
- sticker look
- wrong/unclear event symptom
- text/speech bubble/logo
- unusable mobile composition

## 9) Next Practical Step

Produce Batch 3 manually and place files in:

```text
assets/events/v2/_manual_import/full-scene/
```

Then run Phase 110 for intake mapping + QA.

