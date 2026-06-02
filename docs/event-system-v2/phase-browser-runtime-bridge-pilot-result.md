# Eventsystem V2 - Browser Runtime Bridge Pilot Result

## Executive Summary

Der Browser-Runtime-Pilot ist umgesetzt: die Live-App lädt die zentrale `EventSystemRuntimeBridge`, initialisiert `state.eventV2` defensiv und konsultiert die Bridge an den wichtigsten Runtime-Hook-Points.

Statusentscheidung:

- V2 ist im neuen Bridge-Pfad die bevorzugte Event-Autorität.
- V1 bleibt als Legacy-Read-Fallback erhalten.
- V1 darf im Bridge-Pfad keine neuen Events erzeugen, keine Resolve-Writes ausführen und keine Event-Writes übernehmen.
- Es wurde kein direkter Storage-Zugriff und keine harte Migration eingebaut.
- Der Pilot ist bewusst noch kein vollständiger Event-Center- oder Save-Cutover.

## Geänderte Dateien

- `src/events/EventSystemRuntimeBridge.js`
  - Browser-kompatibel gemacht, Browser-Global registriert und No-Storage-Pilot-Funktionen ergänzt.
- `index.html`
  - Lädt die Bridge vor der produktiven App-Runtime.
- `storage.js`
  - Ergänzt `state.eventV2` defensiv in der bestehenden State-Normalisierung und beim Default-Reset.
- `app.js`
  - Konsultiert die Bridge vor Legacy-Event-Tick und Legacy-Resolve.
- `sim.js`
  - Konsultiert die Bridge bei Simulation Advance, Offline-Catchup, Resume-Reconciliation und Event-Boost.

## Neue Dateien

- `docs/event-system-v2/phase-browser-runtime-bridge-pilot.md`
  - Hook-Point-Analyse und Pilotstrategie.
- `docs/event-system-v2/phase-browser-runtime-bridge-pilot-result.md`
  - Abschlussbericht dieser Phase.
- `dev/run-event-system-v2-browser-runtime-bridge-pilot-smoke.js`
  - Dev-Smoke fuer Browser-Bridge-Registrierung, defensive Initialisierung, V1/V2-Autoritaet und No-Storage-Safety.

## Runtime Hook Points

Gefunden und fuer den Pilot kontrolliert angebunden:

- `app.js`
  - `runEventStateMachine(nowMs)` fuer produktive Event-Ticks.
  - `onEventOptionClick(optionId)` fuer Legacy-Resolve-Pfade.
- `sim.js`
  - `advanceSimulationTime(...)` fuer aktive Simulation und Offline-Catchup.
  - `reconcileEventStateAfterResume(...)` fuer Resume-Reconciliation.
  - `onBoostAction()` fuer Event-Boost-Ausloesung.
- `storage.js`
  - `getCanonicalEvents(snapshot)` als vorhandene defensive Normalisierungsstelle.
  - `resetStateToDefaults()` fuer neue Default-States.
- Event Center/UI
  - Kein Redesign. V2-Daten werden ueber Bridge-Preview defensiv lesbar gehalten; produktives Event-Center-Resolve bleibt eine eigene Folgephase.

## Bridge-Einbindung

Die Bridge wird im Browser als `window.GrowSimEventSystemRuntimeBridge` registriert. Runtime-Aufrufer verwenden `consultBrowserRuntimeBridge(...)`.

Der Pilot-Modus lautet:

```js
eventSystemMode: "v2-active-with-v1-legacy-read"
```

Fuer Save-Shape-Kompatibilitaet bleibt `state.eventV2.mode` ein erlaubter Save-Shape-Modus (`active`). Der laengere Runtime-Modus wird separat in `state.eventV2.meta.eventSystemMode` abgelegt.

## Defensive eventV2-Initialisierung

`state.eventV2` wird nur defensiv ergaenzt:

- `schemaVersion: 1`
- `mode: "active"` oder vorhandener gueltiger Modus
- `openEvents: []`
- `history: []`
- `meta` inklusive bestehender unbekannter Felder

Vorhandene `eventV2`-Daten werden nicht ueberschrieben. Alte V1-Felder unter `state.events` bleiben erhalten.

## Storage-Verhalten

Es wurde keine neue direkte Storage-Schreiblogik eingebaut.

