# Phase 131 - assets.cover Switch Pilot

## Scope
Pilot migration for exactly 3 event files:
- `shared_rootbound_warning`
- `shared_early_pest_signs_mild`
- `indoor_light_burn_canopy_top`

## Changes
Only these fields were updated per pilot event:
- `assets.cover.src`
- `assets.cover.fallback`

Target values:
- `assets.cover.src` -> `assets/events/v2/final/{eventId}/hero.webp`
- `assets.cover.fallback` -> `assets/events/v2/final/{eventId}/fallback.webp`

## Guardrails
- `assetRefs` unchanged.
- no runtime/app UI/save/locale file changes.
- no overwrite behavior.
- no event activation.
