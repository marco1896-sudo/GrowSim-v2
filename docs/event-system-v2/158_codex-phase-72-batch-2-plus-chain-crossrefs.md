# Phase 72: Remaining 2 Events + 2 Chains + CrossRefs

## Ziel

Phase 72 schliesst den geplanten Mini-Catalog-Ausbau aus Phase 70 data-only ab:

- +2 Events
- +2 Chains
- CrossRefs und Learning-Links sauberziehen
- alte 12er-Matrixannahme entfernen
- keine Runtime-Ausweitung

## Neue Dateien

### Events
- `data/events/catalog/events/indoor/indoor_overtraining_stall_mild.event.json`
- `data/events/catalog/events/shared/shared_observation_recovery_after_stress.event.json`

### Chains
- `data/events/catalog/chains/watering_rootzone_chain.chain.json`
- `data/events/catalog/chains/airflow_climate_chain.chain.json`

### Dokumentation / Planung
- `data/events/catalog/_planning/phase-72-batch-2-chain-crossref-notes.md`
- `docs/event-system-v2/158_codex-phase-72-batch-2-plus-chain-crossrefs.md`
- `docs/event-system-v2/159_codex-phase-72-baseline-refresh-validation.md`
- `docs/event-system-v2/160_codex-phase-72-result.md`

## Geaenderte Dateien

### Locale
- `src/i18n/locales/de.json`
- `src/i18n/locales/en.json`
- `src/i18n/locales/es.json`

### Learning-Cards
- `data/events/catalog/learning-cards/lc_watering_basics.learning-card.json`
- `data/events/catalog/learning-cards/lc_climate_vpd_basics.learning-card.json`
- `data/events/catalog/learning-cards/lc_rootzone_oxygen_basics.learning-card.json`
- `data/events/catalog/learning-cards/lc_airflow_fundamentals.learning-card.json`
- `data/events/catalog/learning-cards/lc_ph_nutrient_uptake_basics.learning-card.json`

### Existing catalog events updated for chain hooks
- `data/events/catalog/events/shared/shared_panic_watering_misread.event.json`
- `data/events/catalog/events/outdoor/outdoor_pot_dries_by_afternoon.event.json`
- `data/events/catalog/events/shared/shared_substrate_drainage_compaction.event.json`
- `data/events/catalog/events/indoor/indoor_rootzone_airless_medium.event.json`
- `data/events/catalog/events/indoor/indoor_fan_failure_airflow_drop.event.json`
- `data/events/catalog/events/indoor/indoor_vpd_mismatch_veg.event.json`
- `data/events/catalog/events/indoor/indoor_heat_stress_air.event.json`
- `data/events/catalog/events/outdoor/outdoor_wind_exposure_stem_stress.event.json`

### Dev-only / isolated V2 baseline refresh
- `src/events/v2/shadow-bridge/ShadowBridgeUiMappingProbe.js`
- `src/events/v2/ui-lab/qa/README.md`

## Counts

- Events: 20 -> 22
- Learning-Cards: 5 -> 5
- Chains: 0 -> 2

## Result

The mini-catalog now contains the full planned 22-event Phase-70 target set.
The first 2 chains are present as data-only authoring structures, and the old Shadow Bridge 12-event probe no longer blocks the combined report.

## No Runtime Change

- no `app.js` change
- no `sw.js` change
- no `package.json` change
- no event activation
- no save changes
- no UI replacement
- no live-state handed to V2
