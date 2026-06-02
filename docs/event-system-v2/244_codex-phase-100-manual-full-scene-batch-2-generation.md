# Phase 100 Manual Full-Scene Batch 2 Generation

## Scope
Manual candidate generation/import gate for exactly two motifs:
- `outdoor_heatwave_dry_wind`
- `shared_early_pest_signs_mild`

No image generation was executed by Codex.

## Gate Summary

### `outdoor_heatwave_dry_wind`
- Buddy references active as image inputs: not verified in Codex
- style reference available: true
- background reference available: true
- generator is not text-only: not verified
- output review-only: prepared
- exactly one candidate: pending
- status: `waiting_for_manual_generation`

Expected path:
`assets/events/v2/_generated/full-scene/review/outdoor_heatwave_dry_wind/candidate_full_scene_01.png`

### `shared_early_pest_signs_mild`
- Buddy references active as image inputs: not verified in Codex
- style reference available: true
- background reference available: true
- generator is not text-only: not verified
- output review-only: prepared
- exactly one candidate: pending
- status: `waiting_for_manual_generation`

Expected path:
`assets/events/v2/_generated/full-scene/review/shared_early_pest_signs_mild/candidate_full_scene_01.png`

## Decision
Because active image-reference input handoff is not available in this Codex context, no generation was attempted.

Text-only Buddy generation remains forbidden.

## Manual Generation Rule
Generate at most one candidate per motif outside Codex using:
- official Buddy references
- `candidate_full_scene_02.png` style reference
- motif-specific background reference

Then place each output only at its review path.
