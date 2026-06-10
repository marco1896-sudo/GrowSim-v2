# Grow Simulator - Gameplay Activity Layer Analysis

## Zweck

Diese Analyse bewertet, wie der geplante Gameplay Activity Layer in die bestehende Runtime integriert werden kann, ohne bestehende Systeme fuer Missionen, Coins, Buddy, Events V2, Zeitboost, Nacht ueberspringen, Save-State, Guest-Mode, Cloud-Sync, i18n und Tests zu beschaedigen.

Die Analyse ist bewusst integrationsorientiert:

- bestehende Owner-Dateien identifizieren
- vorhandene Tages- und Fortschrittssysteme erkennen
- Kollisionen zwischen alten und neuen Systemen vermeiden
- den kleinsten sicheren Einstieg fuer Phase 2 empfehlen

Noch keine Produktivaenderungen.

---

## Kurzfazit

Der wichtigste Befund ist:

Der geplante Gameplay Activity Layer startet **nicht** auf leerer Wiese.

Es existieren bereits drei angrenzende Systeme:

1. ein klassisches `missions`-System
2. ein neues `retention.dailyCare`-System mit taeglichen Aufgaben, Claim-Logik, Streaks und Missionen-Sheet-UI
3. ein Reward-/Coin-Action-System fuer Komfortaktionen wie `Night Shift`, `Care Boost`, `Climate Stabilize`, `Emergency Save` und weitere

Zusatzbefund:

- Buddy ist aktuell verteilt ueber Event-, Diagnose-, Analysis- und Care-Hint-Texte
- Events V1 laufen produktiv weiter
- Event V2 existiert bereits parallel als Bridge-/Pilot-/Save-Shape-System
- Save-State ist stark normalisiert und bereits migrationssensibel

Deshalb sollte der Gameplay Activity Layer **nicht als komplett neues Parallelprodukt** gebaut werden.

Die risikoaermste Richtung ist:

- `Daily Tasks` zunaechst als **Erweiterung von `retention.dailyCare`**
- `Weekly Missions` zunaechst als **Erweiterung von `retention` oder separatem kleinen Gameplay-Teilzustand**
- `Buddy Daily Check` als **neue Leseschicht ueber bestehende Status-, Event- und Retention-Daten**
- `Decision Cards` **nicht** im Missionssystem bauen, sondern als kleine, save-sichere Zusatzschicht nahe Event-/Gameplay-Runtime
- `Coin Actions` auf das bestehende Reward-Action-System aufsetzen statt eigenes Shop-/Currency-System zu bauen

---

## Bestehende Owner-Systeme

## 1. State / Save / Migration

Primäre Owner:

- `app.js`
- `storage.js`

Wichtige Befunde:

- `storage.js` normalisiert bereits einen grossen kanonischen Save-State
- `missions`, `retention`, `boost`, `events`, `eventV2`, `history`, `ui`, `run`, `profile` und weitere Bereiche werden beim Restore abgesichert
- `retention.dailyCare.tasks` wird bereits robust normalisiert
- `retention.claimLedger` verhindert doppelte Claims
- `eventV2` besitzt eigene Save-Shape-Initialisierung
- Remote-Save/Cloud-Sync ist bereits vorhanden
- Guest-Mode/Reset/Restore sind sensible Kernpfade

Relevanz fuer Gameplay Activity Layer:

- Neue taegliche Aufgaben duerfen nicht an der Save-Logik vorbei laufen
- Reward-Deduplizierung muss bestehende Claim-/Ledger-Muster wiederverwenden
- Eigene neue Tagesdaten sollten nicht ungeprueft als freies Ad-hoc-Objekt entstehen
- Jede neue State-Erweiterung muss fehlende Felder sicher initialisieren

Empfehlung:

- Phase 2 auf `retention.dailyCare` aufbauen
- Falls spaeter eigener Gameplay-State noetig ist, dann als klar abgegrenzter kanonischer Teil wie `state.gameplay`
- Neue Reward-Claims immer mit eindeutigen Claim-Keys

---

## 2. Bestehende Daily- / Retention- / Streak-Logik

