# Eventsystem V2 - V1 to V2 Cutover Result

## Executive Summary

Die Cutover-Phase ist kontrolliert abgeschlossen, aber nicht als harter Live-App-Cutover.

Statusentscheidung:

- V2 ist in der neuen zentralen Bridge die Event-Autoritaet.
- Modus: `v2-active-with-v1-legacy-read`
- V1 darf in der Bridge keine neuen Events erzeugen, keine Events resolven und keine Event-Writes ausfuehren.
- V1 bleibt als Legacy-Read-Fallback erhalten.
- Der produktive App-Runtime-Cutover in `app.js`/`sim.js`/`storage.js` bleibt bewusst geblockt und wird als eigene Integrationsphase empfohlen.

Grund:

V1 ist tief in Runtime-Tick, Save-Normalisierung und Event-Center-UI verdrahtet. Ein harter Direktumbau waere savegame- und UI-riskant gewesen. Die sichere heutige Stufe ist daher eine getestete Bridge-Autoritaet mit in-memory V2 Create/Resolve.

## Neue Dateien

- `docs/event-system-v2/phase-cutover-v1-to-v2-audit.md`
  - V1/V2-Nutzungsstellen, Risiken und Cutover-Strategie.
- `docs/event-system-v2/phase-cutover-v1-to-v2-plan.md`
  - Reihenfolge, Grenzen, Fallback und Definition of Done.
- `src/events/EventSystemRuntimeBridge.js`
  - Zentrale Bridge fuer V1/V2-Autoritaet, V2 In-Memory Create/Resolve und Legacy-Read-Entscheidung.
- `dev/run-event-system-v2-cutover-smoke.js`
  - Cutover-Smoke fuer Bridge-Modus, V1-Write-Blockade, V2 Create/Resolve, Save-Shape und Event-Center-Preview.
- `docs/event-system-v2/phase-cutover-v1-to-v2-result.md`
  - Dieser Abschlussbericht.

## Geaenderte Dateien

Keine produktiven Owner-Dateien wurden geaendert:

- `app.js` nicht geaendert
- `sim.js` nicht geaendert
- `storage.js` nicht geaendert
- `events.js` nicht geaendert
- produktive UI-Dateien nicht geaendert

## V1-Abhaengigkeiten, die entfernt wurden

Keine V1-Dateien oder produktiven Imports wurden geloescht.

In der neuen Bridge wurden V1-Schreibrechte kontrolliert deaktiviert:

- `v1CanCreateEvents: false`
- `v1CanResolveEvents: false`
- `v1CanWriteEvents: false`

## V1-Abhaengigkeiten, die als Legacy bleiben

Bleiben bewusst erhalten:

- `events.js`
- `src/events/event*.js`
- `state.events`
- `state.events.history`
- `state.events.machineState`
- `state.events.activeEventId`
- altes `saved.event` Migrationslesen in `storage.js`
- bestehende Event-Release-Regressionstests

Grund:

Alte Saves, Event-Center-Fallbacks und bestehende Regressionstests haengen weiterhin daran.

## V2-Pfade, die jetzt produktionsnah sind

Produktionsnah in Bridge/In-Memory:

- V2 Autoritaetsentscheidung
- V2 Write-Gate vor Create/Resolve
- defensive `eventV2` Initialisierung
- V2 OpenEvent-Erzeugung fuer `indoor_dry_rootball`
- V2 Resolve ueber Resolve Apply Contract
- V2 History-Eintrag
- Save-Shape-Validierung
- Event-Center-Preview-Lesbarkeit ohne rohe i18n Keys

Noch nicht produktiv live verdrahtet:

- echter Runtime-Tick ueber V2
- echter Save-Write ueber `storage.js`
- echtes Event-Center-Resolve ueber V2

## Savegame-Verhalten

Getestet im Bridge-Smoke:

- alter Save ohne `eventV2` crasht nicht
- alter Save mit V1-Eventdaten crasht nicht
- `eventV2` wird in-memory defensiv initialisiert
- alte V1-Felder werden nicht geloescht
- kein produktiver Storage wird genutzt

