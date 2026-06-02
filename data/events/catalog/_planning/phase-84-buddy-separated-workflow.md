# Phase 84 Planning - Buddy Separated Workflow

## Summary
Problem: full-scene generation repeatedly drifts Buddy identity.
Plan: split pipeline into background-only generation + reference-true Buddy overlay + controlled compositing.

## Locked Constraints
- no full-scene Buddy regeneration
- no event/locale/runtime edits
- no integration in this phase

## Preferred Execution Path
1. Background-only generation (3 motifs)
2. Buddy overlay source selection from official references
3. Composite trial pass
4. Composite QA pass with Buddy hard-gate

## Motifs for next trial
- `shared_rootbound_warning`
- `outdoor_heatwave_dry_wind`
- `shared_early_pest_signs_mild`
