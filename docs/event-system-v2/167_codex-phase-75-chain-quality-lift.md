# Phase 75 - Chain Quality Lift

## Goal
Sharpen the two existing catalog chains so they read more clearly in authoring, cross-reference validation, UI-Lab review, and later runtime planning, without adding runtime behavior.

## Chain State Before Phase 75
### watering_rootzone_chain
- already coherent on cause/effect
- used generic step IDs (`step_signal`, `step_drypot`, `step_drainage`, `step_rootzone`, `step_recover`)
- branch intent was understandable in code, but only moderately readable in review

### airflow_climate_chain
- already coherent on high-level theme
- mixed indoor airflow, VPD, heat, and outdoor exposure well enough
- branch semantics needed clearer naming so the outdoor sequence reads as a related climate/exposure branch rather than a separate chain

## Changes Applied
### watering_rootzone_chain
- stronger title/summary copy in `de/en/es`
- clearer authoring step IDs
- slightly more honest span window
- matching `chainHooks` refresh in the affected events

### airflow_climate_chain
- stronger title/summary copy in `de/en/es`
- clearer authoring step IDs
- matching `chainHooks` refresh in the affected events

## Why No New Chain Fields Were Added
The current catalog schema supports:
- chain title
- summary
- step IDs
- event references
- transitions
- uiBanner

It does not yet define dedicated step-label or step-reasoning fields. This phase therefore improved clarity through the fields that already exist, instead of inventing a parallel authoring structure.

## Updated Chain Readability
### watering_rootzone_chain now reads as:
- misread watering signal
- outdoor dryback branch
- drainage lock / compaction
- root-zone oxygen drop
- calm recovery observation

### airflow_climate_chain now reads as:
- airflow drop indoors
- VPD drift
- heat pressure
- outdoor exposure branch
- outdoor dry-wind end state

## Files Touched for CrossRef Consistency
### Chains
- `data/events/catalog/chains/watering_rootzone_chain.chain.json`
- `data/events/catalog/chains/airflow_climate_chain.chain.json`

### Events with updated chainHooks
- `data/events/catalog/events/shared/shared_substrate_drainage_compaction.event.json`
- `data/events/catalog/events/outdoor/outdoor_pot_dries_by_afternoon.event.json`
- `data/events/catalog/events/indoor/indoor_rootzone_airless_medium.event.json`
- `data/events/catalog/events/indoor/indoor_vpd_mismatch_veg.event.json`
- `data/events/catalog/events/indoor/indoor_heat_stress_air.event.json`
- `data/events/catalog/events/outdoor/outdoor_wind_exposure_stem_stress.event.json`

### Locale updates
- `src/i18n/locales/de.json`
- `src/i18n/locales/en.json`
- `src/i18n/locales/es.json`
