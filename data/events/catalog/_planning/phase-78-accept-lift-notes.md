# Phase 78 Accept Lift Notes

## Scope
- targeted accept-lift pass for five previously reviewed `watch` events
- no runtime changes
- no event activation
- no save changes
- no app UI replacement
- no new events, learning cards, or chains

## Dirty Worktree Guard
Before Phase 78 edits, the worktree already had unrelated local changes in files such as:
- `app.js`
- `index.html`
- `src/i18n/locales/de.json`
- `src/i18n/locales/en.json`
- `src/i18n/locales/es.json`

Phase 78 only touched allowed areas:
- the five target event documents already prepared for event-local option detail usage
- minimal locale strings for those events
- isolated UI-Lab review matrix
- Phase 78 planning/docs

## Target Events
1. `indoor_heat_stress_air`
2. `indoor_light_burn_canopy_top`
3. `outdoor_pot_dries_by_afternoon`
4. `shared_panic_watering_misread`
5. `shared_substrate_drainage_compaction`

## Why They Needed Work
- `indoor_heat_stress_air`: compact decision details still ran long and the heat-vs-watering distinction needed faster scan value
- `indoor_light_burn_canopy_top`: already close; the clean light-vs-feed distinction made it acceptable after the last compact review
- `outdoor_pot_dries_by_afternoon`: wording improved, but final premium lift still leans on later visual distinction
- `shared_panic_watering_misread`: compact aftermath and option details still read slightly too long
- `shared_substrate_drainage_compaction`: drainage details were clearer than before but still too long on the compact budget line

## Minimal Copy Tightening Applied
- shortened compact decision details for heat, panic-watering, and drainage events
- shortened one aftermath line for `shared_panic_watering_misread`
- kept titles short and did not widen any decision labels
- preserved event meaning and action logic

## Review Outcome
- `indoor_heat_stress_air`: `watch -> accept`
- `indoor_light_burn_canopy_top`: `watch -> accept`
- `outdoor_pot_dries_by_afternoon`: `watch -> watch`
- `shared_panic_watering_misread`: `watch -> accept`
- `shared_substrate_drainage_compaction`: `watch -> accept`

## Why Outdoor Pot Stays Watch
The current copy is good enough, but the event still depends on later visual differentiation from generic dry-stress beats. Further text tightening alone would likely not create a meaningful premium jump.

## Resulting Matrix Shift
- events: `3 accept / 19 watch / 0 revise` -> `7 accept / 15 watch / 0 revise`
- learning cards: unchanged at `6 accept / 3 watch / 0 revise`
