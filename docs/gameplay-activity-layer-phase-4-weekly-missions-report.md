# Gameplay Activity Layer - Phase 4 Weekly Missions Report

## Completed

Phase 4 wurde als kleine Weekly-Mission-Leseschicht auf Basis des bestehenden `retention`-Systems umgesetzt.

Es wurde keine zweite Daily-Task-Authority und keine zweite Mission-Authority gebaut.

Weekly Missions lesen nur aus:

- `retention.dailyCare`
- `retention.streak`
- `retention.analytics.dailyStats`
- sicheren aktuellen Statussignalen wie Wasser, Naehrstoffe, Stress und Risiko

Die neue Wochenebene ist damit ein Progress-Layer ueber bestehender Runtime, kein paralleles Missionssystem.

## Changed Files

- `app.js`
- `index.html`
- `storage.js`
- `src/i18n/locales/de.json`
- `src/i18n/locales/en.json`
- `src/i18n/locales/es.json`
- `test/daily-tasks-runtime.test.js`
- `test/daily-tasks-ui-state.test.js`

## New Files

- `src/gameplay/weeklyMissions.js`
- `test/weekly-missions.test.js`
- `docs/gameplay-activity-layer-phase-4-weekly-missions-report.md`

## Technical Decision

Weekly Missions wurden bewusst als kleiner State innerhalb von `retention` umgesetzt:

- `retention.weekly.weekKey`
- `retention.weekly.missionId`
- `retention.weekly.rewardCoins`
- `retention.weekly.generatedAtMs`
- `retention.weekly.completedAtMs`
- `retention.weekly.claimedAtMs`
- `retention.weekly.history`

Das war die risikoaermste Stelle, weil dort bereits:

- DailyCare-State
- Streak-State
- Analytics-/DailyStats
- Claim-Ledger
- Reload-Normalisierung

vorhanden sind.

Dadurch mussten weder das Legacy-`missions`-System noch Events V2 oder eine neue Reward-Authority angefasst werden.

## Why Weekly Missions Are Only A Read Layer / Progress Layer

Weekly Missions erzeugen keine neuen Gameplay-Trigger und besitzen keine eigene Aktions- oder Completion-Authority.

Sie:

- lesen erledigte DailyCare-Aktivitaet
- lesen aktive Tage aus `retention.analytics.dailyStats`
- lesen die aktuelle Streak
- lesen sichere aktuelle Statussignale
- leiten daraus nur Fortschritt und Claimbarkeit ab

DailyCare bleibt damit weiter der eigentliche taegliche Owner. Weekly Missions legen sich nur als mittelfristige Zielschicht darueber.

## Weekly Mission Templates Added

Es wurden 5 MVP-Templates angelegt:

- `stable_start`
- `clean_routine`
- `growth_focus`
- `bloom_focus`
- `risk_reset`

Die Auswahl ist zustandsabhaengig:

- fruehe Phase -> `stable_start`
- Vegetationsphase -> `growth_focus`
- Bluete / Reife -> `bloom_focus`
- hohe Risiko-/Stresslage -> `risk_reset`
- sonst -> `clean_routine`

## How Progress Is Calculated

Der Fortschritt wird deterministisch aus vorhandenen Daten berechnet.

Verwendete Metriken:

- `tasks_completed_week`
- `active_days_week`
- `streak_current`
- `calm_today`
- `resource_stability_today`
- `bloom_calm_today`
- `risk_low_today`

Grundlagen:

- `retention.analytics.dailyStats` fuer abgeschlossene DailyCare-Aufgaben und aktive Tage
- `retention.streak.currentCount` fuer die laufende Serie
- aktuelle `status`-Werte fuer sichere Tageschecks

Beispiele:

- `stable_start`: Weekly-Tasks + aktive Tage + kleine Streak
- `growth_focus`: Weekly-Tasks + aktive Tage + Wasser/Naehrstoffe heute stabil
- `bloom_focus`: Weekly-Tasks + aktive Tage + Risiko/Stress heute ruhig
- `risk_reset`: Weekly-Tasks + aktive Tage + Risiko heute wieder gesenkt

## Where It Is Stored

Aktive Weekly Mission:

- `state.retention.weekly`

Archiv:

- `state.retention.weekly.history`

Reload-Sicherheit:

