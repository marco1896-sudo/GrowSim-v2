# Phase 127 - Non-Active AssetRef Patch Draft

## Purpose
Prepare a complete non-active patch draft for all 22 events without touching productive event files.

## Created Draft
- `data/events/catalog/_planning/phase-127-non-active-assetref-patch-draft.json`

## Draft Properties
- entries: 22
- `wouldPatch`: always `false`
- includes per event:
  - `targetEventFile`
  - `assetRefs.hero`
  - `assetRefs.fallback`
  - `assetRefs.sourceCandidate`
  - `assetRefs.status`
  - `assetRefs.revisionStatus`
  - `assetRefs.sourcePhase`
  - `assetRefs.notes`

## Safety
- no event JSON mutations
- no active AssetRef wiring
- no runtime/UI/save/locale mutation
