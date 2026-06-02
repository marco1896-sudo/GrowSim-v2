# Phase 118 - Non-Active Patch Preview

## Goal
Create a preview of what a future Event catalog AssetRef patch could contain without touching Event files.

## Output
Created:

`data/events/catalog/_planning/phase-118-non-active-assetref-patch-preview.json`

## Safety Rule
Every preview entry has:

```json
{
  "wouldPatch": false
}
```

This file is informational only. It must not be treated as an activation patch.

## Preview Contents
Each of the 22 Event entries includes:
- `eventId`
- `wouldPatch: false`
- `targetEventFile`
- `assetRefsPreview`

The preview preserves:
- `hero`
- `hero2x` where present
- `fallback`
- `sourceCandidate`
- `status: "trial_asset_set_v1"`
- `revisionStatus`
- `sourcePhase: "phase-112"`
- `notes: []`

## Activation Status
No Event files were changed.

No productive `assetRefs` were written.

No final asset files were created.