- aktive Woche bleibt ueber `weekKey` + `missionId` stabil
- Fortschritt wird nicht fragil separat gespiegelt, sondern aus bestehenden Daten wieder abgeleitet
- Completion-/Claim-Zeitpunkte werden gespeichert

## How Reward Duplicates Are Prevented

Weekly-Rewards nutzen keinen neuen Reward-Pfad.

Die Claim-Sicherheit bleibt ueber das bestehende Ledger:

- Claim-Key: `weekly:mission:{weekKey}:{missionId}`
- Coins laufen ueber `grantCoins()`
- Deduplizierung ueber `retention.claimLedger`
- Reload rekonstruiert Claim-Zustand ueber `claimedAtMs` plus Ledger

Damit gibt es keine doppelten Weekly-Coins nach Reload oder Mehrfach-Claim.

## How Old Saves Are Treated

Alte Saves ohne Weekly-State werden automatisch normalisiert:

- `retention.weekly` wird mit sicheren Defaults initialisiert
- fehlende History wird als leeres Array angelegt
- bestehende DailyCare-, Streak- und Mission-Daten bleiben unangetastet

Es gibt keine Reward-Neuausloesung fuer alte Saves.

## UI Changes

Weekly Missions werden minimal im bestehenden Missions-Sheet angezeigt:

- neue kleine Section `Weekly Mission`
- Titel
- kurze Beschreibung
- Fortschrittszeile aus vorhandenen Signalen
- Belohnungszeile
- Claim-Button, wenn abgeschlossen

Es gibt:

- kein neues grosses UI
- kein Overlay
- keinen Startup-Dialog
- keine blockierende Anzeige

## i18n Changes

Neue Weekly-Texte wurden ueber die bestehende `daily`-Struktur eingefuehrt:

- `daily.weekly.title`
- `daily.weekly.empty`
- `daily.weekly.in_progress`
- `daily.weekly.ready`
- `daily.weekly.claimed`
- `daily.weekly.claim`
- `daily.weekly.claim_*`
- `daily.weekly.reward_line`
- `daily.weekly.mission.*`
- `daily.weekly.metric.*`

Alle neuen Keys wurden in:

- `de`
- `en`
- `es`

vollstaendig gepflegt.

## Tests Run

- `node --check src/gameplay/weeklyMissions.js`
- `node --check app.js`
- `node --check storage.js`
- `node scripts/i18n-audit.js`
- `node test/weekly-missions.test.js`
- `node test/daily-care-selection.test.js`
- `node test/buddy-daily-check.test.js`
- `node test/daily-tasks-runtime.test.js`
- `node test/daily-tasks-ui-state.test.js`
- `node test/guest-mode-startup.test.js`
- `node test/storage-profile-run-migration.test.js`
- `node test/reward-runtime-modes.test.js`

## Test Results

Passed:

- Syntax-Checks fuer neue/geaenderte Kernbereiche
- i18n-Audit ohne fehlende neue Keys
- neuer Weekly-Helper-Test fuer Auswahl und Fortschritt
- DailyCare-Auswahltest
- Buddy-Daily-Check-Test
- Daily-Runtime-Test inkl.
  - Weekly-Initialisierung
  - Fortschritt aus DailyStats
  - Reload-Sicherheit
  - keine doppelten Weekly-Rewards
  - Legacy-Missions-Koexistenz
- Daily-UI-State-Test mit sichtbarer Weekly Mission
- Guest-Mode-Startup-Smoke
- Storage-/Migration-Test
- Reward-Runtime-Modes-Test

Failed:

- keine der ausgefuehrten Tests

## Known Limits

- es gibt bewusst nur eine aktive Weekly Mission pro Woche
- archivierte alte Weekly Missions werden gespeichert, aber nicht als eigene History-UI dargestellt
- wenn eine Woche endet und eine alte Weekly noch nicht geclaimt wurde, bleibt sie nur im Archiv erhalten und nicht als nachtraeglich claimbare UI erhalten
- Weekly-Fortschritt nutzt absichtlich nur sichere, vorhandene Signale und keine tieferen neuen Simulationsmetriken

## Recommendation For The Next Phase

Die naechste sinnvolle Phase ist weiterhin:

- kleine `Decision Cards` als isolierter Zusatzlayer

Wichtig dabei:

- weiter keine zweite Event-Authority bauen
- nur situationsbasierte, kleine Entscheidungen
- Effects klein und nachvollziehbar halten
