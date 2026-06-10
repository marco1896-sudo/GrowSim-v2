# Gameplay Activity Layer - Phase 2 DailyCare Report

## Completed

Phase 2 wurde als kleine, kontrollierte Erweiterung des bestehenden `retention.dailyCare`-Systems umgesetzt.

Es wurde **keine zweite Daily-Task-Authority** eingefuehrt.

Stattdessen erzeugt `retention.dailyCare` jetzt weiter die aktiven Tagesaufgaben, aber mit:

- deutlich groesserem Task-Katalog
- zustandsabhaengiger Auswahl
- einfachem Wiederholschutz
- unveraenderter Claim-/Reward-Absicherung ueber das bestehende Ledger

---

## Changed Files

- `app.js`
- `storage.js`
- `index.html`
- `package.json`
- `src/i18n/locales/de.json`
- `src/i18n/locales/en.json`
- `src/i18n/locales/es.json`
- `test/daily-tasks-runtime.test.js`

## New Files

- `src/gameplay/dailyCareSelection.js`
- `test/daily-care-selection.test.js`
- `docs/gameplay-activity-layer-phase-2-dailycare-report.md`

---

## Technical Decision

Die Erweiterung wurde bewusst auf `retention.dailyCare` aufgebaut, weil dieses System bereits die zentrale Daily-Loop-Basis der Runtime ist:

- Daily-Care-Daten sind schon im Retention-State verankert
- Claims und Rewards sind bereits ueber `retention.claimLedger` abgesichert
- Reload- und Restore-Normalisierung existiert bereits
- die Missions-/Retention-UI rendert diese Aufgaben schon produktiv

Dadurch konnte Phase 2 den Daily-Loop vertiefen, ohne:

- ein neues paralleles Task-System
- ein neues Reward-System
- neue Event-Authority
- oder einen riskanten Save-State-Nebenpfad

einzufuehren.

---

## Current DailyCare Structure

### Wo Daily-Care-Daten definiert sind

- `app.js`
  - Retention-Defaults
  - `ensureRetentionState()`
  - `buildDailyCareTasks()`
  - `evaluateDailyRetention()`
  - `updateDailyCareCompletion()`
  - `claimDailyTask()`
- `storage.js`
  - Default-/Restore-/Normalize-Schutz fuer Retention-Daten

### Wo sie gespeichert werden

- im bestehenden Save-State unter `state.retention.dailyCare`
- mit Restore-/Normalize-Schutz in `storage.js`
- weiterhin ohne separates Gameplay-Parallelobjekt

### Wo sie angezeigt werden

- Missions-/Retention-Sheet in `app.js`
- Home-Retention-Teaser / bestehende Daily-Care-Anzeigen

### Wie Claims und Rewards abgesichert sind

- Claim-Pfade laufen weiter ueber `claimDailyTask()`
- Reward-Deduplizierung bleibt ueber `retention.claimLedger`
- Claim-Keys bleiben pro Tag und Task eindeutig
- Reload liest den Claim-Zustand weiter aus Ledger und Task-State

### Welche Wiederholungslogik vorher existierte

Vorher gab es praktisch keine echte Variationslogik.

`buildDailyCareTasks()` nutzte feste `alwaysOn`-Tasks:

- `water_once`
- `resolve_one_event`
- `open_app_twice`

Jetzt wird diese Stelle weiterhin genutzt, aber die Auswahl kommt aus einer kleinen separaten Selektionslogik.

---

## What Changed

## 1. Daily-Care-Auswahl modularisiert

Neue Datei:

- `src/gameplay/dailyCareSelection.js`

Diese Datei:

- baut einen sicheren Lesekontext aus bestehendem State
- bewertet Phase, Spieltag und Druckwerte
- waehlt daraus bis zu 3 Daily-Care-Tasks
- nutzt einen kleinen Repeat-Schutz gegen volle Tageswiederholungen

`retention.dailyCare` bleibt dabei der einzige Owner der aktiven Tagesaufgaben.

## 2. Task-Katalog erweitert

Die Daily-Care-Varianten wurden auf 18 Templates erweitert.

Davon sind 12+ neue Variationen produktiv verfuegbar.

Ergaenzte Varianten:

- `seedling_moisture_round`
- `water_recovery_round`
- `nutrient_rebalance`
- `climate_pressure_relief`
- `resolve_pending_pressure`
- `flowering_humidity_watch`
- `seedling_stability_check`
- `veg_feed_support`
- `veg_training_review`
- `flower_climate_tune`
- `flower_mold_watch`
- `ripening_quality_check`
- `ripening_final_round`
- `care_sheet_check`
- `analysis_sheet_check`
- `missions_board_check`

Vorhandene Varianten bleiben nutzbar:

- `open_app_twice`
- `stable_climate_window`

## 3. Trigger wurden kontrolliert erweitert

Die bestehende Completion-Logik bleibt zentral in `updateDailyCareCompletion()`.

Neu unterstuetzte Triggergruppen:

- `water_once`
- `fertilizing_once`
- `training_once`
- `environment_once`
- `resolve_one_event`
- `open_app_twice`
- `stable_climate_window`
- `care_sheet_check`
- `analysis_sheet_check`
- `missions_board_check`

Es wurde **kein neues Rewardsystem** eingefuehrt.

## 4. Minimaler Save-State-Zusatz fuer Repeat-Schutz

Kontrolliert ergaenzt:

- `retention.dailyCare.recentTaskIds`

Zweck:

- die zuletzt ausgespielten Daily-Task-IDs kurz speichern
- am naechsten Spieltag komplette 1:1-Wiederholungen moeglichst vermeiden

Der Zusatz bleibt klein, lokal zum Daily-Care-Bereich und wird in:

