# Phase 129 - Event V2 Completion Roadmap

## Completion Track (max 4 phases)

1. **Phase 130: UI-Lab AssetRef Preview Wiring**
- Scope: isolated UI-Lab only.
- Goal: preview `assetRefs.hero` rendering path without app runtime switch.
- Guardrails: no runtime activation, no `assets.cover` write-back.

2. **Phase 131: assets.cover Switch Pilot (3 Events)**
- Scope: 3 event pilot files only.
- Goal: switch `assets.cover.src/fallback` to final WebP for pilot events.
- Validation: full catalog validation + bridge/noop/shadow checks + browser smoke.

3. **Phase 132: assets.cover Full Switch (All 22)**
- Scope: remaining events after pilot success.
- Goal: complete cover-path migration to final WebP.
- Validation: repeat full checks and integrity reports.

4. **Phase 133: Event V2 Preview/Shadow Integration Readiness**
- Scope: preview/shadow path stabilization for visible product readiness.
- Goal: app-store readiness checkpoint for Event V2 visual payload (without gameplay activation flip).

## Why this order
- Catalog + assetRefs are already fully valid.
- UI-Lab first gives a no-risk preview proving data-path behavior.
- Pilot switch limits blast radius before full migration.
