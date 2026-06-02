# Eventsystem V2 - V1 to V2 Cutover Plan

## Ziel des heutigen Cutovers

Ziel ist ein kontrollierter Cutover-Vertrag:

- V2 wird in einer zentralen Bridge zur neuen Event-Autoritaet.
- V1 verliert in dieser Bridge Create-/Resolve-/Write-Autoritaet.
- V1 bleibt als Legacy-Read-Fallback erhalten.
- Alte Saves ohne `eventV2` crashen nicht.
- Kein doppeltes Schreiben ist moeglich.

Statusziel fuer heute:

- `v2-active-with-v1-legacy-read`
- falls produktive Runtime-/Save-Einbindung zu riskant bleibt: `V2 aktiv in-memory via Bridge`, produktiver App-Cutover geblockt dokumentiert.

## Nicht-Ziele

- kein Loeschen von V1-Dateien
- keine harte Save-Migration
- kein Service-Worker-/Push-/Retention-/Daily-Umbau
- kein grosser Event-Center-Redesign
- kein breiter Katalog-Cutover fuer alle V2 Events
- keine Aenderung von Monetarisierung oder Economy

## Erlaubte Aenderungen

- neue zentrale Bridge-Datei unter `src/events/`
- neuer Cutover-Smoke unter `dev/`
- defensive Nutzung vorhandener V2 Preview-/Contract-Module
- Dokumentation/Result-Dateien
- minimale Node-kompatible Adapterlogik

## Verbotene Aenderungen

- kein blindes Entfernen von `events.js` oder `src/events/event*.js`
- keine produktive Save-Migration in `storage.js`
- keine direkte Deaktivierung von UI-Event-Flows ohne Browser-Smoke
- keine parallele V1/V2-Write-Autoritaet
- keine neue Eventart
- keine Katalog-Massenumschreibung

## Reihenfolge der Umsetzung

1. Audit schreiben.
2. Plan schreiben.
3. Bridge `src/events/EventSystemRuntimeBridge.js` erstellen.
4. Bridge-Modi implementieren:
   - `v1-active`
   - `v2-preview`
   - `v2-active-with-v1-legacy-read`
   - `v2-active`
   - `blocked`
5. Defensive `eventV2` Initialisierung in-memory.
6. V2 Create/Resolve in-memory fuer `indoor_dry_rootball` umsetzen.
7. V1 Create/Resolve/Write in Bridge blocken.
8. Event-Center Preview-Lesbarkeit ueber Bridge-Fallback pruefen.
9. Cutover-Smoke erstellen.
10. Relevante V2- und Regression-Smokes ausfuehren.
11. Abschlussbericht schreiben.

## Fallback-Strategie

Wenn ein kritischer Schritt fehlschlaegt:

- Bridge gibt `blocked` zurueck.
- V1-Dateien bleiben unveraendert.
- alte Save-Felder bleiben erhalten.
- produktiver Runtime-Cutover wird nicht aktiviert.
- Fehler wird im Abschlussbericht als Blocker dokumentiert.

## Teststrategie

Pflicht-Smokes:

- Syntaxcheck fuer neue/geaenderte Dateien
- neuer `dev/run-event-system-v2-cutover-smoke.js`
- V2 Write-Gate Smoke
- V2 Save-Shape Smoke
- V2 Save/Load Roundtrip Smoke
- V2 Single-/Multi-Branch Write-Simulations
- V2 Runtime Adapter/Telemetry
- finaler V2 Catalog Audit

Zusaetzlich, falls sinnvoll und lauffaehig:

- `npm run check:syntax`
- `npm run check:i18n`
- `npm test` oder Teiltests, wenn sie nicht zu gross fuer diese Phase sind

## Definition of Done

- Audit-Datei existiert.
- Plan-Datei existiert.
- Bridge existiert.
- Bridge meldet `eventSystemMode: v2-active-with-v1-legacy-read`.
- V1 darf in der Bridge keine neuen Events erzeugen.
- V1 darf in der Bridge keine Event-Writes ausfuehren.
- V2 kann genau eine Event-Instanz in-memory erzeugen.
- V2 kann diese Event-Instanz in-memory resolven.
- `state.eventV2.openEvents` und `state.eventV2.history` werden kontrolliert genutzt.
- Write-Gate erlaubt keine doppelte Autoritaet.
- alter Save ohne `eventV2` crasht nicht.
- alter Save mit V1-Eventdaten crasht nicht.
- Event Center Preview kann V2-Daten oder sicheren Fallback lesen.
- keine produktive Storage-Nutzung im Smoke.
- keine rohen i18n Keys im V2-Testevent-Smoke.
- Abschlussbericht existiert.

## Cutover-Grenze

Diese Phase darf als erfolgreich gelten, wenn V2 in der Bridge die Autoritaet uebernimmt und der echte App-Cutover klar als naechster Integrationsblock abgegrenzt ist.

Ein direkter produktiver Umbau von `app.js`, `sim.js` und `storage.js` wird nur vorgenommen, wenn die Bridge-Smokes und Save-/UI-Risiken sauber kontrollierbar sind.
