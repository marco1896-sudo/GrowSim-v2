# Phase 111 - Result

## Completed
- High-priority revision wave defined for 4 events.
- Stricter manual generation prompts prepared.
- Round-2 manual import naming and mapping rules fixed.

## Round-2 Expected Import Files
- `indoor_vpd_mismatch_veg__candidate_02.png`
- `indoor_fan_failure_airflow_drop__candidate_02.png`
- `shared_light_distance_error__candidate_02.png`
- `outdoor_heatwave_dry_wind__candidate_03.png`

## Round-2 Import Source
- `assets/events/v2/_generated/maual-import/` (kept as-is)

## Mapping Rule
- `{eventId}__candidate_02.png` -> `candidate_full_scene_02.png`
- `{eventId}__candidate_03.png` -> `candidate_full_scene_03.png`
- No overwrite of existing review files.
- Always hash-compare when target exists.

## Notes
- `outdoor_heatwave_dry_wind` intentionally moved to candidate_03 due to prior candidate_02 hash conflict history.
- This phase prepared prompts and checklist only. No image generation by Codex.

## Recommended Next Step (Phase 112)
Manual generation + import intake round 2, then per-candidate QA pass with accept/revise/reject decisions.
