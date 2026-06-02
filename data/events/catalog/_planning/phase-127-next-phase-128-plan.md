# Phase 127 - Next Phase 128 Plan

## Recommended Phase 128
`Event Catalog AssetRefs Patch (All 22, No assets.cover Switch)`

## Recommended Path
- **Weg A first**: patch `assetRefs` for all 22 events.
- Keep `assets.cover` unchanged in phase 128.

## Scope
1. Write `assetRefs` blocks into all 22 event JSON files.
2. Do not modify `assets.cover.src` and `assets.cover.fallback`.
3. Run full catalog validation + assetref validator + shadow/noop checks.
4. Keep runtime activation out of scope.

## Why This Order
- Lower UI risk.
- Keeps visible rendering path stable.
- Enables metadata-level wiring before visual-source switching.
