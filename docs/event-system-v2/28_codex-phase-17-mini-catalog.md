# 28 — Codex Phase 17 Mini-Catalog (Data-Only)

## 1. Neu erstellte Dateien

Events (Indoor):
- `data/events/catalog/events/indoor/indoor_overwatering_early.event.json`
- `data/events/catalog/events/indoor/indoor_dry_rootball.event.json`
- `data/events/catalog/events/indoor/indoor_soil_ph_out_of_range.event.json`
- `data/events/catalog/events/indoor/indoor_light_nutrient_tox_early.event.json`
- `data/events/catalog/events/indoor/indoor_heat_stress_air.event.json`
- `data/events/catalog/events/indoor/indoor_vpd_mismatch_veg.event.json`

Events (Outdoor):
- `data/events/catalog/events/outdoor/outdoor_heavy_rain_waterlogging_risk.event.json`
- `data/events/catalog/events/outdoor/outdoor_heatwave_dry_wind.event.json`
- `data/events/catalog/events/outdoor/outdoor_cold_night_stress.event.json`

Events (Shared):
- `data/events/catalog/events/shared/shared_light_distance_error.event.json`
- `data/events/catalog/events/shared/shared_early_pest_signs_mild.event.json`
- `data/events/catalog/events/shared/shared_rootbound_warning.event.json`

Learning-Cards:
- `data/events/catalog/learning-cards/lc_watering_basics.learning-card.json`
- `data/events/catalog/learning-cards/lc_climate_vpd_basics.learning-card.json`
- `data/events/catalog/learning-cards/lc_ph_nutrient_uptake_basics.learning-card.json`

Optionale Planung:
- `data/events/catalog/_planning/phase-17-mini-chain-candidate.md`

Dokumentation:
- `docs/event-system-v2/28_codex-phase-17-mini-catalog.md`

## 2. Enthaltene Events

Indoor (6):
- `indoor_overwatering_early`
- `indoor_dry_rootball`
- `indoor_soil_ph_out_of_range`
- `indoor_light_nutrient_tox_early`
- `indoor_heat_stress_air`
- `indoor_vpd_mismatch_veg`

Outdoor (3):
- `outdoor_heavy_rain_waterlogging_risk`
- `outdoor_heatwave_dry_wind`
- `outdoor_cold_night_stress`

Shared (3):
- `shared_light_distance_error`
- `shared_early_pest_signs_mild`
- `shared_rootbound_warning`

## 3. Enthaltene Learning-Cards

- `lc_watering_basics`
- `lc_climate_vpd_basics`
- `lc_ph_nutrient_uptake_basics`

## 4. Ausgeführte Validierung

Ausgeführt wurde ein read-only Lauf über den bestehenden V2-Validator:
- `validateCatalogExamples({ sourceMode: 'fullCatalog' })`

Begleitend wurde der Full-Catalog-Loader so erweitert, dass verschachtelte Katalogordner (`events/indoor`, `events/outdoor`, `events/shared`) rekursiv geladen werden.

## 5. Diagnostics / Warnings / Errors / Blocker

Ergebnis des Laufs:
- `ok: true`
- `filesChecked: 15`
- `counts: events=12, chains=0, learningCards=3, unknown=0`
- `blockerCount: 0`
- `errorCount: 0`
- `warningCount: 588`
- `infoCount: 27`

Haupt-Warnungsgruppen:
- `locale_integrity_key_missing`: 522
- `asset_integrity_missing_file`: 63
- `asset_refs_missing_assets_block`: 3

## 6. Erwartbare Diagnostics

Die Warnungen sind in dieser Phase erwartbar und konsistent mit den Vorgaben:
- Locale-Keys fehlen, weil Locale-Dateien bewusst noch nicht geändert werden dürfen.
- Asset-Dateien fehlen, weil nur Asset-Referenzen angelegt wurden und keine neuen Asset-Dateien erstellt werden sollten.

## 7. Strukturelle Startfähigkeit

Der Mini-Katalog ist strukturell startfähig als Data-Only-Set:
- korrekte Verteilung 6/3/3 + 3 Learning-Cards
- konsistente IDs
- keine Chains
- keine Blocker/Errors im aktuellen Validator-Lauf
- i18n-/Asset-Lücken sind als erwartbare Warnings sichtbar

## 8. Nächste nötige Korrekturen

1. Locale-Key-Befüllung für die neuen `events.v2.*`- und `events.v2.learning.*`-Keys (in einer eigenen, erlaubten Phase).
2. Asset-Pfade mit real existierenden Dateien abgleichen oder auf vorhandene Platzhalter-Assets harmonisieren.
3. Optional Regel-Noise-Feintuning, damit erwartete Locale-/Asset-Lücken im frühen Data-Only-Flow differenzierter bewertet werden.

## 9. Empfehlung für Phase 18

Empfohlen: **Locale + Asset Integrity Pass (weiterhin ohne Runtime-Anbindung)**
- nur Schlüssel-/Referenz-Härtung für den neuen Mini-Katalog
- keine Event-Aktivierung
- danach erneut Validation + Health/QA-Matrix-Lauf

## 10. UI-Lab-Empfehlung

UI-Lab ist sinnvoll **nach Phase 18**, sobald
- Locale-Basis für den Mini-Katalog vorhanden ist,
- Asset-Referenzen mindestens auf valide Fallbacks zeigen,
- und die Warning-Last deutlich reduziert ist.

So startet UI-Lab auf stabileren, testbaren Inhaltsdaten statt auf absichtlich unvollständigen Referenzen.
