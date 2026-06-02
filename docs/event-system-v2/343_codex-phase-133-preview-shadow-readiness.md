# Phase 133 - Preview / Shadow Readiness

## Existing Paths
- UI-Lab surface exists and maps catalog events via:
  - `src/events/v2/ui-lab/EventV2UiLabDataFromCatalog.js`
  - `src/events/v2/ui-lab/adapter/EventV2CatalogToUiAdapter.js`
  - `src/events/v2/ui-lab/adapter/EventV2AssetResolver.js`
- Shadow/Noop bridge path exists with catalog probes and combined checks.
- Browser bridge candidate test harness exists.

## Image Path Reading
- Current resolver reads with priority:
  1. `assetRefs.hero`
  2. `assets.cover.src`
  3. `assets.cover.fallback`
  4. placeholder

## Readiness Status
- `ready_for_ui_lab_preview`
- `ready_for_shadow_preview`
- `event_center`: `needs_preview_adapter`

## Risk Notes
- No runtime blocker for preview/lab/shadow validation.
- Event center still needs isolated adapter/surface to render Event V2 preview model directly.
