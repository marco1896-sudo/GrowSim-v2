# Eventsystem V2 - R1.2 V1 Write-Hit-Telemetrie (ohne Blockade)

## Ziel

In dieser Phase wird nur gemessen, nicht blockiert.  
Die dev-only Telemetrie macht sichtbar, welche zentralen V1-Write-Pfade noch aktiv sind und wie oft sie getroffen werden.

## Warum zuerst messen statt blockieren

- Produktive V1-Writes existieren weiterhin.
- Save/Restore ist weiterhin stark an Legacy-Pfaden gekoppelt.
- Ein vorschnelles Blocking kann Alt-Saves und Laufzeitstabilität gefährden.
- Messbare Hit-Daten sind die Grundlage für kontrolliertes R1.3 Create-Gating.

## Erfasste Kategorien (W1-W6)

- W1: Produktiver V1-Create
- W2: Produktiver V1-Resolve
- W3: V1-Cooldown-/Timer-Write
- W4: V1-Save-Normalisierung
- W5: UI-Fallback-Write
- W6: Test-/Dev-only Write

## Dev-only Telemetrie-Modul

- Datei: `src/events/legacy/EventV1WriteTelemetry.js`
- Kernfunktionen:
  - `isEventV1WriteTelemetryEnabled()`
  - `recordEventV1WriteHit(type, context)`
  - `getEventV1WriteTelemetrySnapshot()`
  - `resetEventV1WriteTelemetry()`
  - `summarizeEventV1WriteTelemetry()`
- Optional dev-only Helpers:
  - `window.__getEventV1WriteTelemetry()`
  - `window.__resetEventV1WriteTelemetry()`

## Instrumentierte zentrale Pfade

- `events.js`
  - W1: `events.js:activate_event`
  - W2: `events.js:resolve_enter_resolving`
  - W2: `events.js:resolve_finalize_history`
  - W3: `events.js:enter_cooldown`
- `app.js`
  - W2: `app.js:dismiss_active_event_legacy_resolve`
  - W5: `app.js:clear_event_state_for_authoritative_activation`
- `sim.js`
  - W3: `sim.js:boost_event_timer_adjust`
- `ui.js`
  - W5: `ui.js:legacy_dismiss_fallback`
- `storage.js`
  - W4: `storage.js:migrate_legacy_state_into_canonical`
  - W4: `storage.js:sync_legacy_mirrors_from_canonical`

## Dev-only Sicherheitsregeln

- Kein Write-Block, kein Return-Gate, keine Laufzeit-Unterbrechung.
- Telemetrie ist fehlertolerant (`try/catch`) und darf nie Produktlogik stoppen.
- Keine Netzwerkübertragung aus der Telemetrie.
- Keine personenbezogenen Daten.
- In Nicht-Dev-Kontexten keine Dev-Globals.

## Snapshot abrufen

- Im Dev-Browser:
  - `__getEventV1WriteTelemetry()`
  - `__resetEventV1WriteTelemetry()`
- Im Node/Dev:
  - `dev/run-event-v1-write-telemetry-smoke.js`
  - `dev/run-event-v1-write-telemetry-report.js`

## Was ausdrücklich nicht geändert wurde

- Keine V1-Datei gelöscht
- Keine V1-Savefelder gelöscht
- Keine V1-Write-Blockade aktiviert
- Keine neue V2-Eventaktivierung
- Keine neuen Statusdeltas

