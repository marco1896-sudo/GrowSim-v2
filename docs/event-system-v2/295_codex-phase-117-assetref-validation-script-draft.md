# Phase 117 - AssetRef Validation Script Draft

## Goal
Phase 117 adds a dev-only validation guard for future Event-V2 AssetRef activation.

The validator is intentionally a draft:
- no Event files are modified
- no AssetRefs are activated
- no final assets are created
- no WebP conversion is executed
- no `package.json` changes are made

## Script
Created:

`dev/run-event-v2-assetref-validation.draft.js`

## Supported Modes

### Draft Mode
Default mode.

Validates planning drafts such as:
- `data/events/catalog/_planning/phase-113-safe-assetref-draft.json`
- `data/events/catalog/_planning/phase-115-assetref-schema-draft.json`

Draft mode allows final `hero.webp` and `fallback.webp` to be missing and reports them as:

`planned_not_exported_yet`

### Active Mode
Dry-run mode for the real Event catalog:

`data/events/catalog/events/`

Active mode checks:
- existing `assets.cover.src`
- existing `assets.cover.fallback`
- whether root-level `assetRefs` already exist
- whether active AssetRefs would point to valid, existing product paths

Phase 117 does not activate this mode against product changes. It only verifies that the read-only check works.

## Input Compatibility
The Phase-113 draft currently uses `trialCategory` instead of the newer proposed `revisionStatus`.

The validator handles this as a legacy draft field:
- normalizes `trialCategory` to revision status for reporting
- emits `legacy_trialCategory_used` warnings
- does not block the draft

This keeps the pipeline practical while still showing exactly what should be cleaned up before activation.

## Report
Default report:

`data/events/catalog/_planning/phase-117-assetref-validation-report.json`

Current draft report summary:
- `ok`: true
- mode: `draft`
- events checked: 22
- AssetRefs checked: 22
- errors: 0
- warnings: 44
- infos: 44
- ready: 8
- usable with watch: 6
- temporary usable needs revision: 8

## Catalog Read-Only Result
- Event files checked: 22
- active AssetRefs found: 0
- `assets.cover.src` found: 22
- `assets.cover.fallback` found: 22

