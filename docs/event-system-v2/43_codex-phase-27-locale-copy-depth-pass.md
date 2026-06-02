# 43 — Codex Phase 27 Locale Copy Depth Pass

## 1. Geaenderte Locale-Dateien
- `src/i18n/locales/de.json`
- `src/i18n/locales/en.json`
- `src/i18n/locales/es.json`

## 2. Vertiefte Slots
Gezielt fuer die 12 Mini-Katalog-Events angepasst:
- `title`
- `symptom`
- `coach.summary`
- `coach.why`
- `aftermath.lesson`

Zusatz fuer bessere Slot-Qualitaet:
- `options.<id>` Labels auf Budget-Mindestlaenge harmonisiert
- `options_details.<id>` neu gepflegt (fuer Decision-Detail-Aufloesung im Adapter)

## 3. Besonders angepasste Events
Mit extra Fokus nachgeschaerft:
- `indoor_dry_rootball`
- `indoor_soil_ph_out_of_range`
- `indoor_heat_stress_air`
- `shared_early_pest_signs_mild`

Ziel war jeweils: Ursache -> Wirkung -> Handlung in ruhigem Coach-Ton.

## 4. DE / EN / ES Leitlinien
- Deutsch als primaere Qualitaetsversion vertieft.
- Englisch und Spanisch bewusst klar, einfach und ohne Lehrbuchblock gehalten.
- Maximal 1-2 Fachbegriffe pro Abschnitt.
- Keine Alarmrhetorik, keine strafende Sprache.

## 5. Matrix-Ergebnis vor/nach Phase 27
Vorher (Phase 26):
- events: 12/12 gemappt
- blocker/error/warning: 0/0/0
- info: 264
- bridge: pass=12, warning=0, blocked=0

Nachher (Phase 27 Re-Run):
- events: 12/12 gemappt
- required complete: 12/12
- blocker/error/warning: 0/0/0
- info: 77
- bridge: pass=12, warning=0, blocked=0

## 6. Info-Density vor/nach
- Vorher: `264 / 12 = 22.0` infos pro Event
- Nachher: `77 / 12 = 6.42` infos pro Event

=> deutliche Reduktion ohne neue Warnings.

## 7. Budget-Warnings nach Phase 27
- `budgetWarningsTotal = 0`
- keine neuen `long`-Ueberschreitungen
- 360px-Decision-Detail-Regel bleibt eingehalten

## 8. Bridge-Readiness nach Phase 27
- pass: 12
- warning: 0
- blocked: 0

Fazit: Shadow-Bridge-Qualitaet ist inhaltlich klar verbessert, technisch weiterhin stabil.

## 9. Events mit weiterem Watch-Status
Weiterhin fachlich beobachten (kein technischer Blocker):
- `indoor_light_nutrient_tox_early`
- `indoor_vpd_mismatch_veg`
- `outdoor_cold_night_stress`
- `outdoor_heatwave_dry_wind`
- `shared_rootbound_warning`

Grund: verbleibende Info-Hinweise aus Budget-`short` in Teilslots, obwohl Gate auf pass bleibt.

## 10. Runtime-Status
- Runtime weiterhin unangetastet
- keine Imports in bestehende Runtime
- keine bestehende Event-UI ersetzt
- keine App-Navigation geaendert

## 11. Empfehlung fuer Phase 28
**Phase 28: Targeted Remaining Info Cleanup + Locale QA Lock**
1. Die 5 Watch-Events gezielt auf verbleibende `short`-Infos trimmen.
2. Locale-QA-Lock fuer Mini-Katalog definieren (max erlaubte Info-Density).
3. Danach finalen Shadow-Bridge-Preflight-Report erstellen.
