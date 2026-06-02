# Phase 119 - Source Candidate Existence Report

## Goal
Check whether every `sourceCandidate` from the normalized Phase-118 AssetRef draft exists and is technically suitable for later final export.

## Inputs
- `data/events/catalog/_planning/phase-118-safe-assetref-draft-normalized.json`
- `data/events/catalog/_planning/phase-118-non-active-assetref-patch-preview.json`
- `data/events/catalog/_planning/phase-118-normalized-assetref-validation-report.json`
- `data/events/catalog/_planning/phase-112-trial-asset-set-v1.json`
- `data/events/catalog/_planning/phase-112-later-asset-polish-backlog.md`

## Report Outputs
- `data/events/catalog/_planning/phase-119-source-candidate-existence-report.json`
- `data/events/catalog/_planning/phase-119-source-candidate-existence-report.md`

## Summary
- Events checked: 22
- Source candidates checked: 22
- Existing source candidates: 22
- Missing source candidates: 0
- Wide-Hero compatible: 21
- `export_ready`: 8
- `export_ready_with_watch`: 13
- blocked: 1

## Blocker
`indoor_vpd_mismatch_veg`

Reason:
- source exists
- dimensions: 1448x1086
- ratio: 1.3333
- export readiness: `blocked_invalid_format`

This confirms the earlier Phase-112 polish warning that the VPD asset has a format-ratio risk.

## Non-Blocking Watch Set
13 assets are technically exportable but carry watch or polish status. They can be used for trial export later, but polish notes should remain attached.

## Export Permission
`canExportNow` remains `false` for every Event because WebP tooling is not configured and final export is not approved in Phase 119.

