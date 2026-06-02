# 55 - Codex Phase 35 Runtime Hook Design Review

## 1. Moegliche Hook-Stellen

### Kandidat A: `app.js` -> `runEventStateMachine(nowMs)`
Status: bevorzugter spaeterer Kandidat, aber noch kein Hook in Phase 35.

Beobachtung:
- `app.js` ruft `runEventStateMachine(nowMs)` als zentrale Event-Tick-Grenze.
- Diese Funktion delegiert an `window.GrowSimEventEngine.routeTick(nowMs, state)`, wenn vorhanden.
- Danach bleibt die bestehende Legacy-/EventEngine-Autoritaet aktiv.

Bewertung:
- Geeignet fuer einen spaeteren, minimalen read-only Diagnostic-Preflight.
- Risiko bleibt hoch, weil der Pfad Tick-nahe ist.
- Deshalb darf ein spaeterer Hook nur default-off/no-op sein.

### Kandidat B: `src/events/eventEngine.js` -> `routeTick(nowMs, state)`
Status: fuer den ersten V2-Bridge-Hook nicht empfohlen.

Beobachtung:
- `eventEngine.js` enthaelt bereits bestehende Shadow-, Feature-Flag-, QA- und Persistence-nahe Mechaniken.
- Die Datei besitzt eigene Shadow-Buckets, Routing-Entscheidungen, Readiness-/Cutover-Logik und Persistence Adapter Naehe.

Bewertung:
- Hoehere Kopplung.
- Hoeheres Risiko, bestehende Shadow-/Cutover-Logik mit V2-Bridge-Planung zu vermischen.
- Nicht geeignet fuer den ersten minimalen V2-read-only Hook.

### Kandidat C: Dev-/Manual-Harness
Status: bereits sicher und genutzt.

Bewertung:
- Kein Runtime-Hook.
- Gut fuer Preflight, Diagnostics und Regression.
- Nicht ausreichend, um spaeter Live-Kontext zu pruefen.

## 2. Empfohlene Hook-Stelle
Empfohlen fuer eine spaetere Phase:
- `app.js` direkt vor oder neben `runEventStateMachine(nowMs)`.

Wichtig:
- Phase 35 baut diesen Hook nicht.
- Phase 36 darf nur dann weitergehen, wenn sie erneut explizit freigegeben wird.

## 3. Warum diese Stelle geeignet ist
- Sie ist die schmalste erkennbare zentrale Event-Runtime-Grenze.
- Legacy kann direkt danach unveraendert weiterlaufen.
- Ein spaeterer Entry kann No-Op bleiben und nur einen Diagnostic Snapshot erzeugen.
- Es muss keine bestehende EventEngine-Route ersetzt werden.
- Die V2-Bridge muss keine bestehende Feature-Flag- oder Persistence-Logik anfassen.

## 4. Warum Alternativen riskanter sind
`src/events/eventEngine.js` ist riskanter, weil:
- dort bereits Routing-, Shadow- und Cutover-Logik lebt.
- Feature-Flag-Modi (`legacy`, `shadow`, `new`, interne Cutover-Pfade) dort relevant sind.
- Persistence-nahe Shadow-State-Funktionen vorhanden sind.
- ein V2-Hook dort leichter mit bestehenden Shadow-Systemen verwechselt werden koennte.

Direkte UI-Hooks sind riskanter, weil:
- UI keine Event-Autoritaet besitzen darf.
- V2 noch keine Event-UI ersetzen soll.
- Snapshot-/Bridge-Diagnostics nicht als Spieler-UI sichtbar werden duerfen.

Save-/Persistence-Hooks sind ausgeschlossen, weil:
- Phase 35/36 keine Save-Migration oder Save-Schreiblogik erlauben.
- V2 Diagnostic Snapshots nicht persistiert werden sollen.

## 5. Importgrenzen
Spaeter erlaubt, wenn Phase 36 explizit freigegeben wird:
- Runtime darf maximal einen kleinen Guarded-Entry aus `src/events/v2/shadow-bridge/` importieren.
- Dieser Entry darf keine Runtime-Dateien importieren.
- Der Entry darf nur explizit uebergebene, sanitizte Daten lesen.

Weiter verboten:
- V2 importiert `app.js`.
- V2 importiert bestehende `src/events/*.js`.
- V2 importiert Save-/Persistence-Dateien.
- V2 importiert UI-Dateien.
- Runtime importiert tiefe UI-Lab-/QA-Interna direkt.

