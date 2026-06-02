# Phase 113 - Safe AssetRef Draft

## Purpose
Provide a non-activated AssetRef draft for all 22 events. This draft is stored under `_planning` only.

## Planned Structure
```json
{
  "assetRefs": {
    "hero": "assets/events/v2/final/{eventId}/hero.webp",
    "hero2x": "assets/events/v2/final/{eventId}/hero@2x.webp",
    "fallback": "assets/events/v2/final/{eventId}/fallback.webp",
    "sourceCandidate": "assets/events/v2/_generated/full-scene/review/{eventId}/candidate_full_scene_X.png",
    "status": "trial_asset_set_v1"
  }
}
```

## AssetRef Draft Count
- Event drafts: 22
- JSON file: `data/events/catalog/_planning/phase-113-safe-assetref-draft.json`
