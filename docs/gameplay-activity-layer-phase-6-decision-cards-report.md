# Gameplay Activity Layer Phase 6: Decision Cards

## Ursache und technische Entscheidung

Decision Cards wurden bewusst **nicht** als neues Eventsystem umgesetzt. Die risikoarme Andockstelle ist eine kleine situative Leseschicht auf Basis von bereits vorhandenen, sicheren Signalen:

- `retention.dailyCare` als Daily-Authority
- `retention.dailyCare.buddyCheck` als Tageskontext
- `retention.weekly` als Weekly-Kontext
- vorhandene Statuswerte wie `water`, `stress`, `risk`
- sichere Phasen- und SimDay-Signale

Darum liegt die neue Logik isoliert in `src/gameplay/decisionCards.js` und speichert nur einen kleinen reload-sicheren Zustand unter `retention.decisionCards`.

## Warum Decision Cards kein Eventsystem sind

Decision Cards:

- erzeugen keine Events
- schreiben nichts in Events V2
- greifen nicht in Event-V1/V2-Routing ein
- triggern keine harten Simulationsfolgen
- bauen keine zweite Mission-, Daily- oder Reward-Authority

Sie lesen nur die vorhandene Lage und geben kleine situative Guidance oder Fokus-Hinweise zur bestehenden Activity-Layer-Schicht.

## Ergänzte Decision Cards

Es wurden 6 MVP-Karten ergänzt:

- `water_low`
- `stress_elevated`
- `risk_focus`
- `bloom_watch`
- `growth_routine`
- `timeboost_choice`

Jede Karte hat 3 Optionen mit i18n-Texten und einem kleinen Ergebnistext nach Auswahl.

## Genutzte Auswahlsignale

Die Kartenauswahl nutzt nur sichere, bereits vorhandene Signale:

- `simulation.simDay`
- `plant.phase`
- `status.water`
- `status.stress`
- `status.risk`
- `events.machineState`
- aktive `retention.dailyCare.tasks`
- `retention.dailyCare.buddyCheck.category`
- `retention.weekly.missionId`

Zusätzlich gibt es Repeat-Schutz über `recentCardIds`, damit dieselbe Karte nicht zu häufig direkt hintereinander auftaucht.

## Bewusst klein gehaltene Effekte

Im MVP bleiben die Effekte absichtlich leichtgewichtig:

- Fokus auf bestehende DailyCare-Tasks
- Hinweis auf bestehende Coin Actions wie `buddy_extra_tip` oder `safe_boost_check`
- Ergebnistext im UI

Nicht umgesetzt wurden bewusst:

- direkte starke Pflanzenwert-Änderungen
- Event-Trigger
- neue Rewards
- neue Coins
- neue Shop- oder Premium-Pfade

## Speicherung und Reload-Sicherheit

Gespeichert wird unter `retention.decisionCards`:

- `dayKey`
- `activeCard`
- `recentCardIds`
- `history`

`activeCard` speichert klein und migrationsfreundlich:

- `cardId`
- `primaryTaskId`
- `generatedAtMs`
- `answeredAtMs`
- `chosenOptionId`
- `resultTextKey`
- `focusTaskId`
- `suggestedCoinActionId`

Sicherheitsverhalten:

- maximal eine aktive Karte pro Spieltag
- Antwort pro Karte nur einmal
- Reload führt keine Antwort erneut aus
- alte Saves ohne `decisionCards` werden sauber normalisiert
- kein Startup-Overlay
- kein Reload-Dialog
- Guest-Mode-Startup bleibt unblockiert

## UI-Änderungen

Decision Cards werden minimal im bestehenden Missions-/DailyCare-Kontext angezeigt:

- neuer kleiner Block `missionsDecisionCardWrap` im Missions-Sheet
- kein neues Screen-System
- keine blockierende Darstellung
- nach Auswahl verschwinden die Optionen und der Ergebnistext bleibt sichtbar
- bei Fokus-/Coin-Action-Bezug wird eine kleine Anschluss-Notiz gezeigt

## i18n-Änderungen

In `de/en/es` wurden ergänzt:

- Bereich `daily.decision`
- Titel, Empty-/Status-Texte
- Karten-Titel und Beschreibungen
- Optionen und Kurzbeschreibungen
- Ergebnistexte nach Auswahl

`scripts/i18n-audit.js` bleibt grün.

## Geänderte Dateien

- `app.js`
- `index.html`
- `storage.js`
- `src/i18n/locales/de.json`
- `src/i18n/locales/en.json`
- `src/i18n/locales/es.json`
- `test/daily-tasks-runtime.test.js`
- `test/daily-tasks-ui-state.test.js`

## Neue Dateien

- `src/gameplay/decisionCards.js`
- `test/decision-cards.test.js`
- `docs/gameplay-activity-layer-phase-6-decision-cards-report.md`

## Tests und Ergebnisse

Ausgeführt:

- `node --check src/gameplay/decisionCards.js` — bestanden
- `node --check app.js` — bestanden
- `node --check storage.js` — bestanden
- `node --check test/decision-cards.test.js` — bestanden
- `node --check test/daily-tasks-runtime.test.js` — bestanden
- `node --check test/daily-tasks-ui-state.test.js` — bestanden
- `node scripts/i18n-audit.js` — bestanden
- `node test/decision-cards.test.js` — bestanden
- `node test/daily-care-selection.test.js` — bestanden
- `node test/buddy-daily-check.test.js` — bestanden
- `node test/weekly-missions.test.js` — bestanden
- `node test/coin-actions.test.js` — bestanden
- `node test/daily-tasks-runtime.test.js` — bestanden
- `node test/daily-tasks-ui-state.test.js` — bestanden
- `node test/guest-mode-startup.test.js` — bestanden
- `node test/storage-profile-run-migration.test.js` — bestanden
- `node test/reward-runtime-modes.test.js` — bestanden

Nicht ausgeführt:

- vollständiger gesamter Test-Sweep über alle Projektbereiche
- vollständige manuelle Mobile-Visual-QA
- manuelle Langzeit-QA über mehrere Ingame-Tage

## Bekannte Grenzen

- Decision Cards sind im MVP Guidance-orientiert und verändern die Simulation nicht direkt.
- Die Auswahl priorisiert bewusst nur sichere, gut lesbare Signale und bleibt damit konservativ.
- Anzeige aktuell nur im bestehenden Missions-Kontext, nicht als eigene Home-Komponente.

## Empfehlung für die nächste Phase

Als nächster sinnvoller Schritt bietet sich eine kleine Veredelung der Guidance-Schicht an, etwa kontextsensitivere Decision-Card-Ergebniszeilen oder eine noch feinere Verknüpfung mit Buddy-/Weekly-Kontexten, weiter ohne zweite Event- oder Reward-Authority.
