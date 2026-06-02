# Phase 120 - VPD Format Correction

## Event
`indoor_vpd_mismatch_veg`

## Problem
The VPD source candidate is the only current export-readiness blocker.

Phase-119 reported:
- existing source: yes
- dimensions: 1448x1086
- ratio: 1.3333
- status: `blocked_invalid_format`

## Local Path Clarification
The normalized Phase-118 draft and Phase-119 report point to:

`assets/events/v2/_generated/full-scene/review/indoor_vpd_mismatch_veg/candidate_full_scene_01.png`

The Phase-120 request names `candidate_full_scene_02.png`, but that file is not present locally.

## Strategy Decision
`manual_regeneration_required`

## Why
The existing 4:3 candidate is not a clean candidate for a simple crop or canvas extension:
- cropping risks removing plant/pot/Buddy/tent context
- padding would create a fake wide hero
- stretching is forbidden because it would distort Buddy and the plant

The correct fix is a true new wide-hero image generated manually with active Buddy references.

## Target Candidate
`assets/events/v2/_generated/full-scene/review/indoor_vpd_mismatch_veg/candidate_full_scene_03.png`

Current status:

`candidate_full_scene_03.png` is not present yet.

