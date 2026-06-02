# Phase 79 Event Asset + Buddy Visual System Plan

## Scope
- planning only
- no asset generation
- no image generation
- no runtime changes
- no event activation
- no save changes
- no app UI replacement

## Current Baseline
- events: 22
- learning cards: 9
- chains: 2
- UI-Lab event review: 7 accept / 15 watch / 0 revise
- learning cards: 6 accept / 3 watch / 0 revise

## A) Asset Need Consolidation

### High Priority (9)
- `indoor_heat_stress_air`
- `indoor_light_burn_canopy_top`
- `indoor_overwatering_early`
- `outdoor_early_pest_pressure_leaf_underside`
- `outdoor_heatwave_dry_wind`
- `outdoor_wind_exposure_stem_stress`
- `shared_early_pest_signs_mild`
- `shared_observation_recovery_after_stress`
- `shared_panic_watering_misread`

### Medium Priority (12)
- `indoor_dry_rootball`
- `indoor_fan_failure_airflow_drop`
- `indoor_light_nutrient_tox_early`
- `indoor_overtraining_stall_mild`
- `indoor_rootzone_airless_medium`
- `indoor_vpd_mismatch_veg`
- `outdoor_cold_night_stress`
- `outdoor_heavy_rain_waterlogging_risk`
- `outdoor_pot_dries_by_afternoon`
- `shared_light_distance_error`
- `shared_rootbound_warning`
- `shared_substrate_drainage_compaction`

### Low Priority (1)
- `indoor_soil_ph_out_of_range`

### Watch Events Where Visuals Likely Lift Acceptance
- `shared_rootbound_warning`
- `indoor_vpd_mismatch_veg`
- `outdoor_heatwave_dry_wind`
- `shared_early_pest_signs_mild`
- `outdoor_pot_dries_by_afternoon`
- `outdoor_early_pest_pressure_leaf_underside`
- `outdoor_wind_exposure_stem_stress`

### Accept Events Still Worth Premium Visuals
- `indoor_heat_stress_air`
- `indoor_light_burn_canopy_top`
- `shared_panic_watering_misread`
- `shared_observation_recovery_after_stress`

### Events Where Neutral Fallback Can Stay Longer
- `indoor_soil_ph_out_of_range`
- `indoor_rootzone_airless_medium`
- `shared_substrate_drainage_compaction`

## B) Image Type System

1. `plant_problem_with_buddy`
- plant symptom + Buddy cause hint
- default for stress, watering, root pressure, mild pest states

2. `buddy_explains_system`
- lower symptom drama, stronger coach context
- for VPD, airflow, recovery, timing or training logic

3. `problem_closeup_with_buddy`
- close evidence image (underside, canopy tip, root/pot edge)
- for events where trust depends on visible proof

4. `outdoor_situation_with_buddy`
- sun, wind, rain and location context
- for outdoor rhythm and exposure events

5. `chain_story_visual`
- optional sequence support for chain continuity
- use only for key chain anchor beats

## C) Buddy Pose System

Pose roster:
- `buddy_pointing`
- `buddy_magnifier`
- `buddy_warning`
- `buddy_thinking`
- `buddy_measuring`
- `buddy_airflow_fan`
- `buddy_water_check`
- `buddy_light_check`
- `buddy_root_check`
- `buddy_calm_down`
- `buddy_recovery_observe`

Consistency constraints:
- fixed Buddy base silhouette
- fixed palette family
- fixed face and eye geometry
- fixed line and shading style
- no per-event redesign

## D) Speech Bubble Rules
- purpose: emotional cue and coach intent only
- length: max 2-5 words
- no replacement of core UI text
- no long explanations in the art layer

Use bubbles when:
- fast warning helps scan speed
- event has high ambiguity risk
- Buddy tone improves de-escalation

Skip bubbles when:
- close-up evidence must stay clean
- iconography already communicates clearly
- multilingual variance would reduce readability

Language strategy:
- preferred default: icon-first or text-light bubbles
- if text bubbles are used, keep locale variants separate
- avoid mixed-language single-master assets

## E) Asset Batch 1 Strategy (6-8 Motifs)
Primary batch target count: 8 motifs
- weighted to high-priority watch events plus one anchor accept event

## F) Naming / Path Plan
Preferred structure:
- `assets/events/v2/{eventId}/hero.webp`
- `assets/events/v2/{eventId}/hero@2x.webp`
- `assets/events/v2/{eventId}/fallback.webp`

Format and framing:
- transparent WebP preferred
- ratio target: 4:3 hero safe for current modal crop
- keep symptom and Buddy head inside central safe zone
- avoid clipping near outer 10% margins

## G) Prompt System Blocks For Phase 80
- Buddy Identity Block
- Event Problem Block
- Plant Symptom Block
- Composition Block
- Style Consistency Block
- Negative No-Drift Block
- Output Requirements Block
- Post-Generation QA Block

Skill compatibility note:
- `.codex/skills/buddy-asset-skill/` was not found in this workspace
- this plan stays compatible with `.codex/ASSET_PIPELINE.md` and can be mapped to a future dedicated skill without schema changes

## H) Asset QA Gate For Future Creation
Required pass criteria per asset:
- Buddy identity consistency
- botanically readable symptom
- no exaggerated fake symptom
- mobile-small readability
- no clipped key elements
- event-fit correctness
- UI-Lab hero-frame compatibility
- fallback-safe usage
- no legal or brand-risk elements

## Recommendation
Phase 80 should be `Asset Batch 1 Prompt + QA Blueprint` (still controlled, with no runtime integration).
