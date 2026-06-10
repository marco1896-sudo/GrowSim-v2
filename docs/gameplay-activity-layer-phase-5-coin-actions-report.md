# Gameplay Activity Layer - Phase 5 Coin Actions Report

## Completed

Phase 5 wurde als kleine Veredelung der bestehenden Retention- und Reward-Struktur umgesetzt.

Coins haben jetzt mehrere optionale Nutzungen im Gameplay Activity Layer, ohne neues Shop-, Ads-, Premium- oder Reward-System:

- `Buddy Extra Tip`
- `Daily Focus Boost`
- `Weekly Push`
- `Safe Boost Check`

`Recovery Snack` ist bewusst nur als gesperrte Platzhalter-Aktion sichtbar und wurde nicht risikoreich an die Simulation angebunden.

---

## Changed Files

- `app.js`
- `index.html`
- `storage.js`
- `src/gameplay/weeklyMissions.js`
- `src/i18n/locales/de.json`
- `src/i18n/locales/en.json`
- `src/i18n/locales/es.json`
- `test/daily-tasks-runtime.test.js`
- `test/daily-tasks-ui-state.test.js`
- `test/weekly-missions.test.js`

## New Files

- `src/gameplay/coinActions.js`
- `test/coin-actions.test.js`
- `docs/gameplay-activity-layer-phase-5-coin-actions-report.md`

---

## Technical Decision

Die Coin Actions wurden bewusst **nicht** als Shop oder neue Reward-Authority gebaut.

Stattdessen wurde ein kleiner neuer Teilzustand unter `retention.coinActions` eingefuehrt. Das war die risikoaermste Erweiterung, weil dort bereits die direkte Nachbarschaft zu:

- `retention.dailyCare`
- `retention.weekly`
- `retention.claimLedger`
- Reload-/Migration-Normalisierung
- bestehender Missions-Sheet-UI

vorhanden ist.

Kaeufe laufen weiter ueber das bestehende Coin-System:

- `spendCoins()` fuer Kosten
- `grantCoins()` fuer sichere Reward-Vergabe
- `retention.claimLedger` fuer Reward-Deduplizierung dort, wo Rewards betroffen sind

Es wurde also kein zweites Economy-, Reward- oder Missionssystem eingefuehrt.

---

## Why No Shop / Ads / Premium System Was Built

Die Phase war explizit auf kleine optionale Coin-Nutzungen begrenzt.

Deshalb wurden bewusst **nicht** gebaut:

- kein neuer Shop-Screen
- keine Rewarded Ads
- keine Premium-/Paywall-Mechanik
- keine zweite Reward-Authority
- keine neue Aufgaben- oder Mission-Authority

So bleibt die Phase eine kleine Gameplay-Veredelung auf der bestehenden Architektur.

---

## Coin Actions Added

### 1. Buddy Extra Tip

- Kosten: `18` Coins
- Effekt: erzeugt pro Spieltag genau einen zusaetzlichen Buddy-Hinweis zur aktuellen DailyCare-/Weekly-Lage
- Simulationsaenderung: keine
- Limit: maximal `1x` pro Spieltag

### 2. Daily Focus Boost

- Kosten: `24` Coins
- Effekt: markiert die aktuell passende DailyCare-Aufgabe als Fokus
- Reward-Anbindung: gibt beim spaeteren Daily-Claim kontrolliert `+8` Coins dazu
- Reward-Sicherheit: Bonus wird direkt im bestehenden Daily-Claim mit demselben Claim-Key ausgezahlt, nicht ueber einen zweiten Reward-Pfad
- Limit: maximal `1x` pro Spieltag

### 3. Weekly Push

- Kosten: `28` Coins
- Effekt: zaehlt kontrolliert als `+1` auf die Weekly-Metrik `tasks_completed_week`
- Architektur: reiner Fortschritts-/Lesebonus, keine neue Weekly-Completion-Authority
- Limit: maximal `1x` pro Woche

### 4. Safe Boost Check

- Kosten: `8` Coins
- Effekt: Buddy gibt eine konservative Einordnung `safe` / `caution` / `unsafe` fuer Zeitboost bzw. Night Shift
- Simulationsaenderung: keine
- Limit: maximal `1x` pro Spieltag

### 5. Recovery Snack

- Status: sichtbar, aber deaktiviert
- Grund: eine echte Stress-/Risiko-Wirkung waere in dieser Phase eine riskante neue Care- oder Simulationskopplung gewesen

---

## Costs And Effects

- `Buddy Extra Tip`: `18` Coins, nur Text-/Guidance-Nutzen
- `Daily Focus Boost`: `24` Coins, `+8` Coins beim sicheren spaeteren Task-Claim
- `Weekly Push`: `28` Coins, `+1` sicherer Weekly-Progress auf `tasks_completed_week`
- `Safe Boost Check`: `8` Coins, nur Text-/Guidance-Nutzen
- `Recovery Snack`: noch nicht aktiv

---

## How Purchases Stay Reload-Safe

Speicherung erfolgt unter:

- `retention.coinActions.buddyTip`
- `retention.coinActions.focusBoost`
- `retention.coinActions.safeBoostCheck`
- `retention.coinActions.weeklyPush`

Tagesgebundene Aktionen tragen `dayKey`.
Wochengebundene Aktionen tragen `weekKey`.