- `app.js`
- `storage.js`

normalisiert.

---

## Daily-Care Variants Added

Die Auswahl ist jetzt abhaengig von:

- Spieltag (`simulation.simDay`)
- Phase (`plant.phase`)
- Wasser
- Naehrstoffe
- Stress
- Risiko
- aktivem Event-Zustand

Beispiele:

- fruehe Seedling-Lage mit niedrigem Wasser priorisiert `seedling_moisture_round`
- Vegetationsphase kann `veg_feed_support` oder `veg_training_review` ziehen
- Bluete kann `flower_climate_tune` oder `flower_mold_watch` ziehen
- Endphase kann `ripening_quality_check` oder `ripening_final_round` ziehen
- Drucklagen koennen `resolve_pending_pressure`, `climate_pressure_relief` oder `nutrient_rebalance` priorisieren

Dabei bleiben maximal 3 aktive Tasks pro Tag erhalten.

---

## Repeat Protection

Der Wiederholschutz ist bewusst klein und save-sicher gehalten.

Funktionsweise:

1. Beim Tageswechsel werden die IDs der bisherigen Tasks in `retention.dailyCare.recentTaskIds` uebernommen.
2. Der Selektor nutzt diese Liste als negative Gewichtung.
3. Wenn Alternativen existieren, wird ein kompletter 1:1-Repeat vermieden.
4. Wenn nur wenige sinnvolle Kandidaten passen, darf das System kontrolliert auf bekannte Varianten zurueckfallen.

Wichtig:

- Es gibt keinen harten, fragilen Sperrmechanismus
- sondern einen einfachen, robusten Prioritaets-/Penalty-Ansatz
- dadurch bleibt das System auch bei knappen Kandidaten stabil

---

## Reward Safety

Die Reward-Sicherheit bleibt auf der bestehenden Architektur:

- `claimDailyTask()` bleibt der Claim-Owner
- Coins werden weiter ueber bestehende Coin-Pfade vergeben
- Deduplizierung bleibt ueber `retention.claimLedger`
- Claim-Keys bleiben `daily:task:{dayKey}:{taskId}`
- Reload rekonstruiert Claim-Zustand weiter ueber Task-Daten plus Ledger

Das verhindert:

- doppelte Coins nach Reload
- doppelte Claims am selben Tag
- parallele Reward-Pfade fuer Daily-Care

---

## Tests Run

- `node --check app.js`
- `node --check storage.js`
- `node --check src/gameplay/dailyCareSelection.js`
- `node --check test/daily-tasks-runtime.test.js`
- `node scripts/i18n-audit.js`
- `node test/daily-care-selection.test.js`
- `node test/daily-tasks-runtime.test.js`
- `node test/daily-tasks-ui-state.test.js`
- `node test/storage-profile-run-migration.test.js`
- `node test/guest-mode-startup.test.js`
- `node test/reward-runtime-modes.test.js`

---

## Test Results

Passed:

- Syntax-Checks fuer die geaenderten Kernbereiche
- i18n-Audit ohne fehlende neue Keys in `en`/`es`
- neue Unit-Pruefung fuer Daily-Care-Auswahl
- Daily-Runtime-Test inkl.
  - zustandsbasierter Auswahl
  - Repeat-Schutz
  - Claim-/Coin-Deduplizierung
  - Reload-Sicherheit
  - Legacy-Mission-Koexistenz
- Daily-UI-State-Test
- Storage-/Migration-Test
- Guest-Mode-Startup-Smoke
- Reward-Runtime-Modes-Test

Failed:

- keine der ausgefuehrten Tests

Not run:

- kompletter voller `npm test`-Durchlauf
- komplette Event-Release-Testkette
- manuelle Mobile-Visual-QA im Browser

Grund:

- fuer diese Phase wurde gezielt nur der relevante Bereich plus Stabilitaetsanker ausgefuehrt

---

## Known Limits

- Die Daily-Auswahl ist jetzt deutlich variabler, aber noch bewusst leichtgewichtig
- Es gibt noch keine Buddy-Daily-Check-Orchestrierung in Phase 2
- Es gibt noch keine Weekly-Missions-Schicht
- Es gibt noch keine Decision Cards
- Der Repeat-Schutz vermeidet volle Wiederholungen bevorzugt, garantiert aber nicht mathematisch jede Teilueberschneidung
- Die Auswahl arbeitet mit sicheren, vorhandenen State-Signalen und fuehrt noch keine tieferen neuen Simulationsmetriken ein

---

## Recommended Manual Checks

- Browser starten und mehrere Tageswechsel simulieren
- pruefen, dass sich die 3 Daily-Tasks ueber Tage sichtbar variieren
- Claim eines erledigten Tasks ausloesen und danach Reload pruefen
- Missionen-Sheet oeffnen und Task-Zustaende kontrollieren
- Guest-Mode starten und Boot/Reload beobachten
- fruehe Phase, Vegetationsphase, Bluete und Endphase stichprobenartig pruefen

---

## Recommendation For Phase 3

Der naechste logische Schritt ist:

**Buddy Daily Check**

Empfohlene Richtung:

- weiter auf bestehende Systeme lesen, nicht neue Authority bauen
- pro Spieltag genau einen passenden Buddy-Kurzcheck erzeugen
- Input:
  - `retention.dailyCare`
  - Pflanzenstatus
  - Event-Status
  - Risiko / Stress / Wasser / Naehrstoffe
  - Night-Shift-/Boost-Sicherheit
- minimal sichtbar auf bestehender UI andocken

So bleibt die Architektur konsistent:

- Phase 2 = Daily-Loop-Basis staerken
- Phase 3 = Buddy als Tagesbegleiter darueber legen
