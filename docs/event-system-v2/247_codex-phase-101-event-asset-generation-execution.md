# Phase 101 Event Asset Generation Execution

## Scope
Execution/import status for exactly two Full-Scene Buddy Event V2 assets:
- `outdoor_heatwave_dry_wind`
- `shared_early_pest_signs_mild`

## Result
`manual_generation_required`

Codex did not generate images because the available image tool in this context cannot pass the local Buddy references and style reference as active image inputs. Text-only Buddy generation remains forbidden.

## Required Active References
Buddy references:
- `assets/buddy referenz/master/buddy_master_front_neutral_arms_down_v1.png`
- `assets/buddy referenz/master/buddy_master_side_neutral_profile_v1.png`
- optional: `assets/buddy referenz/master/buddy_master_front_happy_open_arms_v1.png`

Style reference:
- `assets/events/v2/_generated/review/shared_rootbound_warning/candidate_full_scene_02.png`

Background references:
- `assets/events/v2/_generated/backgrounds/review/outdoor_heatwave_dry_wind/candidate_bg_01.png`
- `assets/events/v2/_generated/backgrounds/review/shared_early_pest_signs_mild/candidate_bg_01.png`

## Candidate Paths
`outdoor_heatwave_dry_wind`:
`assets/events/v2/_generated/full-scene/review/outdoor_heatwave_dry_wind/candidate_full_scene_01.png`

`shared_early_pest_signs_mild`:
`assets/events/v2/_generated/full-scene/review/shared_early_pest_signs_mild/candidate_full_scene_01.png`

## Manual Execution Instruction
Use a generator that can upload and use all required images as active references. Generate exactly one candidate per motif. Save only to the review paths above.

Do not create final assets, do not update assetRefs, and do not integrate.
