# Phase 120 -> Phase 121 Plan

Recommended next phase:

`Phase 121: VPD Wide-Hero Candidate 03 Manual Import + Validation`

## Goal
Validate the manually regenerated `indoor_vpd_mismatch_veg` wide-hero candidate.

## Expected File
`assets/events/v2/_generated/full-scene/review/indoor_vpd_mismatch_veg/candidate_full_scene_03.png`

## Validation Checklist
- file exists
- dimensions readable
- ratio approximately 16:9 / wide hero
- no portrait, square, panel, collage, or split-screen format
- VPD / climate mismatch readable
- Buddy is concerned, diagnostic, and close to references
- no readable numbers, labels, units, charts, or display text
- no final assets created
- no AssetRefs activated

## If Candidate 03 Passes
Update the planning draft to use `candidate_full_scene_03.png` as the VPD `sourceCandidate`, then rerun the Phase-119 export readiness gate.

## Still Forbidden
- no Event file changes
- no AssetRefs activated
- no final assets
- no WebP conversion
- no package changes