Primäre Owner:

- `app.js`
- Missions-UI in `app.js`

Wichtige Befunde:

- Es gibt bereits `getRetentionDefaults()`
- Es gibt `retention.dailyCare`, `retention.streak`, `retention.micro`, `retention.claimLedger`, `retention.analytics`
- `evaluateDailyRetention()` erzeugt taegliche Tasks pro lokalem Tag
- `buildDailyCareTasks()` erzeugt aktuell feste Aufgaben
- `updateDailyCareCompletion()` aktualisiert Progress bei Triggern wie:
  - `action_success`
  - `event_resolved`
  - `session_start`
  - `climate_stable_window`
- `claimDailyTask()` vergibt Coins und triggert Streak-Fortschritt
- Das Missions-Sheet rendert bereits Daily-Care-Fortschritt, Claim-Buttons, Streak und Recovery

Aktuell vorhandene Daily-Care-Aufgaben:

- `water_once`
- `resolve_one_event`
- `open_app_twice`
- Template fuer `stable_climate_window`

Wichtige Einschränkung:

`buildDailyCareTasks()` waehlt aktuell noch starr `alwaysOn`-Tasks. Die Logik ist noch nicht zustandsbasiert.

Relevanz fuer Gameplay Activity Layer:

- Der geplante Daily-Task-Layer existiert funktional bereits in einer ersten Version
- Ein zweites Daily-System wuerde fast sicher zu Doppelungen, UI-Verwirrung und Reward-Konflikten fuehren

Empfehlung:

- Phase 2 sollte `retention.dailyCare` erweitern, nicht ersetzen
- Die richtige Arbeit ist hier:
  - bessere Task-Auswahl
  - Wiederholungsschutz
  - Stage-/State-/Event-basierte Selektion
  - saubere Reward- und Progress-Regeln

---

## 3. Bestehendes klassisches Mission-System

Primäre Owner:

- `data/missions.json`
- `app.js`
- `sim.js`

Wichtige Befunde:

- Missionen werden aus `data/missions.json` geladen
- `window.checkMissions()` wird auf `tick` und `action` aufgerufen
- `window.completeMission()` vergibt Coin-Belohnungen
- Das klassische Mission-System ist regelbasiert und eher statisch
- Beispiele:
  - `min_day`
  - `min_health`
  - `max_stress_duration`
  - `action_used`

Relevanz fuer Gameplay Activity Layer:

- Das bestehende Mission-System ist nicht fuer den neuen taeglichen Loop gebaut
- Es ist eher ein separates Fortschrittssystem
- Weekly Missions aus dem Konzept sollten dieses System **nicht direkt kapern**, solange Save-/UI-/Balance-Folgen unklar sind

Empfehlung:

- Bestehende Missionen bestehen lassen
- Gameplay-Weekly-Missions zunaechst separat neben dem Legacy-Mission-System fuehren
- Erst spaeter entscheiden, ob beide Systeme zusammengefuehrt werden koennen

---

## 4. Coins / Reward Actions / Komfortaktionen

Primäre Owner:

- `app.js`
- teilweise `src/monetization/*`

Wichtige Befunde:

- Coins werden zentral ueber `grantCoins()` und `spendCoins()` behandelt
- Es gibt bereits deduplizierte Coin-Vergaben fuer mehrere Systeme
- Reward Actions sind zentral registriert
- Bestehende Actions:
  - `night_shift`
  - `care_boost`
  - `climate_stabilize`
  - `emergency_save`
  - `fast_forward_event`
  - `event_start`
  - `event_reroll`
  - `auto_care`
  - `growth_boost`

Wichtige Befunde zu `Night Shift` / Zeitaktionen:

- `Night Shift` besitzt bereits Availability-Gates
- `skipNight` ist im UI verdrahtet
- Boost/Nacht-Features sind bereits mit Coins und Runtime verbunden

Relevanz fuer Gameplay Activity Layer:

- Coin Actions aus dem Konzept koennen stark vom bestehenden Reward-Action-System profitieren
- Ein neues, separates Coin-Action-System waere unnötig riskant

Empfehlung:

