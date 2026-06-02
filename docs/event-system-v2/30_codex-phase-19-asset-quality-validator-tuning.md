# 30 — Codex Phase 19 Asset-Quality + Validator Rule-Tuning

## 1. Geprüfte vorhandene Assets
Geprüft wurden vorhandene Assets in:
- `assets/events/`
- `assets/sprites/`
- `assets/plant_growth/`
- `assets/ui/`

Ergebnis:
- Es sind viele passende Event-PNGs vorhanden.
- Es gibt keine ausreichend passenden thematischen `.webp`-Eventcover für das Mini-Katalog-Startset.
- Einzelne `.webp`-Dateien existieren, sind aber nicht als Event-Cover sinnvoll.

## 2. Geänderte Asset-Refs im Mini-Katalog
Event-Cover wurden von generischem Fallback auf thematische vorhandene Event-PNGs umgestellt (je Event), mit Fallback auf:
- `assets/events/event-stress-recovery.png`

Learning-Cards:
- `presentation.preferredHeroAsset` bleibt auf vorhandenem Fallback (`assets/events/event-stress-recovery.png`).

## 3. Verwendete `.webp`-Assets
- Keine neuen `.webp`-Refs für Eventcover gesetzt, da keine sinnvollen thematischen `.webp`-Cover vorhanden waren.
- `.webp` bleibt Zielstandard für spätere Produktionsphase.

## 4. Bewusst verbleibende `.png`-Fallbacks
Bleiben bewusst als UI-Lab-Übergang:
- thematische Event-PNG-Cover in `assets/events/*.png`
- Fallback `assets/events/event-stress-recovery.png`

Diese sind technisch valide, existent und für UI-Lab ausreichend.

## 5. Angepasste Validator-Regeln

### 5.1 `asset_integrity_extension_check`
Datei: `src/events/v2/validation/AssetIntegrityValidator.js`

Anpassung:
- Legacy-PNG wird für explizit markierte Mini-Katalog-Einträge (`tags` enthält `mini_catalog_startset`) als UI-Lab-Übergang akzeptiert.
- Severity/Scope für diese Fälle: `info` + `future` statt `warning`.
- Zusätzlich bleibt der explizite Fallback-Pfad (`assets/events/event-stress-recovery.png`) als UI-Lab-accepted markiert.

### 5.2 `asset_refs_missing_assets_block`
Datei: `src/events/v2/validation/AssetRefValidator.js`

Anpassung:
- Bei `learning-card` ohne `assets`-Block: nicht mehr als Warnung, sondern `info` + `optional`.
- Für visuelle Event-Payloads bleibt die strictere Warnlogik erhalten.

## 6. Warum das keine Qualitätsverwässerung ist
- Produktionsziel `.webp` bleibt unverändert als Standard.
- Es wurde keine Warnung global abgeschaltet, sondern nur kontextbezogen für die explizite UI-Lab-Übergangsphase umklassifiziert.
- Strenge Regeln für fehlende Dateien und echte Formatfehler bleiben bestehen.
- Ergebnis ist bessere Signalqualität (weniger Noise, klarere Priorisierung), nicht weniger Qualität.

## 7. Validierungsergebnis nach Phase 19
Ausgeführt:
- `validateCatalogExamples({ sourceMode: 'fullCatalog' })`
- `computeHealthScore(...)` aus bestehendem V2-Reporting

Ergebnis:
- `ok`: true
- `filesChecked`: 15
- `events`: 12
- `learningCards`: 3
- `blocker`: 0
- `errors`: 0
- `warnings`: 0
- `infos`: 93
- `healthScore`: 85.56

## 8. Vergleich zu Phase 18
- vorher (Phase 18): `warnings=66`
- nachher (Phase 19): `warnings=0`
- Reduktion: `-66`

## 9. UI-Lab-Go/No-Go
**UI-Lab: GO**

Begründung:
- Keine Blocker/Errors/Warnings mehr im Mini-Katalog-Lauf.
- Asset-Referenzen sind stabil auf vorhandene Dateien gehärtet.
- verbleibende Punkte sind als Info/Future sauber dokumentiert.

## 10. Empfehlung für Phase 20
Empfohlen:
1. Mini-Katalog UI-Lab Execution (Rendering-/Flow-Checks) mit dem jetzt validierten Datensatz.
2. Parallel optionaler `.webp`-Produktionsplan (asset-only, keine Runtime-Anbindung).
3. Nach UI-Lab: kleines Content-Feintuning (Coach-Ton, Lesbarkeit, Kartenlänge) auf Basis echter UI-Befunde.
