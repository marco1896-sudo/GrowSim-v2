# Phase 124 - Sharp Install and Export Script

## Scope
- Install `sharp` as approved dependency for Event-V2 asset export tooling.
- Implement controlled final export script with dry-run default.
- Do not write final assets in this phase.
- Do not mutate event catalog files.

## Dependency Decision Applied
- `package-lock.json` indicates npm workflow.
- `sharp` installed as `devDependency` because export is pipeline tooling, not runtime gameplay logic.
- No additional dependencies installed.

## Implemented Script
- `dev/run-event-v2-final-asset-export.js`

### Key Behavior
- Reads draft (default):
  - `data/events/catalog/_planning/phase-122-safe-assetref-draft-normalized-v2.json`
- Default output root:
  - `assets/events/v2/final`
- Dry run by default (no file writes).
- `--write` required for output writes.
- `--overwrite` required to replace existing targets.
- Optional `--include-2x` support.
- Supports `--stdout-only`.
- Generates JSON/Markdown report when not in `--stdout-only` mode.

### Export Parameters
- `hero.webp`: max width 1280, quality 84, keep ratio, no upscale.
- `fallback.webp`: max width 960, quality 78, keep ratio, no upscale.
- `hero@2x.webp`: optional via `--include-2x`, no upscale, minimum source width 2560.

## Safety Guarantees in Script
- Without `--write`: no asset files created.
- Without `--overwrite`: existing targets are reported as conflicts and skipped.
- Event files are never modified.
- AssetRefs are never activated.

## Dry-Run Outcome (Phase 124)
- events checked: 22
- source candidates checked: 22
- planned hero outputs: 22
- planned fallback outputs: 22
- planned hero2x outputs: 0 (`--include-2x` not enabled)
- files written: 0
- conflicts: 0
- missing sources: 0
- invalid formats: 0
- `sharp` version detected: 0.34.5
