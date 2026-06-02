# Phase 89 Result

## Outcome
`isolated_pose_trial_partial_success`

## Pose status
- `buddy_root_check_pointing_down`: `pose_revise`
- `buddy_heat_wind_warning`: `pose_accept`
- `buddy_leaf_check_inspect`: `pose_accept`

## Composite preparation mapping
- `buddy_root_check_pointing_down` -> background: `shared_rootbound_warning` / position: lower-right / scale: 24-30% / flip: allowed if hand direction improves
- `buddy_heat_wind_warning` -> background: `outdoor_heatwave_dry_wind` / position: right-lower / scale: 22-28% / flip: conditional
- `buddy_leaf_check_inspect` -> background: `shared_early_pest_signs_mild` / position: lower-right / scale: 20-26% / flip: usually not needed

## Safety state
- no scene/plant in pose images
- no final assets set
- no assetRefs changed
- no event files changed
- no locale files changed
- no runtime changes
- no integration

## Recommendation for Phase 90
`Controlled Composite Trial (2 accept + 1 revise fallback)`
- run composites first with `buddy_heat_wind_warning` + `buddy_leaf_check_inspect`
- keep `buddy_root_check_pointing_down` as revise candidate or do one focused micro-derivation pass
