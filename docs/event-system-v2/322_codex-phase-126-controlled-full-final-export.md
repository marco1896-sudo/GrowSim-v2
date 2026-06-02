# Phase 126 - Controlled Full Final Export (Remaining 19)

## Scope
- Export the remaining 19 events after Phase 125 pilot.
- Keep event catalog and AssetRefs unchanged.
- No overwrite mode.

## Remaining Event Set
Source:
- `data/events/catalog/_planning/phase-126-remaining-export-events.json`

Count:
- 19 events (22 total minus 3 pilot events).

## Dry Run (19 Events)
Command:
- `node dev/run-event-v2-final-asset-export.js --draft data/events/catalog/_planning/phase-122-safe-assetref-draft-normalized-v2.json --events <19-events> --stdout-only`

Result:
- eventsChecked: 19
- plannedHero: 19
- plannedFallback: 19
- writtenFiles: 0
- conflicts: 0
- missingSources: 0
- invalidFormats: 0
- errors: 0

## Write Run (19 Events)
Command:
- `node dev/run-event-v2-final-asset-export.js --draft data/events/catalog/_planning/phase-122-safe-assetref-draft-normalized-v2.json --events <19-events> --write --json-report data/events/catalog/_planning/phase-126-full-final-export-report.json --md-report data/events/catalog/_planning/phase-126-full-final-export-report.md`

Result:
- eventsChecked: 19
- writtenFiles: 38
- conflicts: 0
- missingSources: 0
- invalidFormats: 0
- errors: 0

## Safety
- No `--overwrite` used.
- No event files changed.
- No AssetRefs activated.
- No `assets.cover` changes.
