# Eventsystem V2 - Browser Runtime Bridge Pilot

## Ziel dieser Mini-Phase

Die bestehende Bridge `src/events/EventSystemRuntimeBridge.js` wird als No-Storage-Pilot in der Browser-Runtime bekannt gemacht.

Ziel ist nicht der harte V2-Full-Cutover, sondern eine kontrollierte Runtime-Konsultation:

- Browser kennt die Bridge.
- `state.eventV2` wird defensiv unterstuetzt.
- V2 ist im Bridge-Pfad bevorzugte Autoritaet.
- V1 bleibt Legacy-Read-Fallback.
- Es gibt keine neue direkte Storage-Schreiblogik.

## Runtime Hook Points

Gefundene Hook Points:

- `index.html`
  - Script-Loader fuer Runtime-Module.
  - Geeigneter Ort, um die Bridge vor `app.js` zu laden.

- `app.js`
  - `runEventStateMachine(nowMs)` ist der zentrale App-Wrapper fuer Event-Ticks.
  - `onEventOptionClick(optionId)` ist der zentrale App-Wrapper fuer Event-Resolve-Entscheidungen.
  - Event Center liest weiterhin `state.events.*`.

- `sim.js`
  - `advanceSimulationTime(...)` ruft Event-Ticks waehrend normalem Tick und Offline-Catch-up.
  - `reconcileEventStateAfterResume(...)` kann nach Resume V1-Events aktivieren.
  - `onBoostAction()` kann Event-Timer vorziehen und Event-Runtime triggern.

- `storage.js`
  - `getCanonicalEvents(...)`, `resetStateToDefaults(...)` und `syncCanonicalStateShape(...)` normalisieren State.
  - Geeigneter Ort fuer defensive `eventV2` Initialisierung ohne harte Migration.

- `events.js`
  - bleibt V1-Owner und Legacy-Fallback.
  - wird in dieser Phase nicht geloescht und nicht hart deaktiviert.

## Umsetzung

### Bridge Browser-kompatibel

Die Bridge registriert im Browser:

- `window.GrowSimEventSystemRuntimeBridge`

und bleibt in Node weiterhin per `module.exports` nutzbar.

### Defensives `state.eventV2`

`storage.js` ergaenzt `state.eventV2`, wenn es fehlt.

Regeln:

- vorhandenes `eventV2` wird nicht ersetzt, wenn es valide Felder hat
- unbekannte Top-Level-/Meta-Felder bleiben erhalten
- alte `state.events` Felder bleiben erhalten
- Save-Shape-kompatibler Modus bleibt `active`
- Runtime-Modus wird in `eventV2.meta.eventSystemMode` abgelegt

### Runtime-Konsultation

`app.js` und `sim.js` fragen die Bridge im Pilotpfad.

Bei `activeEventSystem: "v2"`:

- Legacy Create wird im Pilotpfad blockiert
- Legacy Resolve wird im Pilotpfad blockiert
- V1-Daten bleiben lesbar

### No-Storage-Pilot

Es wurde keine direkte Storage-API eingebaut.

Der Pilot mutiert nur den bestehenden In-Memory-State defensiv. Persistenz passiert nicht aktiv aus V2 heraus.

## Event Center

Event Center bleibt Legacy-kompatibel und liest produktiv weiterhin sicher aus `state.events`.

Die Bridge kann eine V2 Event-Center-Preview erzeugen. Ein vollstaendiger produktiver Event-Center-Resolve-Cutover bleibt eine spaetere Mini-Phase.

## Was ausdruecklich nicht gemacht wurde

- kein Loeschen von V1
- keine harte Migration
- keine direkte LocalStorage-/IndexedDB-Nutzung aus V2
- kein Event-Center-Redesign
- kein Service-Worker-/Push-/Daily-/Retention-Umbau
- kein breiter Katalog-Cutover

## Restrisiken

- V2 ist im Browser bekannt und blockt Legacy-Create/Resolve im Pilotpfad, aber Event Center ist noch nicht voll V2-native.
- Produktiver Save/Load fuer V2 OpenEvents und History bleibt separat abzusichern.
- Legacy V1 Tests bleiben wichtig, weil alte Saves weiter lesbar bleiben muessen.
