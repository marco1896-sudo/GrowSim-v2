# Phase 121 - Export Readiness Update

## Before
Blocker event:

`indoor_vpd_mismatch_veg`

Old source candidate used in readiness reports:

`assets/events/v2/_generated/full-scene/review/indoor_vpd_mismatch_veg/candidate_full_scene_01.png`

Old format:
- 1448x1086
- ratio 1.3333
- status `blocked_invalid_format`

## After
Validated candidate:

`assets/events/v2/_generated/full-scene/review/indoor_vpd_mismatch_veg/candidate_full_scene_03.png`

New format:
- 1659x948
- ratio 1.75
- wide-hero compatible: yes
- status `format_correction_success_with_watch`

## Readiness Impact
- blocker resolved: yes
- updated per-event readiness: `export_ready_with_watch`
- wide-hero compatibility target: now effectively 22/22 if source pointer is updated in next planning draft step

## Important Planning Note
The current normalized Phase-118 draft still points to `candidate_full_scene_01.png` for this event. A non-active sourceCandidate update preview was created for Phase 122 follow-up.
