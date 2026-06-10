# Gameplay Activity Layer - Phase 3 Buddy Daily Check Report

## Completed

Phase 3 wurde als kleine Erweiterung auf dem bestehenden `retention.dailyCare`-Pfad umgesetzt.

Buddy erzeugt jetzt pro Spieltag genau einen kurzen, reload-sicheren Tageskommentar, der sich an den aktiven DailyCare-Aufgaben und an sicheren Pflanzen-/Risikosignalen orientiert.

Es wurde kein neues Daily-System, kein neuer Reward-Pfad und kein blockierender Startup-Dialog eingefuehrt.

## Changed Files

- `app.js`
- `index.html`
- `storage.js`
- `src/i18n/locales/de.json`
- `src/i18n/locales/en.json`
- `src/i18n/locales/es.json`
- `test/daily-tasks-runtime.test.js`
- `test/daily-tasks-ui-state.test.js`
- `test/guest-mode-startup.test.js`

## New Files

- `src/gameplay/buddyDailyCheck.js`
- `test/buddy-daily-check.test.js`
- `docs/gameplay-activity-layer-phase-3-buddy-daily-check-report.md`

## Technical Decision

Der Buddy Daily Check wurde bewusst als Erweiterung von `retention.dailyCare` umgesetzt, weil dort bereits alles liegt, was fuer einen taeglichen Kommentar gebraucht wird:

- Tageswechsel-Authority
- aktive DailyCare-Aufgaben
- reload-sichere Speicherung
- bestehende Home-/Missionen-Anzeige

Dadurch musste kein zweiter Daily-Owner entstehen. Die neue Logik liest nur bestehende Daten und speichert ein kleines Tagesobjekt unter `retention.dailyCare.buddyCheck`.

## How Buddy Daily Check Is Selected

Die Auswahl sitzt in `src/gameplay/buddyDailyCheck.js`.

Sie nutzt nur sichere, bereits vorhandene Signale:

- aktive `retention.dailyCare.tasks`
- `plant.phase`
- `simulation.simDay`
- `status.water`
- `status.nutrition`
- `status.stress`
- `status.risk`
- `status.health`
- `events.machineState`

Die Selektionslogik ordnet den Tag in kleine Kategorien ein:

- `stable_day`
- `water_focus`
- `nutrient_focus`
- `stress_focus`
- `risk_focus`
- `bloom_focus`
- `seedling_veg_focus`
- `daily_task_hint`
- `timeboost_safe`
- `timeboost_unsafe`
- `fallback`

Danach wird pro Kategorie deterministisch eine von 3 i18n-Varianten gewaehlt. So bleibt der Kommentar am gleichen Spieltag stabil und aendert sich nach Reload nicht zufaellig.

## Where It Is Shown

Der Buddy Daily Check wird nur minimal im bestehenden Kontext gezeigt:

- im Home-Retention-Teaser als untere sichtbare Zeile
- im Missionen-/Retention-Sheet als kleine `sheet-note`

Es gibt:

- kein Overlay
- keinen Startup-Dialog
- keinen Dialog-Zwang nach Reload

## Reload And Startup Safety

Die neue Speicherung bleibt klein:

- `retention.dailyCare.buddyCheck.dayKey`
- `retention.dailyCare.buddyCheck.category`
- `retention.dailyCare.buddyCheck.textKey`
- `retention.dailyCare.buddyCheck.primaryTaskId`
- `retention.dailyCare.buddyCheck.secondaryTaskId`
- `retention.dailyCare.buddyCheck.generatedAtMs`

Sicherheit:

- maximal ein Buddy Daily Check pro Spieltag
- bei Tageswechsel wird er zusammen mit DailyCare neu erzeugt
- am selben Tag wird er nur regeneriert, wenn er fehlt oder ungueltig ist
- keine Claim-Ledger-Aenderung
- keine Coins
- keine XP
- keine doppelte Reward-Moeglichkeit

Guest-Mode-Startup bleibt unblockiert, weil die neue Logik nur State vorbereitet und rein inline rendert.

## i18n Changes

Neue Buddy-Texte wurden komplett ueber die bestehende i18n-Struktur eingefuehrt:

- `daily.buddy.prefix`
- `daily.buddy.comment.*`
- `daily.retention.badge`

Umfang:

- 11 Buddy-Kategorien
- je 3 Varianten
- insgesamt 33 Buddy-Kommentare pro Sprache

## Tests Run

- `node --check app.js`
- `node --check storage.js`
- `node --check src/gameplay/buddyDailyCheck.js`
- `node --check test/buddy-daily-check.test.js`
- `node scripts/i18n-audit.js`
- `node test/buddy-daily-check.test.js`
- `node test/daily-care-selection.test.js`
- `node test/daily-tasks-runtime.test.js`
- `node test/daily-tasks-ui-state.test.js`
- `node test/guest-mode-startup.test.js`
- `node test/storage-profile-run-migration.test.js`
- `node test/reward-runtime-modes.test.js`

## Test Results

Passed:

- Syntax-Checks fuer die geaenderten Kernbereiche
- i18n-Audit ohne fehlende neue Keys in `en`/`es`
- neuer Buddy-Selektor-Unit-Test
- Daily-Runtime-Test inkl.
  - Buddy-Auswahl nach Task-/Statuslage
  - Same-day-Stabilitaet
  - Reload-Sicherheit
- Daily-UI-State-Test inkl.
  - Buddy-Hinweis im Missions-Sheet
  - Buddy-Hinweis im Home-Teaser
- Guest-Mode-Startup-Smoke ohne blockierendes Oeffnen
- Storage-/Migration-Test
- Reward-Runtime-Modes-Test

Failed:

- keine der ausgefuehrten Tests

Not run:

- kompletter voller `npm test`-Durchlauf
- manuelle Mobile-Visual-QA im Browser
- komplette Event-Regression-Suite ausserhalb der relevanten Smokes

## Known Limits

- Buddy liest bewusst nur grobe, sichere Signale und keine tieferen neuen Simulationsmetriken
- die Kommentare reagieren sinnvoll auf DailyCare und Status, sind aber noch keine tiefere Diagnose
- Zeitboost-Hinweise bleiben absichtlich konservativ und nur grob abgeleitet
- es gibt weiter keinen blockierenden Buddy-Dialog und damit auch keinen erzwungenen Lese-Moment

## Recommended Manual Checks

- Home-HUD im mobilen View pruefen und den Buddy-Text im Daily-Teaser lesen
- Missionen-Sheet oeffnen und auf schmale Screens pruefen
- Tageswechsel simulieren und sehen, ob der Buddy-Kommentar sinnvoll mitrotiert
- Reload im Guest-Mode pruefen und bestaetigen, dass nichts automatisch aufspringt

## Recommendation For Phase 4

Die naechste sinnvolle Phase ist eine kleine, optionale Wochenebene auf Basis derselben Authority:

`Weekly Missions`, die nur aus bestehender DailyCare-/Streak-Aktivitaet lesen und weiter ohne zweite Task-Authority auskommen.
