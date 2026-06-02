# Phase 129 - Active AssetRef Validation Report

## Summary
- mode: `active`
- event files checked: `22`
- active assetRefs found: `22`
- assetRefs checked: `22`
- errors: `0`
- warnings: `0`
- infos: `0`
- assets.coverChanged: `false`
- readyForPreview: `true`

## Validation Rules Result
- `assetRefs.hero` exists for all 22 events.
- `assetRefs.fallback` exists for all 22 events.
- `assetRefs.sourceCandidate` exists for all 22 events.
- No forbidden import/staging paths (`_trial_export`, `maual-import`, `_manual_import`) in active refs.
- `revisionStatus` values are valid (`ready`, `usable_with_watch`, `temporary_usable_needs_revision`).
- `sourcePhase` is present in all active refs.

## Status Distribution
- `ready`: `8`
- `usable_with_watch`: `6`
- `temporary_usable_needs_revision`: `8`

## Catalog Coverage Snapshot
- `assets.cover.src` present: `22/22`
- `assets.cover.fallback` present: `22/22`
- `assets.cover` modifications in this phase: `none`
