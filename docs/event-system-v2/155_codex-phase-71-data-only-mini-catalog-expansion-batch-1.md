# 155 - Codex Phase 71 Data-only Mini-Catalog Expansion Batch 1

## Ziel

Phase 71 setzt die erste data-only Ausbauwelle des echten Event-V2-Mini-Katalogs um:

- 8 neue Event-JSONs
- 2 neue Learning-Cards
- keine Chains
- keine Runtime-Aktivierung
- keine UI-Integration
- keine Eventaktivierung

## Neue Event-Dateien

### Indoor

- `indoor_fan_failure_airflow_drop`
- `indoor_light_burn_canopy_top`
- `indoor_rootzone_airless_medium`

### Outdoor

- `outdoor_pot_dries_by_afternoon`
- `outdoor_early_pest_pressure_leaf_underside`
- `outdoor_wind_exposure_stem_stress`

### Shared

- `shared_panic_watering_misread`
- `shared_substrate_drainage_compaction`

## Neue Learning-Cards

- `lc_rootzone_oxygen_basics`
- `lc_airflow_fundamentals`

## Batch-1-Fokus

- mehr echte Ursache-Wirkung zwischen Wasser, Rootzone und Klima
- bessere Outdoor-Breite
- erster Setup-/Airflow-Lernwert
- mehr Shared-Fehlinterpretationen mit hohem Coach-Wert

## Katalogstand vorher / nachher

- Events vorher: `12`
- Events nachher: `20`
- Learning-Cards vorher: `3`
- Learning-Cards nachher: `5`
- Chains vorher: `0`
- Chains nachher: `0`

## Asset-Strategie

- nur vorhandene Asset-Pfade
- immer mit vorhandenem Fallback
- keine neuen Asset-Dateien
- keine Bildgenerierung
- Legacy-PNGs ueber `mini_catalog_startset` bewusst als UI-Lab-Uebergang markiert

## Locale-Strategie

Ergaenzt in:

- `src/i18n/locales/de.json`
- `src/i18n/locales/en.json`
- `src/i18n/locales/es.json`

Pro Event:

- `title`
- `symptom`
- `description`
- `cause`
- `coach.summary`
- `coach.actions`
- `coach.why`
- `aftermath.lesson`
- Decision-Labels
- Decision-Details
- Symptom-Labels
- Diagnostic-Labels
- Cover-Alt

## Wichtige Fachentscheidungen

- `indoor_light_burn_canopy_top` mappt vorerst auf `lc_climate_vpd_basics`
- `outdoor_early_pest_pressure_leaf_underside` mappt vorerst ebenfalls auf `lc_climate_vpd_basics`
- beide Mappings sind bewusst temporar, bis eigene `lc_light_distance_basics` und `lc_pest_observation_basics` existieren

## UI-Lab / Adapter-Ergebnis fuer die 8 neuen Events

Direkter Re-Run der Adapter-Matrix fuer die neuen 8 IDs:

- `eventsMapped: 8`
- `bridgePass: 8`
- `bridgeWarning: 0`
- `bridgeBlocked: 0`
- `warning: 0`
- `budgetWarnings: 0`

Damit ist Batch 1 selbst auf Slot-/Budget-Ebene gruen.
