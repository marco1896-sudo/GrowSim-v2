# Phase 130 - UI-Lab AssetRef Preview Wiring

## Adapter Analysis
Current UI-Lab image resolution previously used `assets.cover.src` first.

Checked components:
- `src/events/v2/ui-lab/adapter/EventV2AssetResolver.js`
- `src/events/v2/ui-lab/adapter/EventV2CatalogToUiAdapter.js`
- `src/events/v2/ui-lab/EventV2UiLabDataFromCatalog.js`

Internal shape in UI model:
- `uiModel.hero.src`
- `uiModel.hero.fallbackSrc`
- `uiModel.hero.hasHero`
- `uiModel.hero.usedFallback`

## Implemented Preview Fallback Order (UI-Lab only)
1. `event.assetRefs.hero`
2. `event.assets.cover.src`
3. `event.assets.cover.fallback` / placeholder

## Scope Safety
- Isolated to UI-Lab adapter resolver.
- No app runtime path touched.
- No event catalog mutations in this phase.
- No `assets.cover` field changes.