- Coin Actions als neue Reward-Action-Typen oder als neue Availability-/Presentation-Schicht auf bestehendem System aufbauen
- Beispiele fuer spaetere Activity-Layer-Integration:
  - Buddy-Tipp kaufen
  - Zusatz-Task freischalten
  - Zeitboost absichern
  - leichte Tagesbelohnungsverbesserung

---

## 5. Buddy / Guidance / Coaching

Primäre Owner:

- `app.js`
- `src/i18n/locales/*.json`
- Event-Texte in Event-System und Analysis-/Care-UI

Wichtige Befunde:

- Es gibt keinen einzelnen klaren `buddy daily check`-Owner
- Buddy ist aktuell verteilt ueber:
  - Event-Center-Texte
  - Care-Studio-Hints
  - Diagnose-/Analysis-Brief
  - Onboarding-Hooks
  - Daily-/Retention-Toasts

Das bedeutet:

- Buddy ist bereits produktseitig stark praesent, aber nicht als zusammenhaengender Tageskommentar orchestriert

Relevanz fuer Gameplay Activity Layer:

- `Buddy Daily Check` ist eine gute Produktchance
- technisch sollte er zunaechst **lesen und zusammenfassen**, nicht direkt Systemlogik ersetzen

Empfehlung:

- Phase 3 als neue Buddy-Kommentar-Auswahl ueber bestehende Daten:
  - Pflanzenzustand
  - Event-Status
  - Daily-Care-Tasks
  - Risiko / Stress / Wasser / Nährstoffe
  - Night-Shift-/Boost-Sicherheit
- Ein Daily Check sollte save-sicher sein und nur einmal pro Spieltag prominent erscheinen

---

## 6. Event-System V1 / Event V2 / Decision-Kontext

Primäre Owner:

- `events.js`
- `src/events/*`
- `src/events/EventSystemRuntimeBridge.js`

Wichtige Befunde:

- `events.js` steuert das produktive Legacy-Event-System
- Event-Zustaende: `activeEvent`, `resolving`, `resolved`, `cooldown`
- Event-Resolution vergibt bereits Rewards und fuehrt in Cooldown
- Event V2 existiert bereits als Bridge-/Cutover-/Save-Shape-/Preview-System
- `eventV2` ist damit ein sensibler Bereich mit laufender Migrationslogik

Relevanz fuer Gameplay Activity Layer:

- Decision Cards duerfen Events V2 nicht refactoren oder konkurrierende Event-Authority erzeugen
- Decision Cards sollten im MVP keine zweite allgemeine Eventmaschine werden

Empfehlung:

- Decision Cards in fruehen Phasen **nicht** als Ersatz fuer Events bauen
- Stattdessen:
  - kleiner, strikt limitierter Gameplay-Decision-Layer
  - maximal eine Karte pro Spieltag
  - klare Trigger
  - kleine, nachvollziehbare Effekte
  - eigene eindeutige Save-Markierungen
- spaeter pruefen, ob Decision Cards als Event-nahe Spezialfaelle modelliert werden koennen

---

## 7. Zeitboost / Nacht ueberspringen

Primäre Owner:

- `app.js`
- `ui.js`
- `storage.js`

Wichtige Befunde:

- `boost` ist eigener Save-State-Bereich
- `boostEndsAtMs`, `boostUsedToday`, `boostMaxPerDay` sind bereits persistiert
- `Night Shift` ist bereits als Coin-Action und UI-Action integriert
- Es gibt bereits Runtime- und Integrationstests fuer Night Shift

Relevanz fuer Gameplay Activity Layer:

- Das Konzept sollte diese Systeme **bewerten**, nicht neu implementieren
- Ein Activity-Layer-MVP kann schon grossen Wert schaffen, wenn er nur:
  - Sicherheitsbewertung
  - Warnung
  - Empfehlung
  - spaeter optional Coin-Aktion-Verknuepfung
  liefert

Empfehlung:

- In fruehen Phasen nur Empfehlungslogik auf Basis bestehender Statuswerte
- Keine direkte Aenderung an der Simulationszeitlogik ohne gesonderte Analyse