Beim Tageswechsel werden nur die tagesgebundenen Coin Actions kontrolliert zurueckgesetzt.
Beim Wochenwechsel wird `weeklyPush` kontrolliert zurueckgesetzt.

Alte Saves ohne Coin-Action-State werden in:

- `app.js`
- `storage.js`

automatisch mit sicheren Defaults initialisiert.

---

## How Duplicate Rewards Are Prevented

### Daily Focus Boost

Der Focus-Bonus baut **keinen** zweiten Claim-Pfad.

Stattdessen:

- der Bonus wird nur beim ersten regulaeren `claimDailyTask()` beruecksichtigt
- die Coin-Auszahlung laeuft ueber den bestehenden Daily-Claim-Key `daily:task:{dayKey}:{taskId}`
- nach erfolgreichem Claim wird `focusBoost.claimedAtMs` gesetzt

Dadurch gibt es:

- keinen doppelten Bonus nach Reload
- keinen zweiten Daily-Reward-Key
- keine zweite Claim-Authority

### Weekly Mission

`Weekly Push` veraendert nur die Fortschrittsberechnung, nicht den Weekly-Claim-Key.

Der Weekly-Reward bleibt weiter abgesichert ueber:

- `weekly:mission:{weekKey}:{missionId}`
- `retention.claimLedger`
- bestehende `grantCoins()`-Deduplizierung

---

## How Old Saves Are Treated

Alte Saves ohne `retention.coinActions` bleiben kompatibel.

Beim Restore/Normalize werden sichere Defaults erzeugt, ohne:

- Coins neu auszuzahlen
- Claims neu auszufuehren
- DailyCare-/Weekly-State zu ersetzen

Es gibt keine Migration mit nachtraeglichen Belohnungen.

---

## UI Changes

Es wurde **keine** neue Shop- oder Missions-UI gebaut.

Stattdessen gibt es im bestehenden Missions-Sheet eine kleine neue Section:

- `Coin Actions`

Dort werden pro Aktion knapp gezeigt:

- Titel
- kurze Beschreibung
- Effekt bzw. aktueller Hinweis
- Status
- Kaufbutton, wenn verfuegbar

Zusaetzlich zeigt eine fokussierte DailyCare-Aufgabe jetzt klein:

- `Focus Boost aktiv · +8 Coins beim Claim`

Die Anzeige bleibt:

- nicht blockierend
- startup-neutral
- mobil kompakt

---

## i18n Changes

Neue i18n-Gruppen wurden in `de`, `en`, `es` eingefuegt:

- `daily.daily_care_title`
- `daily.micro_title`
- `daily.coin_actions.*`

Enthalten sind:

- Section-Titel
- Statuslabels
- Button-Label
- Toasts
- 5 Action-Texte
- Buddy-Extra-Tipps
- Safe-Boost-Check-Texte
- Focus-Boost-Hinweis

`i18n-audit` bleibt gruen.

---

## Tests Run

- `node --check src/gameplay/coinActions.js`
- `node --check src/gameplay/weeklyMissions.js`
- `node --check app.js`
- `node --check storage.js`
- `node scripts/i18n-audit.js`
- `node test/coin-actions.test.js`
- `node test/weekly-missions.test.js`
- `node test/daily-care-selection.test.js`
- `node test/buddy-daily-check.test.js`
- `node test/daily-tasks-runtime.test.js`
- `node test/daily-tasks-ui-state.test.js`
- `node test/guest-mode-startup.test.js`
- `node test/storage-profile-run-migration.test.js`
- `node test/reward-runtime-modes.test.js`

---

## Test Results

Passed:

- Syntax-Checks fuer neue/geaenderte Kernbereiche
- i18n-Audit
- neuer Coin-Action-Helper-Test
- Weekly-Mission-Test inkl. Weekly-Push-Bonus
- DailyCare-Auswahltest
- Buddy-Daily-Check-Test
- Daily-Runtime-Test inkl.
  - Coin-Kosten
  - Kaufblock bei zu wenig Coins
  - Buddy Extra Tip
  - Daily Focus Boost
  - Weekly Push nur `1x` pro Woche
  - Reload-Sicherheit
  - keine doppelten Rewards
  - alte Saves ohne Coin-Action-State
- Daily-UI-State-Test mit Coin-Action-Section
- Guest-Mode-Startup-Smoke
- Storage-/Migrationstest
- Reward-Runtime-Modus-Test

Failed:

- keine der ausgefuehrten Tests

Not run:

- kein kompletter `npm test`-Gesamtdurchlauf
- keine komplette manuelle Mobile-Visual-QA

---

## Known Limits

- `Recovery Snack` ist absichtlich noch deaktiviert
- `Buddy Extra Tip` und `Safe Boost Check` liefern nur Guidance, keine Simulationsaenderung
- `Weekly Push` stuetzt bewusst nur eine einzige sichere Weekly-Metrik
- es gibt weiterhin keinen Shop, keine Ads und keine Premiumkopplung

---

## Recommendation For Next Phase

Die naechste sinnvolle Phase ist eine kleine `Decision Card`- oder situative Choice-Schicht, aber weiter nur:

- nicht blockierend
- save-sicher
- ohne zweite Event-Authority
- mit kleinen, nachvollziehbaren Effekten

So bleibt der Gameplay Activity Layer weiter modular und risikoarm.
