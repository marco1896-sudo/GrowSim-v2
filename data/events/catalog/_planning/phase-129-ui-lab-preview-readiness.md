# Phase 129 - UI-Lab Preview Readiness

## Result
`ui_lab_assetref_ready: yes_with_small_adapter_step`

## Current State (Read-only)
- UI-Lab mapping path currently resolves hero image from `assets.cover`.
- Relevant files:
  - `src/events/v2/ui-lab/adapter/EventV2AssetResolver.js`
  - `src/events/v2/ui-lab/contracts/EventV2UiSlotContract.js`
  - `src/events/v2/ui-lab/EventV2UiLabDataFromCatalog.js`
- Active catalog now contains valid `assetRefs` for all 22 events.

## Blockers
- No structural blocker in catalog data.
- Only adapter behavior blocker: resolver does not yet prioritize `assetRefs.hero`.

## Minimal Next Step
- In isolated UI-Lab scope only, add a safe resolver fallback order:
  1. `assetRefs.hero`
  2. `assets.cover.src`
  3. `assets.cover.fallback`
- Keep app runtime and live UI unchanged.

## Risk
- Low, if change remains isolated to UI-Lab adapter path.