---

## 8. UI-Status

Primäre Owner:

- `app.js`
- `ui.js`

Wichtige Befunde:

- Es gibt bereits ein sichtbares Missions-Sheet mit:
  - Streak-Bereich
  - Daily-Care-Liste
  - Recovery-UI
  - Micro-Achievements
  - Legacy-Missions-Liste
- Es gibt bereits Home-Teaser fuer Retention/Daily Progress

Relevanz fuer Gameplay Activity Layer:

- Die erste MVP-Anbindung sollte wahrscheinlich **nicht** mit einem komplett neuen Screen starten
- Das vorhandene Missions-/Retention-Sheet ist der sicherste Integrationspunkt

Empfehlung:

- Phase 2 minimal sichtbar ueber bestehende Missions-/Retention-UI
- Homescreen-Karte spaeter gezielt ergaenzen, wenn Daily-Logik stabil ist

---

## 9. i18n

Primäre Owner:

- `src/i18n/index.js`
- `src/i18n/locales/de.json`
- `src/i18n/locales/en.json`
- `src/i18n/locales/es.json`

Wichtige Befunde:

- Laufzeit nutzt klaren i18n-Resolver mit Fallback auf Englisch
- Daily-/Retention-Texte sind bereits i18n-basiert
- Neues sichtbares UI sollte konsequent i18n-Keys verwenden

Relevanz fuer Gameplay Activity Layer:

- Daily Tasks, Buddy Daily Checks, Weekly Missions, Decision Cards und Coin Actions muessen von Anfang an i18n-faehig sein
- Hart codierte neue Texte waeren hier besonders riskant, weil der Bereich stark UI- und textgetrieben ist

Empfehlung:

- Neue Inhalte sofort als saubere Key-Gruppen anlegen
- moegliche Namespace-Richtung:
  - `gameplay.daily.*`
  - `gameplay.weekly.*`
  - `gameplay.buddy.*`
  - `gameplay.decision.*`
  - `gameplay.coin_action.*`

---

## 10. Testlage

Bestehende relevante Testanker:

- `test/nightshift-coin-integration-runtime.test.js`
- `test/storage-profile-run-migration.test.js`
- `test/reward-runtime-modes.test.js`
- `test/i18n-runtime.test.js`
- zahlreiche Event-Runtime-, Event-Persistence- und UI-Tests

Wichtige Befunde:

- Zeit-/Coin-/Reward-Pfade sind bereits testbar
- Storage/Migration ist bereits testseitig sensibel abgesichert
- Event-System besitzt viele Regressionstests

Relevanz fuer Gameplay Activity Layer:

- Phase 2 kann und sollte sich an bestehende Testmuster anhaengen
- Besonders wichtig:
  - Tageswechsel
  - Reload
  - doppelte Claims verhindern
  - Event-Resolved -> Task-Progress
  - Session-Start -> Task-Progress
  - Action-Success -> Task-Progress
  - Guest-/Restore-/Remote-Save-Sicherheit

---

## Kollisionen und Haupt-Risiken

## 1. Parallel-Task-System

Groesstes Risiko:

Ein neuer `gameplay-state.activeDailyTasks` neben `retention.dailyCare.tasks` wuerde doppelte Aufgaben, doppelte Rewards und widerspruechliche UI erzeugen.

## 2. Rewards doppeln

Task-Claims, Missions-Claims, Event-Completion und Reward-Actions zahlen schon jetzt Coins aus.

Neue Activity-Rewards muessen:

- eindeutige Claim-Keys haben
- bestehende Ledger-/Dedup-Muster nutzen
- Reload-resistent sein

## 3. Event-Authority verletzen

Decision Cards duerfen nicht unbeabsichtigt zu einem zweiten Event-System werden.

## 4. Save-/Cloud-/Guest-Mode brechen

Neue Tagesdaten ohne saubere Default-/Restore-/Migration-Logik waeren hochriskant.

## 5. Buddy doppelt oder nervig

Ein Daily Check darf nicht mit Event-Popup, Care-Hints und Analysis-Brief konkurrieren.

---

## Empfohlene Integrationsstrategie

