# Phase 110 - Manual Import Intake

## Scope
- Import source used: `assets/events/v2/_generated/maual-import/` (typo in folder name intentionally preserved).
- No rename/move/delete of source files.
- No overwrite of existing review candidates.

## Intake Summary
- Found files: 20 PNG
- Filename parsing rule primary: `{eventId}__candidate_XX.png`
- Tolerant parsing used for this batch:
  - `{eventId}.png` => assumed `candidate_01`
  - `{eventId} (revision).png` => mapped to `candidate_02`

## Mapping Status Totals
- `mapped_exact`: 1
- `mapped_tolerant_filename`: 19
- `unknown_event_id`: 0
- `unmatched_manual_import`: 0

## Import Result Totals
- `imported`: 0 (all targets already existed before this intake pass)
- `already_imported_same_hash`: 19
- `conflict_target_exists_different_hash`: 1

## Conflict
- Source: `outdoor_heatwave_dry_wind (revision).png`
- Mapped target: `assets/events/v2/_generated/full-scene/review/outdoor_heatwave_dry_wind/candidate_full_scene_02.png`
- Result: `conflict_target_exists_different_hash`
- Action: no overwrite (as required)

## Path Transparency Note
The production import source currently used by this phase is:
- `assets/events/v2/_generated/maual-import/`

This differs from the intended naming (`manual-import`) and is documented only; no automatic renaming was performed.
