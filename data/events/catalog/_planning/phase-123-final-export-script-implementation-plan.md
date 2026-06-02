# Phase 123 - Final Export Script Implementation Plan

## Existing Base
`dev/event-v2-export-trial-assets-to-webp.draft.js`

Current capability:
- parses input draft rows
- validates source existence/basic metadata
- plans targets
- writes dry-run report
- does not perform real conversion yet

## Proposed Implementation Path

### Step 1: keep draft-first path
- Create `dev/run-event-v2-final-asset-export.draft.js`.
- Use `phase-122-safe-assetref-draft-normalized-v2.json` as primary input.
- Keep `--write` off by default.

### Step 2: add real converter after approval
- Add `sharp` implementation only after explicit install approval.
- Conversion outputs:
  - `hero.webp`
  - `fallback.webp`
  - optional `hero@2x.webp`

### Step 3: safety behavior
- default mode: dry-run only
- final writes require explicit `--write`
- no overwrite without `--overwrite`
- emit per-file hash, dimensions, bytes report

### Step 4: no catalog mutation
- script does not patch Event files
- script does not activate AssetRefs
- any AssetRef wiring stays in later dedicated phase

## Why no full implementation in Phase 123
- dependency gate intentionally not approved yet
- phase is planning/decision only
