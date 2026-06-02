# Phase 78 UI-Lab Accept Lift Pass

## Goal
Lift a small set of strong `watch` events into `accept` through minimal copy and compact-readability improvements only.

## Scope
- no runtime expansion
- no event activation
- no save changes
- no app UI replacement
- no new events
- no new learning cards
- no new chains
- no asset production

## Dirty Worktree Safety
The worktree already contained unrelated local changes before this phase. Phase 78 did not touch:
- `app.js`
- `index.html`
- `sw.js`
- `package.json`

Locale files were already dirty, so edits stayed limited to exact event-specific strings for the five target events.

## Events Reviewed
1. `indoor_heat_stress_air`
2. `indoor_light_burn_canopy_top`
3. `outdoor_pot_dries_by_afternoon`
4. `shared_panic_watering_misread`
5. `shared_substrate_drainage_compaction`

## Per-Event Review
### `indoor_heat_stress_air`
- previous status: `watch`
- problem: compact option details still too long; heat vs watering reflex needed faster readability
- slots improved: option detail copy, compact clarity support
- new status: `accept`

### `indoor_light_burn_canopy_top`
- previous status: `watch`
- problem: mostly residual caution, not a hard copy failure
- slots improved: no broad rewrite needed beyond the already prepared compact-safe wording
- new status: `accept`

### `outdoor_pot_dries_by_afternoon`
- previous status: `watch`
- problem: still leans on later visual distinction for a premium jump
- slots improved: compact-safe option detail wording
- new status: `watch`

### `shared_panic_watering_misread`
- previous status: `watch`
- problem: aftermath and two option details still read too long at compact width
- slots improved: aftermath lesson and option detail copy
- new status: `accept`

### `shared_substrate_drainage_compaction`
- previous status: `watch`
- problem: two drainage/repot details still sat above the compact ceiling
- slots improved: option detail copy
- new status: `accept`

## Textbudget Result
- compact budget warnings reduced from `8` to `0`
- adapter readiness moved from `18 pass / 4 warning / 0 blocked` to `22 pass / 0 warning / 0 blocked`
- no new locale integrity issues introduced

## Buddy / Asset Impact
- no asset files changed
- no priority tiers changed
- `outdoor_pot_dries_by_afternoon` remains the clearest candidate where future visual differentiation matters more than more copy work
