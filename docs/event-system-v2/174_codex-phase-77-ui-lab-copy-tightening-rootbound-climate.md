# Phase 77 UI-Lab Copy Tightening + Rootbound/Climate Clarity

## Scope
- targeted copy-only quality pass for five `revise` events from the Phase 76 UI-Lab review
- no runtime expansion
- no event activation
- no save changes
- no UI replacement in the real app
- no new events, learning cards, or chains

## Dirty Worktree Guard
Before editing, the worktree already contained unrelated local changes, including:
- `app.js`
- `index.html`
- `src/i18n/locales/de.json`
- `src/i18n/locales/en.json`
- `src/i18n/locales/es.json`
- additional unrelated app/test/asset files

Phase 77 stayed inside the approved boundary:
- five event files under `data/events/catalog/events/`
- minimal event-specific locale keys in `de/en/es`
- isolated UI-Lab review matrix
- Phase 77 docs only

## Files Changed By Phase 77
- `data/events/catalog/events/shared/shared_rootbound_warning.event.json`
- `data/events/catalog/events/indoor/indoor_vpd_mismatch_veg.event.json`
- `data/events/catalog/events/indoor/indoor_soil_ph_out_of_range.event.json`
- `data/events/catalog/events/outdoor/outdoor_heatwave_dry_wind.event.json`
- `data/events/catalog/events/shared/shared_early_pest_signs_mild.event.json`
- `src/i18n/locales/de.json`
- `src/i18n/locales/en.json`
- `src/i18n/locales/es.json`
- `src/events/v2/ui-lab/qa/EventV2RealCatalogReviewMatrix.js`

## Why These Five Needed Tightening
### `shared_rootbound_warning`
- previous issue: rootbound lesson sounded too close to generic watering coaching
- tightened slots:
  - `title`
  - `symptom`
  - `coach.summary`
  - `coach.why`
  - `aftermath.lesson`
  - event-local option details
- result: pot-size limit and root-room pressure now read faster on phone widths

### `indoor_vpd_mismatch_veg`
- previous issue: VPD terminology felt abstract in compact UI
- tightened slots:
  - `title`
  - `symptom`
  - `coach.summary`
  - `coach.why`
  - `aftermath.lesson`
  - event-local option details
- result: climate imbalance now reads in more human terms without losing system logic

### `indoor_soil_ph_out_of_range`
- previous issue: pH explanation felt more like a lab note than a player decision moment
- tightened slots:
  - `title`
  - `symptom`
  - `coach.summary`
  - `coach.why`
  - `aftermath.lesson`
  - event-local option details
- result: nutrient-uptake framing is clearer and the recommendation path is easier to trust

### `outdoor_heatwave_dry_wind`
- previous issue: heat + dry wind copy stacked too many dense slots at once
- tightened slots:
  - `title`
  - `symptom`
  - `coach.summary`
  - `coach.why`
  - `aftermath.lesson`
  - event-local option details
- result: the combined stressor is clearer and easier to scan at `360px` / `390px`

### `shared_early_pest_signs_mild`
- previous issue: mild pest review beat sounded too busy and slightly too dramatic
- tightened slots:
  - `title`
  - `symptom`
  - `coach.summary`
  - `coach.why`
  - `aftermath.lesson`
  - event-local option details
- result: monitoring-first behavior is clearer and more premium-feeling

## Textbudget Outcome
- no new budget warnings were introduced
- event-local option details let us tighten copy without broadening global option-detail language
- the five targeted events now sit in a safer compact-readability range according to the isolated UI-Lab matrix

## Review Outcome
- all five targeted events moved from `revise` to `watch`
- no event moved in the wrong direction
- no learning-card status regressed

## Buddy / Asset Notes
- no asset files changed
- no priority tier changed
- copy now better supports later Buddy visual planning for:
  - rootbound / repot timing
  - hot wind relief / shade intervention
  - calm underside pest inspection

## Recommendation
Phase 78 should focus on one of two safe content-side directions:
1. `UI-Lab Accept Lift Pass`
2. `Buddy Visual Direction Plan for High-Priority Events`

Primary recommendation: `UI-Lab Accept Lift Pass`
- reason: the red cluster is gone, so the next clean step is lifting the strongest `watch` events toward `accept` without widening scope.
