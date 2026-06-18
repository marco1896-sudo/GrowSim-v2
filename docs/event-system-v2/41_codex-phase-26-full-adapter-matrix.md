# 41 — Codex Phase 26 Full Adapter Matrix

## 1. Scope
- Vollstaendige Adapter-Matrix ueber alle 12 Mini-Katalog-Events.
- Learning-Card-Zuordnung ueber `learningCard.ref`.
- Locale-Aufloesung mit `de` (Fallback `en`).
- Compact-Mode aktiv fuer 360px-Regel bei Decision-Details.

## 2. Matrix (12 Events)
| eventId | setup | category | stage | hero | title | symptom | coach | decisions | learning | aftermath | diag(B/E/W/I) | budgetWarnings | readiness |
|---|---|---|---|---|---|---|---|---:|---|---|---|---:|---|
| indoor_dry_rootball | indoor | water | S2-S7 | ok | ok | ok | ok | 3 | mapped | mapped | 0/0/0/22 | 0 | pass |
| indoor_heat_stress_air | indoor | environment | S3-S10 | ok | ok | ok | ok | 3 | mapped | mapped | 0/0/0/22 | 0 | pass |
| indoor_light_nutrient_tox_early | indoor | nutrition | S3-S8 | ok | ok | ok | ok | 3 | mapped | mapped | 0/0/0/22 | 0 | pass |
| indoor_overwatering_early | indoor | water | S2-S6 | ok | ok | ok | ok | 3 | mapped | mapped | 0/0/0/22 | 0 | pass |
| indoor_soil_ph_out_of_range | indoor | nutrition | S3-S9 | ok | ok | ok | ok | 3 | mapped | mapped | 0/0/0/22 | 0 | pass |
| indoor_vpd_mismatch_veg | indoor | environment | S2-S6 | ok | ok | ok | ok | 3 | mapped | mapped | 0/0/0/22 | 0 | pass |
| outdoor_cold_night_stress | outdoor | environment | S2-S8 | ok | ok | ok | ok | 3 | mapped | mapped | 0/0/0/22 | 0 | pass |
| outdoor_heatwave_dry_wind | outdoor | environment | S4-S11 | ok | ok | ok | ok | 3 | mapped | mapped | 0/0/0/22 | 0 | pass |
| outdoor_heavy_rain_waterlogging_risk | outdoor | water | S3-S10 | ok | ok | ok | ok | 3 | mapped | mapped | 0/0/0/22 | 0 | pass |
| shared_early_pest_signs_mild | shared | pest | S3-S10 | ok | ok | ok | ok | 3 | mapped | mapped | 0/0/0/22 | 0 | pass |
| shared_light_distance_error | shared | environment | S2-S10 | ok | ok | ok | ok | 3 | mapped | mapped | 0/0/0/22 | 0 | pass |
| shared_rootbound_warning | shared | water | S4-S10 | ok | ok | ok | ok | 3 | mapped | mapped | 0/0/0/22 | 0 | pass |

## 3. Diagnostics je Event
- blocker: 0 bei allen 12
- error: 0 bei allen 12
- warning: 0 bei allen 12
- info: 22 je Event

Hinweis zu den `info`-Eintraegen:
- Diese entstehen aus Budget-Checks mit `status=short` (nicht blockierend).
- Ursache: Die aktuell aus Locale aufgeloesten Slot-Texte sind teilweise sehr kurz (z. B. generische Titel), technisch valide, aber fuer Budget-QA als Info markiert.

## 4. Slot-Completeness je Event
- required slots vollstaendig: 12/12
- recommended slots ohne Missing: 12/12
- optional slots vorhanden: 12/12

## 5. Budget-Befunde je Event
- `budgetWarnings`: 0 bei allen 12 Events
- `budgetInfo` (short): vorhanden bei allen 12 Events
- Keine Ueberschreitungen (`long`) im Compact-Mode

## 6. Learning-/Aftermath-Befunde
- Learning: fuer alle 12 Events erfolgreich zugeordnet (`mapped`)
- Aftermath: fuer alle 12 Events vorhanden (`mapped`)
- Keine fehlenden `learningCard.ref`-Mappings im Mini-Katalog

## 7. Bridge-Readiness je Event
- pass: 12
- warning: 0
- blocked: 0

Go/No-Go auf Eventebene:
- Kein Event blockiert die spaetere Shadow-Bridge anhand der aktuellen Gate-Regeln.

## 8. Watchlist aus Phase 24 im Matrix-Kontext
Die Watchlist-Szenarios bleiben inhaltlich beobachtungsrelevant (Copy/UX), sind aber technisch nicht blockierend:
- `indoor_dry_rootball`
- `indoor_soil_ph_out_of_range`
- `indoor_heat_stress_air`
- `shared_early_pest_signs_mild`

## 9. Risiken vor echter Runtime-Bridge
- Hauptrestthema ist nicht Datenvollstaendigkeit, sondern Copy-Qualitaet je Locale unter realer Runtime-Darstellung.
- Die hohe Zahl von Budget-Infos (`short`) zeigt, dass fuer Produktions-Copy pro Slot ggf. reichhaltigere Locale-Texte noetig sind.