Der Pilot arbeitet in der bestehenden State-Runtime. Wenn die App spaeter ihren normalen Save-Zyklus ausfuehrt, ist `state.eventV2` strukturell vorhanden; diese Phase fuegt aber keinen separaten LocalStorage-, IndexedDB- oder Migration-Write hinzu.

## Event Center Verhalten

Das Event Center wurde nicht umgebaut. Fuer diese Phase gilt:

- V2-Preview-Daten koennen ueber die Bridge sicher gelesen werden.
- Alte V1-Daten bleiben als Legacy-Fallback vorhanden.
- Produktives V2-Resolve ueber Event Center wurde nicht erzwungen.

## V1-Status

V1-Dateien wurden nicht geloescht.

Im neuen Bridge-Pfad gilt:

- `v1CanCreateEvents: false`
- `v1CanResolveEvents: false`
- `v1CanWriteEvents: false`
- `legacyV1ReadFallback: true`

Damit verliert V1 in diesem Pfad die schreibende Autoritaet, bleibt aber fuer alte Daten lesbar.

## Ausdruecklich nicht geaendert

- Keine V1-Dateien geloescht.
- Keine alten Save-Felder entfernt.
- Keine harte Save-Migration.
- Kein direkter Storage-Zugriff aus V2.
- Kein Service-Worker-, Push-, Retention-, Daily-, Mission- oder Monetarisierungsumbau.
- Kein Event-Center-Redesign.
- Kein breiter Katalog-Cutover.

## Testbefehle

```bash
node --check src/events/EventSystemRuntimeBridge.js
node --check dev/run-event-system-v2-browser-runtime-bridge-pilot-smoke.js
node --check app.js
node --check sim.js
node --check storage.js
node dev/run-event-system-v2-browser-runtime-bridge-pilot-smoke.js
node dev/run-event-system-v2-cutover-smoke.js
node dev/run-event-v2-final-catalog-audit.js
node dev/run-event-v2-write-gate-smoke.js
node dev/run-event-v2-save-shape-dry-run-smoke.js
node dev/run-event-v2-save-load-roundtrip-smoke.js
node dev/run-event-v2-runtime-telemetry-preview-report.js
npm run check:syntax
npm run test:event-release
npm run test:smoke
npm run check:i18n
```

## Testergebnisse

Bestanden:

- Bridge-Syntaxcheck
- Browser-Runtime-Bridge-Pilot-Smoke
- Cutover-Smoke
- Final Catalog Audit
- Write-Gate-Smoke
- Save-Shape Dry-Run-Smoke
- Save/Load Roundtrip-Smoke
- Runtime-Telemetry-Preview-Report
- `npm run check:syntax`
- `npm run test:event-release`
- `npm run test:smoke`

Bekannte Abweichung:

- `npm run check:i18n` schlaegt weiterhin mit 7 Care-Studio-Heuristik-Treffern fuer dynamisch zusammengesetzte Keys fehl:
  - `careStudio.risk.${globalStatus.riskLevel}`
  - `careStudio.feed.${entry.key}`
  - `careStudio.phase.${String(careData.phaseLabel || `
  - `careStudio.risk.${String(careData.riskLevel || `
  - `careStudio.tabs.${nextFocusTabId}`
  - `careStudio.preview.benefit.${String(actionPreview.benefit && actionPreview.benefit.level || `
  - `careStudio.feedback.grade.${feedbackGrade}`

Diese Abweichung ist nicht durch den Eventsystem-V2-Pilot entstanden und betrifft die bestehende i18n-Audit-Heuristik.

## Bekannte Restrisiken

- Der Event Center Resolve-Pfad ist noch kein vollstaendiger produktiver V2-Resolve-Cutover.
- `state.eventV2` ist jetzt im Browser-State vorhanden; echte Save-Persistenz laeuft weiterhin nur ueber den bestehenden App-Save-Zyklus.
- V1 bleibt im Code vorhanden und muss in einer spaeteren Phase weiter als Legacy-Read/Fallback begrenzt werden.
- Fuer weitere Events ausserhalb der abgesicherten V2-Pfade ist noch kein breiter produktiver Write-Cutover erfolgt.

## Naechste empfohlene Mini-Phase

1. Event Center V2 Resolve Pilot fuer genau ein abgesichertes Event.
2. Save-Zyklus-Audit fuer `state.eventV2` nach realem Reload im Browser.
3. V1 Legacy-Read-Monitoring: alle Restaufrufe sichtbar reporten, bevor V1-Dateien spaeter entfernt werden.
