# Phase 127 - Activation Gate Checklist

## Required Before Activation
1. 22/22 `hero.webp` exist under `assets/events/v2/final/{eventId}/hero.webp`.
2. 22/22 `fallback.webp` exist under `assets/events/v2/final/{eventId}/fallback.webp`.
3. AssetRef validator returns `0` errors.
4. Final export report confirms `all22Ready: true`.
5. Non-active assetRef patch draft is complete for all 22 events.
6. `assets.cover` compatibility preview is complete for all 22 events.
7. No missing target files.
8. No reject assets in planned mapping.
9. Watch/revision assets explicitly accepted as trial state.
10. Marco explicit approval is given for:
   - activating `assetRefs`
   - optional `assets.cover` switch

## Activation Strategy Decision
- Recommended first step: **Weg A**
  - add `assetRefs` only
  - keep `assets.cover` unchanged
  - lower UI regression risk

- Deferred step: **Weg B**
  - switch `assets.cover.src/fallback` to final WebP paths
  - do only after dedicated preview/validation phase

## Hard Stop Conditions
- Any missing hero/fallback file
- Any validator error
- Any unresolved schema/path issue
- No explicit activation approval
