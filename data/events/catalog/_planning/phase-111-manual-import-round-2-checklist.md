# Phase 111 Manual Import Round 2 Checklist

Import source:
- `assets/events/v2/_generated/maual-import/`

Expected files:
- `indoor_vpd_mismatch_veg__candidate_02.png`
- `indoor_fan_failure_airflow_drop__candidate_02.png`
- `shared_light_distance_error__candidate_02.png`
- `outdoor_heatwave_dry_wind__candidate_03.png`

Validation steps:
1. Parse filename by `{eventId}__candidate_XX.png`.
2. Confirm eventId exists in catalog.
3. Map to target:
   - candidate_02 -> `assets/events/v2/_generated/full-scene/review/{eventId}/candidate_full_scene_02.png`
   - candidate_03 -> `assets/events/v2/_generated/full-scene/review/{eventId}/candidate_full_scene_03.png`
4. If target exists:
   - hash equal => `already_imported_same_hash`
   - hash different => `conflict_target_exists_different_hash`
5. Never overwrite existing target without explicit approval.
6. Document tolerant filename mapping if needed.
