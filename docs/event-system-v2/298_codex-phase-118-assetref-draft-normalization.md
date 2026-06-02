# Phase 118 - AssetRef Draft Normalization

## Goal
Normalize the safe AssetRef draft from Phase 113 so the Phase 117 validator can run without legacy-field warnings.

## Source
- `data/events/catalog/_planning/phase-113-safe-assetref-draft.json`
- `data/events/catalog/_planning/phase-117-assetref-validation-report.json`
- `dev/run-event-v2-assetref-validation.draft.js`

## Output
Created:

`data/events/catalog/_planning/phase-118-safe-assetref-draft-normalized.json`

## Normalization Rules Applied
- All 22 AssetRef drafts were preserved.
- `trialCategory` was removed from every AssetRef draft.
- `revisionStatus` was added from the former `trialCategory` value.
- `sourcePhase: "phase-112"` was added to every AssetRef draft.
- Asset paths were not changed.
- Event files were not changed.

## Mapping
- `trialCategory: "ready"` -> `revisionStatus: "ready"`
- `trialCategory: "usable_with_watch"` -> `revisionStatus: "usable_with_watch"`
- `trialCategory: "temporary_usable_needs_revision"` -> `revisionStatus: "temporary_usable_needs_revision"`

## Counts
- Normalized AssetRefs: 22
- Removed `trialCategory` fields: 22
- Added `sourcePhase` fields: 22
- Unknown trial categories: 0

## Validator Result
The normalized draft was validated with:

```bash
node dev/run-event-v2-assetref-validation.draft.js --draft data/events/catalog/_planning/phase-118-safe-assetref-draft-normalized.json --report data/events/catalog/_planning/phase-118-normalized-assetref-validation-report.json
```

Result:
- errors: 0
- warnings: 0
- infos: 44

The 44 infos are expected because final `hero.webp` and `fallback.webp` files are planned but not exported yet.