## Phase-2-Empfehlung: Daily Task Layer auf bestehendem Retention-System

Empfohlene technische Richtung:

- `retention.dailyCare` bleibt die aktive Tagesaufgabenquelle
- neue Auswahlregeln werden modularisiert
- bestehende Triggerpfade bleiben erhalten:
  - `action_success`
  - `event_resolved`
  - `session_start`
  - spaeter weitere Gameplay-Trigger

Empfohlene erste Modultrennung:

- neuer kleiner Gameplay-Bereich fuer reine Auswahl-/Leselogik, nicht fuer eine zweite State-Authority
- Beispiel:

```text
src/gameplay/
  dailyTaskCatalog.js
  dailyTaskSelection.js
  gameplaySelectors.js
```

`retention.dailyCare` bleibt dabei Save-Owner fuer die aktiven Tagesaufgaben.

## Phase-3-Empfehlung: Buddy Daily Check als Leseschicht

- pro Spieltag ein Kommentar
- liest Status, Eventlage, Daily Tasks und Night-/Boost-Sicherheit
- eigener kleiner Save-Marker, damit die Ausgabe nicht stoerend erneut aufspringt

## Phase-4-Empfehlung: Decision Cards als kleiner Zusatzlayer

- klein halten
- kein Event-Refactor
- eigene Trigger, eigenes Claim-/Answer-Ledger
- kleine Delta-Effekte

## Phase-5-Empfehlung: Weekly Missions und Coin Actions

- Weekly Missions nicht im Legacy-Mission-System erzwingen
- Coin Actions auf Reward-Action-System aufbauen

---

## Konkrete Empfehlung pro Konzeptmodul

## Daily Tasks

Empfehlung:

- auf `retention.dailyCare` bauen
- bestehende feste Auswahl durch zustandsbasierte Auswahl ersetzen

## Weekly Missions

Empfehlung:

- nicht im Legacy-Mission-System anfangen
- zunaechst als neuer, kleiner Progress-Bereich fuer den Gameplay Layer

## Buddy Daily Check

Empfehlung:

- neue Orchestrierungsschicht
- keine Ersetzung bestehender Buddy-Texte

## Decision Cards

Empfehlung:

- neuer kleiner Speziallayer
- nicht in Events V2 hineinschreiben

## Coin Actions

Empfehlung:

- bestehendes Reward-Action-System erweitern

## Zeitboost / Nacht ueberspringen

Empfehlung:

- vorerst nur bewerten und kommentieren
- keine tiefe Runtime-Aenderung in frueher Phase

---

## Risikoärmste Umsetzungsreihenfolge

1. Daily Task Layer ueber `retention.dailyCare` vertiefen
2. Buddy Daily Check als sanfte Leseschicht
3. Decision Cards klein und isoliert
4. Weekly Missions als separater mittelfristiger Progress
5. Coin Actions / Boost-Safety-Verknuepfung

Diese Reihenfolge entspricht auch dem geringsten Risiko fuer:

- Save-Stabilitaet
- Event-Stabilitaet
- UI-Klarheit
- Reward-Korrektheit

---

## Empfohlene naechste Freigabe

Die sicherste naechste Umsetzungsstufe ist:

**Phase 2: Daily Task Layer**

Aber nicht als neues Parallel-System, sondern als:

**gezielte Erweiterung des bestehenden `retention.dailyCare`-Systems mit zustandsbasierter Task-Auswahl, Wiederholungsschutz und save-sicherer Reward-Logik.**

Das ist die sauberste Bruecke zwischen Konzept und bestehender Architektur.

---

## Ergebnis

Der Gameplay Activity Layer passt grundsaetzlich gut zum Produktziel.

Die Architektur verlangt aber eine wichtige Korrektur der Konzept-Richtung:

Nicht neu daneben bauen.

Sondern:

- vorhandene Daily-/Retention-Struktur erweitern
- Buddy als orchestrierende Leseschicht staerken
- Event- und Reward-Systeme respektieren
- Save- und Claim-Logik konsequent wiederverwenden

So bleibt der Einstieg realistisch, modular und stabil.
