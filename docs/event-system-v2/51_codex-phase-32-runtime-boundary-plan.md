# 51 — Codex Phase 32 Runtime Boundary Plan

## 1. Aktueller Runtime-Status
- Legacy bleibt authoritative.
- `app.js` startet den Spiel-Loop ueber `setInterval(tick, state.simulation.tickIntervalMs)`.
- `app.js` delegiert Event-Tick, Choice und UI-Model aktuell an `window.GrowSimEventEngine`, wenn vorhanden.
- Bestehende Event-Dateien unter `src/events/*.js` bleiben die Live-Event-Autoritaet.

## 2. Aktueller Shadow-Bridge-Status
- Manueller Dry-Run und Report-Harness sind gruen.
- Ergebnis zuletzt: ok=true, safeToProceed=true, eventsMapped=12, bridgePass=12.
- Keine Runtime-, Save-, UI- oder Feature-Flag-Beruehrung.

## 3. Gelesene Runtime-Dateien
- `app.js` (read-only)
- `src/events/eventEngine.js` (read-only)
- `src/events/eventFeatureFlag.js` (read-only)
- `src/events/eventPersistenceAdapter.js` (read-only)
- `.codex/ARCHITECTURE_MAP.md`
- `.codex/SAVE_AND_MIGRATION_RULES.md`
- `.codex/PWA_SERVICE_WORKER_RULES.md`
- `.codex/TESTING_AND_QA.md`

## 4. Moegliche spaetere Boundary-Stelle
Primaer geeignet fuer spaetere Planung:
- Ein read-only Diagnostic-Entry direkt vor oder neben `app.js` -> `runEventStateMachine(nowMs)`.

Alternative mit hoeherem Risiko:
- `src/events/eventEngine.js` -> `routeTick(...)` als interner Preflight-Diagnostic-Punkt.

## 5. Eignung und Risiko
`runEventStateMachine(nowMs)` ist geeignet, weil:
- es bereits der zentrale Event-Tick-Zugang aus `app.js` ist.
- Legacy dort weiter delegiert bleiben kann.
- V2 spaeter nur einen Diagnostic Snapshot erzeugen koennte, bevor Legacy weiterlaeuft.

Risiko:
- Dieser Pfad liegt im Live-Tick. Jede versehentliche Arbeit, Mutation oder Exception kann Gameplay, Performance oder Save-Rhythmus stoeren.
- Deshalb darf Phase 33 noch keinen Hook setzen.

## 6. Datei-Tabuliste
Nicht anfassen fuer die erste echte Boundary-Beruehrung ohne eigene Freigabe:
- `app.js`
- `src/events/*.js`
- `data/events.json`
- `data/events.v2.json`
- `data/events.foundation.json`
- Save-/Storage-Dateien
- PWA-/Service-Worker-Dateien
- bestehende Event-UI-Dateien
- `package.json`

## 7. Read-only Daten, die V2 spaeter sehen duerfte
- `simulation.tickCount`
- `simulation.simTimeMs`
- `plant.stageIndex`
- `plant.stageProgress`
- `status.water`
- `status.nutrition`
- `status.stress`
- `climate.tent`
- `environmentControls`
- `setup`
- `events.machineState`
- `events.activeEventId`
- `events.scheduler`
- `history.events`

## 8. Daten, die V2 niemals mutieren darf
- gesamtes `state` Objekt
- `state.events`
- `state.status`
- `state.plant`
- `state.history`
- `state.run`
- Save-/Storage-Payloads
- Feature-Flag-Konfiguration
- Service-Worker/PWA-Cache-Zustand
- DOM/UI-Runtime

## 9. Guarded Entry Design
Spaeterer Entry muss:
- default disabled/no-op sein.
- nur manuell oder explizit guarded laufen.
- Legacy authoritative lassen.
- nur einen Diagnostic Snapshot erzeugen.
- keine Events aktivieren.
- keine UI anzeigen.
- keine Saves schreiben.
- bei blocker/error/warning > 0 hart abbrechen.
- bei fehlender No-Op-Bestaetigung hart abbrechen.

## 10. No-Op-Garantien
Jedes spaetere Bridge-Ergebnis muss enthalten:
- `runtimeTouched=false`
- `saveTouched=false`
- `uiReplaced=false`
- `featureFlagsTouched=false`
- `legacyEventsTouched=false`
- `eventActivated=false`

## 11. Diagnostic Snapshot Design
Der Snapshot soll nur enthalten:
- Meta: Zeitpunkt, Tick, Modus, Quelle.
- Read-only Plant/Event-Kontext.
- V2-Mapping-/Readiness-Ergebnis.
- Diagnostics und Guardrail-Status.
- Keine mutierbaren Referenzen auf Runtime-State.

## 12. Rollback-Regeln
- Rollback bedeutet: Entry bleibt oder wird No-Op.
- Kein Persistenz-Rollback noetig, weil nichts geschrieben werden darf.
- Bei Exception: No-Op-Result und Legacy laeuft weiter.

## 13. Abbruchkriterien
Sofort abbrechen bei:
- blocker/error/warning > 0 im Bridge-Preflight.
- `runtimeTouched`, `saveTouched`, `uiReplaced`, `featureFlagsTouched` oder `legacyEventsTouched` true.
- fehlender No-Op-Garantie.
- fehlender Legacy-Authority-Bestaetigung.
- unerwartetem Import in bestehende Runtime.

## 14. Test-/Smoke-Anforderungen vor erster echter Runtime-Beruehrung
- Manual Report Harness bleibt gruen.
- Boundary Checklist gruen.
- No-Op Guarantee gruen.
- Syntaxcheck aller Shadow-Bridge-Dateien.
- Manuelle Sichtpruefung: keine `app.js`-, Feature-Flag-, Save- oder UI-Aenderung.

## 15. Empfehlung fuer Phase 33
`Phase 33: Guarded Read-Only Snapshot Prototype`

Noch keine App-Anbindung:
- isolierter Snapshot-Erzeuger im V2-Bereich.
- kein Tick.
- kein UI.
- kein Save.
- nur ein Objekt vorbereiten, das spaeter einmal von Runtime gelesen werden koennte.

