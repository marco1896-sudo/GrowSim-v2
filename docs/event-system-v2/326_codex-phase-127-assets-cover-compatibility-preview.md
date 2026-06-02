# Phase 127 - assets.cover Compatibility Preview

## Purpose
Validate compatibility between current active `assets.cover` fields and planned final WebP targets.

## Created Preview
- `data/events/catalog/_planning/phase-127-assets-cover-compatibility-preview.json`

## Preview Content
Per event:
- `wouldPatch: false`
- `assetsCoverPreview.src` -> final `hero.webp`
- `assetsCoverPreview.fallback` -> final `fallback.webp`
- `currentCover.src` and `currentCover.fallback` from current event file
- `compatible` flag

## Result
- Preview produced for all 22 events.
- This is non-active metadata only; no `assets.cover` writes were performed.

## Activation Path Recommendation
- Prefer **Weg A** first: add `assetRefs`, keep current `assets.cover` untouched.
- Evaluate **Weg B** later in dedicated UI/preview step.
