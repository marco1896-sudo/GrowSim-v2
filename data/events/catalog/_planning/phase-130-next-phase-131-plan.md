# Phase 130 - Next Phase 131 Plan

## Recommended Phase 131
`assets.cover Switch Pilot (3 Events)`

## Pilot Events
1. `shared_rootbound_warning`
2. `shared_early_pest_signs_mild`
3. `indoor_light_burn_canopy_top`

## Scope
- Update only these 3 event files:
  - `assets.cover.src` -> final `hero.webp`
  - `assets.cover.fallback` -> final `fallback.webp`
- Keep `assetRefs` unchanged.
- No runtime activation.

## Exit Criteria
- 3-event pilot catalog validation green.
- Asset integrity and bridge/noop checks green.
- Browser/UI-lab smoke without broken image paths.
