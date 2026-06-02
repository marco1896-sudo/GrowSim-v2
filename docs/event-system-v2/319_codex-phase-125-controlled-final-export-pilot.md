# Phase 125 - Controlled Final Export Pilot

## Scope
- Controlled write pilot for exactly three events.
- No event catalog mutation.
- No AssetRef activation.
- No overwrite mode.

## Pilot Events
1. `shared_rootbound_warning`
2. `shared_early_pest_signs_mild`
3. `indoor_light_burn_canopy_top`

## Script Update
- Updated `dev/run-event-v2-final-asset-export.js` with optional CLI filter:
  - `--events eventA,eventB,eventC`
- Default behavior remains unchanged:
  - dry-run by default
  - no write without `--write`
  - no overwrite without `--overwrite`

## Pilot Dry Run
Command used:
`node dev/run-event-v2-final-asset-export.js --draft data/events/catalog/_planning/phase-122-safe-assetref-draft-normalized-v2.json --events shared_rootbound_warning,shared_early_pest_signs_mild,indoor_light_burn_canopy_top --stdout-only`

Result:
- eventsChecked: 3
- sourceCandidatesChecked: 3
- plannedHero: 3
- plannedFallback: 3
- writtenFiles: 0
- errors: 0

## Pilot Write
Command used:
`node dev/run-event-v2-final-asset-export.js --draft data/events/catalog/_planning/phase-122-safe-assetref-draft-normalized-v2.json --events shared_rootbound_warning,shared_early_pest_signs_mild,indoor_light_burn_canopy_top --write --json-report data/events/catalog/_planning/phase-125-pilot-final-export-report.json --md-report data/events/catalog/_planning/phase-125-pilot-final-export-report.md`

Result:
- eventsChecked: 3
- writtenFiles: 6
- conflicts: 0
- missingSources: 0
- invalidFormats: 0
- errors: 0
- warnings: 0

## Produced Files
- `assets/events/v2/final/shared_rootbound_warning/hero.webp`
- `assets/events/v2/final/shared_rootbound_warning/fallback.webp`
- `assets/events/v2/final/shared_early_pest_signs_mild/hero.webp`
- `assets/events/v2/final/shared_early_pest_signs_mild/fallback.webp`
- `assets/events/v2/final/indoor_light_burn_canopy_top/hero.webp`
- `assets/events/v2/final/indoor_light_burn_canopy_top/fallback.webp`
