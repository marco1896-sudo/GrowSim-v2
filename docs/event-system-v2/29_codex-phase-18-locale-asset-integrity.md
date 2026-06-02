# 29 — Codex Phase 18 Locale + Asset Integrity

## 1. Geänderte Locale-Dateien
- `src/i18n/locales/de.json`
- `src/i18n/locales/en.json`
- `src/i18n/locales/es.json`

## 2. Anzahl neu ergänzter Keys pro Sprache
- `de`: 198
- `en`: 198
- `es`: 198

Hinweis: Ergänzt wurden nur neue Mini-Katalog-bezogene Keys (insb. `events.v2.*`, `events.v2.learning.*` sowie direkt referenzierte `options.*`, `symptoms.*`, `diagnostics.*`, `alt.events.v2.*` aus den neuen Mini-Katalog-Dateien).

## 3. Geänderte Event-/Learning-Card-Dateien
Events:
- `data/events/catalog/events/indoor/indoor_overwatering_early.event.json`
- `data/events/catalog/events/indoor/indoor_dry_rootball.event.json`
- `data/events/catalog/events/indoor/indoor_soil_ph_out_of_range.event.json`
- `data/events/catalog/events/indoor/indoor_light_nutrient_tox_early.event.json`
- `data/events/catalog/events/indoor/indoor_heat_stress_air.event.json`
- `data/events/catalog/events/indoor/indoor_vpd_mismatch_veg.event.json`
- `data/events/catalog/events/outdoor/outdoor_heavy_rain_waterlogging_risk.event.json`
- `data/events/catalog/events/outdoor/outdoor_heatwave_dry_wind.event.json`
- `data/events/catalog/events/outdoor/outdoor_cold_night_stress.event.json`
- `data/events/catalog/events/shared/shared_light_distance_error.event.json`
- `data/events/catalog/events/shared/shared_early_pest_signs_mild.event.json`
- `data/events/catalog/events/shared/shared_rootbound_warning.event.json`

Learning-Cards:
- `data/events/catalog/learning-cards/lc_watering_basics.learning-card.json`
- `data/events/catalog/learning-cards/lc_climate_vpd_basics.learning-card.json`
- `data/events/catalog/learning-cards/lc_ph_nutrient_uptake_basics.learning-card.json`

## 4. Gehärtete Asset-Refs
- Alle Event-Cover wurden auf vorhandenen Fallback gesetzt:
  - `assets/events/event-stress-recovery.png`
- Alle Event-Sprite-Overlay-Refs wurden ebenfalls auf diesen vorhandenen Fallback gesetzt.
- Alle Learning-Card-`preferredHeroAsset`-Refs wurden auf den gleichen vorhandenen Fallback gesetzt.

## 5. Bewusst verbleibende Asset-Lücken
- `.webp`-Präferenz ist noch nicht erfüllt (der vorhandene Fallback ist `.png`).
- Validator meldet weiterhin:
  - `asset_integrity_extension_check` (Legacy-/Fallback-Formatwarnung)
  - `asset_refs_missing_assets_block` (3 Learning-Card-bezogene Warnungen)

Siehe Planungsdatei:
- `data/events/catalog/_planning/phase-18-asset-gap-report.md`

## 6. Ergebnis der erneuten Validierung
Ausgeführt:
- `validateCatalogExamples({ sourceMode: 'fullCatalog' })`

Ergebnis nach Phase 18:
- `ok`: true
- `filesChecked`: 15
- `events`: 12
- `learningCards`: 3
- `blocker`: 0
- `errors`: 0
- `warnings`: 66
- `infos`: 27

Warnungsgruppen nach Phase 18:
- `asset_integrity_extension_check`: 63
- `asset_refs_missing_assets_block`: 3

## 7. Vergleich zu Phase 17
- vorher: `warnings=588`
- nachher: `warnings=66`
- Reduktion: `-522`

## 8. UI-Lab-Tauglichkeit
Der Mini-Katalog ist jetzt deutlich näher an UI-Lab-Tauglichkeit:
- Locale-Backfill für den Mini-Katalog ist vorhanden.
- Asset-Refs zeigen auf existierende Dateien.
- Keine Blocker/Errors.

Einschränkung:
- Für ein visuell hochwertiges UI-Lab sollten in Phase 19 noch `.webp`-konforme V2-spezifische Mini-Katalog-Assets geplant/zugeordnet werden (ohne Runtime-Anbindung).

## 9. Empfehlung für Phase 19
Empfohlen: **Asset-Quality + Validator Rule-Tuning Pass (isoliert, ohne Runtime-Anbindung)**
1. V2-Mini-Katalog-Assetzuordnung mit bevorzugt `.webp`-fähigen realen Zielpfaden (keine Aktivierung im Spiel).
2. `asset_refs_missing_assets_block` für Learning-Cards regeltechnisch sauber einordnen (Scope/Noise-Feintuning).
3. Erneute Validation + Health/QA-Snapshot als „UI-Lab-Go“-Checkpoint.