Importregel:
- Wenn ueberhaupt, dann genau eine Richtung: Runtime -> kleiner V2 Guarded Entry.
- Keine Rueckreferenz von V2 -> Runtime.

## 6. Erlaubte Read-only Daten
Ein spaeterer Hook duerfte nur eine kopierte/sanitizte Teilmenge sehen:
- `simulation.tickCount`
- `simulation.simTimeMs`
- `plant.stageIndex`
- `plant.stageProgress`
- `status.water`
- `status.nutrition`
- `status.stress`
- `setup.mode`
- `setup.type`
- `events.activeEventId`
- `events.machineState`

Optional nur als flache Summary:
- `events.scheduler`
- kleine History-Zusammenfassung, keine volle mutable History.

## 7. Verbotene Mutationen
Strikt verboten:
- `state` schreiben.
- `state.events` schreiben.
- `state.status` schreiben.
- `state.plant` schreiben.
- `state.history` schreiben.
- Save-/Storage-Payloads schreiben.
- Feature-Flags lesen und setzen fuer Umschaltung.
- UI/DOM schreiben.
- Events aktivieren.
- Choices routen.
- Persistenzadapter aufrufen.

## 8. No-Op-Garantie
Jedes spaetere Ergebnis muss enthalten:
- `runtimeTouched=false`
- `saveTouched=false`
- `uiReplaced=false`
- `featureFlagsTouched=false`
- `legacyEventsTouched=false`
- `eventActivated=false`
- `legacyAuthoritative=true`
- `noop=true`
- `safeToProceed=true` nur bei komplett gruenem Zustand.

Default:
- disabled.
- no-op.
- keine automatische Ausfuehrung.
- Legacy bleibt authoritative.

## 9. Abort-Kriterien
Hart abbrechen bei:
- Combined Report nicht gruen.
- Snapshot Validation nicht gruen.
- `blocker/error/warning > 0`.
- `budgetWarnings > 0`.
- irgendeinem Schutzflag `true`.
- fehlendem `noop=true`.
- fehlendem `legacyAuthoritative=true`.
- Exception im Guarded Entry.
- Verdacht auf Live-State-Referenz.
- unerwartetem Import in bestehende Runtime aus V2 heraus.

Bei Abort:
- `ok=false`.
- `safeToProceed=false`.
- `abortReason` setzen.
- Legacy unveraendert weiterlaufen lassen.

## 10. Rollback-Plan
Rollback bedeutet:
- Guarded Entry bleibt oder wird wieder No-Op.
- Wenn spaeter ein Hook existiert, wird genau dieser eine Hook entfernt oder auf disabled gesetzt.
- Keine Save-Rollbacks noetig, weil nichts gespeichert werden darf.
- Keine UI-Rollbacks noetig, weil nichts ersetzt werden darf.

Rollback-Schritte:
- Combined Report erneut ausfuehren.
- Schutzflags pruefen.
- `app.js` Diff pruefen.
- `package.json` Diff pruefen.
- Save-/Persistence-Dateien pruefen.
- Legacy Event-Flow manuell smoke-testen.

## 11. Testanforderungen vor Phase 36
Vor einem minimalen Hook-Schritt muessen gruen sein:
- `node dev/run-event-v2-shadow-bridge-combined-report.js`
- `node dev/run-event-v2-shadow-bridge-combined-report.js --markdown`
- Syntaxcheck aller `src/events/v2/shadow-bridge/*.js`
- Guardrail-Negativcheck: absichtliche Verletzung blockt.
- Git-Diff: `package.json` unveraendert.
- Git-Diff: Save-/Persistence-Dateien unveraendert.
- Manuelle Pruefung: `app.js` nur in Phase 36 mit eigener Freigabe.

## 12. Go/No-Go fuer Phase 36
Hook-Go fuer Phase 36:
- `Go`, aber nur fuer einen extrem kleinen, default-off/no-op Plan oder Stub.

Hook-No-Go:
- Keine Eventaktivierung.
- Keine UI.
- Kein Save.
- Keine Feature-Flag-Aenderung.
- Kein Tick-Spam.
- Keine breite Integration.
- Keine Aenderung an `src/events/*.js`.

Empfohlener Phase-36-Umfang:
- `Minimal Read-Only Hook Stub Plan or Implementation`
- Wenn Implementation: genau ein minimaler, guarded No-Op Entry.
- Legacy bleibt authoritative.
