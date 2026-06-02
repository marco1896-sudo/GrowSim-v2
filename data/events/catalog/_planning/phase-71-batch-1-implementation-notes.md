# Phase 71 Batch 1 Implementation Notes

## Neue Event-Dateien

- `data/events/catalog/events/indoor/indoor_fan_failure_airflow_drop.event.json`
- `data/events/catalog/events/indoor/indoor_light_burn_canopy_top.event.json`
- `data/events/catalog/events/indoor/indoor_rootzone_airless_medium.event.json`
- `data/events/catalog/events/outdoor/outdoor_pot_dries_by_afternoon.event.json`
- `data/events/catalog/events/outdoor/outdoor_early_pest_pressure_leaf_underside.event.json`
- `data/events/catalog/events/outdoor/outdoor_wind_exposure_stem_stress.event.json`
- `data/events/catalog/events/shared/shared_panic_watering_misread.event.json`
- `data/events/catalog/events/shared/shared_substrate_drainage_compaction.event.json`

## Neue Learning-Cards

- `data/events/catalog/learning-cards/lc_rootzone_oxygen_basics.learning-card.json`
- `data/events/catalog/learning-cards/lc_airflow_fundamentals.learning-card.json`

## Asset-Ref-Entscheidungen

- Alle neuen Event-Dateien nutzen vorhandene PNGs plus den vorhandenen Fallback `assets/events/event-stress-recovery.png`.
- Alle neuen Event-Tags enthalten `mini_catalog_startset`, damit Legacy-PNGs im UI-Lab-Validator als akzeptierte Uebergangsassets nur als Info laufen.
- Die zwei neuen Learning-Cards nutzen bewusst `assets/events/event-stress-recovery.png` als `preferredHeroAsset`, damit keine neuen Asset-Warnings entstehen.

## Temporäre Learning-Ref-Mappings

- `indoor_light_burn_canopy_top` -> `lc_climate_vpd_basics`
  - Grund: noch keine eigene `lc_light_distance_basics`
- `outdoor_early_pest_pressure_leaf_underside` -> `lc_climate_vpd_basics`
  - Grund: noch keine eigene `lc_pest_observation_basics`

## Spaetere Buddy-Asset-Kandidaten

- `indoor_fan_failure_airflow_drop`
  - Buddy am Ventilator / mit Luftstrom-Markern
- `indoor_light_burn_canopy_top`
  - Buddy zeigt auf aufgehellte Canopy-Spitze / Lampenabstand
- `outdoor_early_pest_pressure_leaf_underside`
  - Buddy mit Lupe an Blattunterseite
- `outdoor_wind_exposure_stem_stress`
  - Buddy mit Windschutz / Stuetzmotiv
- `shared_panic_watering_misread`
  - Buddy mit Topfgewicht-Hinweis / Fragezeichen statt Panik
- `shared_substrate_drainage_compaction`
  - Buddy mit Substrat-/Drainage-Schnittbild

## Chain-faehige neue Events

- `shared_panic_watering_misread`
- `indoor_rootzone_airless_medium`
- `shared_substrate_drainage_compaction`
- `indoor_fan_failure_airflow_drop`
- `indoor_light_burn_canopy_top`
- `outdoor_early_pest_pressure_leaf_underside`

## Noch nicht umgesetzt

- `watering_mistake_chain`
- `climate_vpd_chain`
- `lc_pest_observation_basics`
- die zwei fuer Phase 72 vorgesehenen Rest-Events

## QA-Hinweis

- Die 8 neuen Events laufen in der direkten Adapter-Matrix fuer `de` mit `bridgePass=8`, `warning=0`, `budgetWarnings=0`.
- Der alte Shadow-Bridge Combined Dry-Run bleibt trotzdem blockiert, weil die Probe noch exakt `12` gemappte Events erwartet statt kataloggroessenbasiert zu pruefen.
