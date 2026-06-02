# Phase 129 - Active AssetRef Validation

## Outcome
Active validation against real catalog event files is green.

- Event files checked: `22`
- Active assetRefs found: `22`
- Errors: `0`
- Warnings: `0`
- Infos: `0`
- `assets.cover` changed: `false`

## Validator Hardening
`dev/run-event-v2-assetref-validation.draft.js` was extended with:
- `--active` alias for active mode
- `--events <dir>` support for explicit catalog directory targeting

This now supports the required invocation shape for real catalog validation:
- `node dev/run-event-v2-assetref-validation.draft.js --active --events data/events/catalog/events --stdout-only`

## Active Checks Covered
- hero/fallback/sourceCandidate existence
- forbidden path guards
- revisionStatus whitelist
- sourcePhase presence
- read-only catalog cover presence snapshot
