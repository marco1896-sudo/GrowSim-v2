# Phase 18 Asset Gap Report (Mini Catalog)

## Scope
- Mini-Catalog only (12 events, 3 learning-cards)
- No new image generation, no conversion

## Applied Hardening
- All event `assets.cover.src` and `assets.cover.fallback` were normalized to:
  - `assets/events/event-stress-recovery.png`
- All event `assets.spriteOverlays.*` were normalized to the same existing fallback asset.
- All learning-card `presentation.preferredHeroAsset` were normalized to the same existing fallback asset.

## Remaining Gaps
1. Preferred `.webp` policy is not fulfilled yet for these refs.
   - Current fallback file exists as `.png`.
   - Validator warns via `asset_integrity_extension_check`.
2. `asset_refs_missing_assets_block` still appears for 3 learning-card entries in the current validator logic.
   - This is expected with the current learning-card shape and validator rule set.

## Proposed Phase-19 Follow-up
- Introduce/point to real V2 mini-catalog-specific `.webp` assets in an asset-only pass.
- Revisit validator behavior for learning-card asset blocks (rule-scope tuning), still read-only and without runtime integration.
