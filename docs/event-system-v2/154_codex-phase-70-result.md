# Phase 70 Result: Mini-Catalog Expansion Plan

## Neue Dateien

- `docs/event-system-v2/152_codex-phase-70-mini-catalog-expansion-plan.md`
- `docs/event-system-v2/153_codex-phase-70-event-selection-matrix.md`
- `docs/event-system-v2/154_codex-phase-70-result.md`
- `data/events/catalog/_planning/phase-70-mini-catalog-expansion-plan.md`
- `data/events/catalog/_planning/phase-70-chain-learning-card-plan.md`

## Geaenderte Dateien

Keine produktiven Runtime-Dateien.

Bestaetigt:

- `app.js` nicht geaendert
- `sw.js` nicht geaendert
- `package.json` unveraendert
- keine bestehenden `src/events/*.js` geaendert

## Aktueller Mini-Katalog-Stand

- Indoor-Events: 6
- Outdoor-Events: 3
- Shared-Events: 3
- Learning-Cards: 3
- Chains: 0

Coverage:

- starke Basis bei Wasser / Klima
- erste Basis bei Naehrstoffen
- sehr kleine Pest-Abdeckung
- keine Technik-/Training-/Chain-Abdeckung

## Coverage-Luecken

- keine Chains
- wenig Outdoor-Breite
- keine Setup-/Technik-Events
- keine Trainings-/Strukturstress-Events
- duenne Rootzone-/Substrat-Tiefe
- nur 3 Learning-Cards

## Vorgeschlagene neue Events

Empfohlen fuer den naechsten Ausbau:

- `indoor_fan_failure_airflow_drop`
- `indoor_light_burn_canopy_top`
- `indoor_rootzone_airless_medium`
- `indoor_overtraining_stall_mild`
- `outdoor_pot_dries_by_afternoon`
- `outdoor_early_pest_pressure_leaf_underside`
- `outdoor_wind_exposure_stem_stress`
- `shared_panic_watering_misread`
- `shared_substrate_drainage_compaction`
- `shared_observation_recovery_after_stress`

## Vorgeschlagene Chains

- `watering_mistake_chain`
- `climate_vpd_chain`

## Vorgeschlagene Learning-Cards

- `lc_rootzone_oxygen_basics`
- `lc_airflow_fundamentals`
- `lc_pest_observation_basics`

## Locale-/Copy-Plan

Direkt mitplanen:

- `title`
- `symptom`
- `description`
- `cause`
- `coach.summary`
- `coach.why`
- `coach.actions`
- `options.*`
- `options_details.*`
- `aftermath.lesson`
- `learning.*`

## Asset-/Buddy-Vorplanung

Noch keine Assets.

Aber klar priorisierbare spaetere Buddy-Motive:

- Panik-Giessen
- Luefterausfall / Luftstrom
- trockener Outdoor-Topf
- fruehe Schaedlingsbeobachtung

## Risikoanalyse

Niedrig:

- Data-only Event- und Learning-Card-Ausbau
- Locale-/Validation-Planung
- Chain-Planung ohne Runtime-Aktivierung

Mittel:

- steigende Copy-/Budget-Dichte
- mehr CrossRefs in Validator/Matrix

Bewusst vermieden:

- Runtime-Ausweitung
- Eventaktivierung
- Save
- UI-Integration
- echter Tick

## Empfohlene Phase 71

```text
Phase 71: Data-only Mini-Catalog Expansion Batch 1
```

## Go/No-Go fuer Phase 71

Ergebnis:

```text
go_for_phase_71_data_only_mini_catalog_expansion_batch_1
```