Kein echter Save-Write wurde aktiviert.

## Event-Center-Verhalten

Bridge erzeugt ein V2-Preview-Objekt fuer Event-Center-Lesbarkeit:

- Titel vorhanden
- Beschreibung vorhanden
- Kategorie/Severity vorhanden
- Optionen vorhanden
- keine rohen i18n Keys

Der produktive Event-Center-Pfad in `app.js` ist noch nicht auf V2 umgestellt.

## Bekannte Restrisiken

- Live-App nutzt weiterhin die Legacy-Wrapper in `app.js`/`sim.js`.
- `storage.js` normalisiert noch nicht produktiv `state.eventV2`.
- Event Center liest produktiv weiterhin `state.events`.
- V2 Bridge ist Node-/In-Memory-getestet, aber noch nicht als Browser-Runtime-Owner verdrahtet.
- Eine echte V1-Dateiloeschung ist noch nicht sicher.

## Testbefehle

- `node --check src/events/EventSystemRuntimeBridge.js`
- `node --check dev/run-event-system-v2-cutover-smoke.js`
- `node dev/run-event-system-v2-cutover-smoke.js`
- `node dev/run-event-v2-final-catalog-audit.js`
- `node dev/run-event-v2-write-gate-smoke.js`
- `node dev/run-event-v2-save-shape-dry-run-smoke.js`
- `node dev/run-event-v2-save-load-roundtrip-smoke.js`
- `node dev/run-event-v2-single-event-write-simulation-smoke.js`
- `node dev/run-event-v2-multi-resolve-branch-write-simulation-smoke.js`
- `node dev/run-event-v2-runtime-adapter-preview-smoke.js`
- `node dev/run-event-v2-runtime-telemetry-preview-report.js`
- `npm run check:syntax`
- `npm run check:i18n`
- `npm run test:event-release`
- `npm run test:smoke`

## Testergebnisse

Bestanden:

- Syntaxcheck neue Bridge
- Syntaxcheck neuer Cutover-Smoke
- Cutover-Smoke
- V2 Final Catalog Audit
- V2 Write-Gate Smoke
- V2 Save-Shape Dry-Run Smoke
- V2 Save/Load Roundtrip Smoke
- V2 Single-Event Write-Simulation Smoke
- V2 Multi-Resolve-Branch Write-Simulation Smoke
- V2 Runtime Adapter Preview Smoke
- V2 Runtime Telemetry Preview Report
- `npm run check:syntax`
- `npm run test:event-release`
- `npm run test:smoke`

Bekannt fehlgeschlagen:

- `npm run check:i18n`
  - faellt wegen 7 bereits bekannter dynamischer Care-Studio-Heuristiktreffer:
    - `careStudio.risk.${globalStatus.riskLevel}`
    - `careStudio.feed.${entry.key}`
    - weitere dynamische `careStudio.*` Template-Key-Treffer
  - Bewertung: kein neuer Cutover-Fehler, keine neuen V2-i18n Fehlkeys.

## Empfehlung fuer tatsaechliches Loeschen von V1-Dateien

Noch nicht loeschen.

V1-Dateien duerfen erst geloescht oder hart stillgelegt werden, wenn:

1. `app.js` Event Center produktiv V2 lesen/resolve kann.
2. `sim.js` Runtime-Tick ueber die Bridge laeuft.
3. `storage.js` `state.eventV2` produktiv und idempotent normalisiert.
4. echte Save/Load-Smokes mit V2 OpenEvents/History bestehen.
5. alte V1-Events in Saves entweder migriert, angezeigt oder sicher ignoriert werden.
6. Event-Release-Regressionen fuer Legacy-Read weiterhin bestehen.

## Naechste empfohlene Mini-Phase

Produktive Browser-Runtime-Integration der Bridge als no-storage Pilot:

- `app.js` Wrapper liest zuerst Bridge-Modus.
- `sim.js` ruft Bridge fuer Event-Tick-Entscheidung auf.
- `storage.js` initialisiert `state.eventV2` defensiv ohne harte Migration.

Erst danach sollte ein echter persistenter V2-Write geplant werden.
