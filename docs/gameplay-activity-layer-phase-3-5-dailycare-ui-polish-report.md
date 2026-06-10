# Gameplay Activity Layer - Phase 3.5 DailyCare UI Polish Report

## Completed

Phase 3.5 wurde als kleiner UI-/Copy-/Mapping-Polish auf dem bestehenden `retention.dailyCare`-Pfad umgesetzt.

Es wurde kein neues Daily-System gebaut. Stattdessen wurden die vorhandenen DailyCare-Task-Metadaten, die i18n-Copy und die Anzeige im Missions-Sheet so korrigiert, dass Daily-Aufgaben jetzt konkrete player-facing Titel und Beschreibungen zeigen.

## Cause Of The Generic UI Text

Die generischen Karten hatten drei zusammenwirkende Ursachen:

1. `src/gameplay/dailyCareSelection.js` liefert fuer die Auswahl nur technische Task-Objekte wie `id`, `trigger`, `target`, `rewardCoins`.
2. `buildDailyCareTasks()` in `app.js` hat diese Auswahlobjekte direkt verwendet und bei fehlender Metadaten-Anreicherung auf `title: 'Daily Task'` zurueckgefallen.
3. Das Missions-Sheet hat in der Unterzeile nicht die eigentliche Aufgabenbeschreibung gerendert, sondern einen Status-Hinweis wie `start_task`, wodurch die Task-Copy fuer offene Aufgaben generisch wirkte.

Zusatzbefund:

- alter gespeicherter DailyCare-State konnte generische `title`-/`description`-Werte wie `Daily Task` oder `Start with daily task` weitertragen

## Changed Files

- `app.js`
- `storage.js`
- `src/i18n/locales/de.json`
- `src/i18n/locales/en.json`
- `src/i18n/locales/es.json`
- `test/daily-care-selection.test.js`
- `test/daily-tasks-runtime.test.js`
- `test/daily-tasks-ui-state.test.js`
- `test/guest-mode-startup.test.js`

## New Files

- `docs/gameplay-activity-layer-phase-3-5-dailycare-ui-polish-report.md`

## What Changed

### 1. Task copy mapping fixed at generation time

`buildDailyCareTasks()` mappt die selektierten Task-IDs jetzt wieder auf den bestehenden DailyCare-Katalog zurueck.

Dadurch bekommt jede erzeugte Aufgabe wieder:

- einen stabilen `titleKey`
- einen stabilen `descriptionKey`
- eine konkrete player-facing Copy statt `Daily Task`

### 2. Save-compatible copy normalization added

Beim Normalisieren von `retention.dailyCare.tasks` werden alte Platzhalterwerte kontrolliert auf die passenden i18n-Keys zurueckgefuehrt.

Beispiele:

- `Daily Task` -> `daily.task.{taskId}.title`
- `Start with daily task` -> `daily.task.{taskId}.description`

Das passiert ohne neue Rewards, ohne Claim-Aenderung und ohne neuen Save-Zweig.

### 3. Missions UI now shows the real task description

Die Unterzeile jeder DailyCare-Karte rendert jetzt die eigentliche Aufgabenbeschreibung.

Status bleibt weiter ueber:

- State-Badge rechts
- Progress-Bar
- Claim-Button

sichtbar, nur die generische Copy wurde ersetzt.

### 4. Daily task copy polished

Alle 18 DailyCare-Varianten plus die bestehenden Basis-Tasks haben ueberarbeitete player-facing Titel und Beschreibungen in:

- `de`
- `en`
- `es`

Beispiele:

- `Wasser-Check`
- `Naehrstoffe pruefen`
- `Bluete im Blick`
- `Stress senken`
- `Tagesfokus holen`

## i18n Keys Added Or Adjusted

Angepasst wurden vor allem:

- `daily.task.*.title`
- `daily.task.*.description`

Neu hinzugefuegt:

- `daily.retention.task_description_fallback`

## How Old States Are Handled

Alter DailyCare-State bleibt kompatibel.

Wenn ein alter Save generische Task-Copy enthaelt, wird diese beim Restore/Normalize risikoarm auf die passende Task-Key-Struktur gemappt.

Wichtig:

- keine Reward-Neuausloesung
- keine Claim-Ledger-Aenderung
- keine zweite Task-Authority
- Reload-Sicherheit bleibt erhalten

## Tests Run

- `node --check app.js`
- `node --check storage.js`
- `node scripts/i18n-audit.js`
- `node test/daily-care-selection.test.js`
- `node test/buddy-daily-check.test.js`
- `node test/daily-tasks-runtime.test.js`
- `node test/daily-tasks-ui-state.test.js`
- `node test/guest-mode-startup.test.js`
- `node test/storage-profile-run-migration.test.js`
- `node test/reward-runtime-modes.test.js`

## Test Results

Passed:

- i18n-Audit ohne fehlende neue Keys
- DailyCare-Auswahltest mit Key-Pruefung fuer alle 18 Templates
- Buddy-Daily-Check-Test
- Daily-Runtime-Test inkl. Reload-/Legacy-State-Kompatibilitaet
- Daily-UI-State-Test mit konkreten gerenderten Titeln/Beschreibungen statt generischer Fallbacks
- Guest-Mode-Startup-Smoke
- Storage-/Migration-Test
- Reward-Runtime-Modes-Test

Failed:

- keine der ausgefuehrten Tests

## Known Limits

- bestehende bereits gespeicherte nicht-generische Freitexte bleiben erhalten und werden nicht aggressiv ersetzt
- die Missions-Karte zeigt weiterhin bewusst nur eine kurze Beschreibung, keine zusaetzliche zweite Hint-Zeile
- die Heuristik fuer alte Platzhalter ist absichtlich eng gehalten, um keine echten Custom-Werte zu ueberschreiben

## Recommendation For Phase 4 Weekly Missions

Phase 4 sollte auf derselben Authority aufsetzen:

- `retention.dailyCare` bleibt Daily-Owner
- Weekly Missions lesen aus erledigten DailyCare-Aktivitaeten, Streak und sicheren Statussignalen
- keine zweite Task-Authority und kein doppelter Reward-Pfad
