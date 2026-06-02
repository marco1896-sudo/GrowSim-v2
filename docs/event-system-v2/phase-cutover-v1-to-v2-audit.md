# Eventsystem V2 - V1 to V2 Cutover Audit

## Executive Status

V1 ist aktuell weiterhin die produktive Event-Autoritaet.

V2 besitzt belastbare dev-only Sicherheitsbausteine, ist aber noch nicht in die produktiven Owner-Pfade fuer Runtime, Save/Load und Event Center eingehangen. Ein harter Direkt-Cutover waere in diesem Zustand riskant.

Empfohlene heutige Cutover-Entscheidung:

- `eventSystemMode: v2-active-with-v1-legacy-read`
- V2 darf in einer zentralen Bridge als neue Autoritaet simuliert und in-memory validiert werden.
- V1 darf in der Bridge keine neuen Events und keine Writes mehr ausfuehren.
- Bestehende produktive `app.js`/`sim.js`/`storage.js`-Pfade werden nicht blind umgebaut, solange Save- und UI-Cutover nicht separat abgesichert sind.

## V1-Nutzungsstellen

### Imports und Script Loading

- `index.html`
  - laedt alle `src/events/event*.js` Module und danach `events.js`.
  - Risiko: kritisch.
  - Bewertung: darf noch nicht geloescht werden; bestehende App-Runtime erwartet diese Browser-Globals.

- `events.js`
  - exportiert `window.GrowSimEvents`.
  - registriert Legacy-Runtime bei `window.GrowSimEventEngine.registerLegacyRuntime(window.GrowSimEvents)`.
  - Risiko: kritisch.
  - Bewertung: darf noch nicht geloescht werden; kann spaeter als Legacy-Read/Adapter-Schicht markiert werden.

### Runtime-Aufrufe

- `sim.js`
  - ruft `runEventStateMachine(...)` im Tick/Catch-up/Boost-Kontext.
  - nutzt `window.GrowSimEvents.runEventStateMachine` als Event-Autoritaet.
  - laedt `data/events.json`, `data/events.foundation.json` und `data/events.v2.json` in `state.events.catalog`.
  - Risiko: kritisch.
  - Bewertung: braucht Adapter; direkter Umbau waere ein echter Runtime-Cutover.

- `app.js`
  - bindet `window.GrowSimEvents` als kanonische Event-Runtime.
  - Wrapper `runEventStateMachine(nowMs)` delegiert an `events.js`.
  - Wrapper `onEventOptionClick(optionId)` delegiert an `events.js`.
  - Dev-/Shop-/Test-Helfer rufen diese Wrapper.
  - Risiko: kritisch.
  - Bewertung: braucht Bridge; nicht direkt loeschen.

- `events.js`
  - V1 State Machine:
    - `runEventStateMachine`
    - `activateEvent`
    - `onEventOptionClick`
    - `enterEventCooldown`
    - `resolveFoundationCandidateEvent`
  - schreibt in `state.events.*`, `state.history.events`, Cooldowns, Pending Resolution, History.
  - Risiko: kritisch.
  - Bewertung: produktive Write-Autoritaet; muss vor einem echten Cutover durch Bridge/Gate ersetzt werden.

### Globale Objekte

- `window.GrowSimEvents`
  - produktiver Event API Owner.
  - Risiko: kritisch.
  - Bewertung: Legacy-API muss vorerst erhalten bleiben, aber schreibende Calls duerfen spaeter nur noch ueber Bridge laufen.

- `window.GrowSimEventEngine`
  - registriert Legacy Runtime und wird von Event-Foundation-Modulen genutzt.
  - Risiko: mittel bis kritisch.
  - Bewertung: braucht kontrollierte Adapter-Kompatibilitaet.

### UI-Zugriffe / Event Center

- `app.js` Event Sheet / Event Center
  - liest `state.events.machineState`, `activeEventId`, `activeEventTitle`, `activeEventText`, `activeOptions`, `pendingOutcome`, `resolvedOutcome`, `history`.
  - ruft bei Entscheidungen `onEventOptionClick(optionId)`.
  - Risiko: kritisch.
  - Bewertung: braucht V2-ViewModel-Adapter oder Bridge-Fassade; direkte Umstellung kann UI und i18n brechen.

- V2 Preview UI
  - `src/events/v2/preview/*` und Dev-Gallery/Preview-Scripts liefern Preview/Shadow-Modelle.
  - Risiko: niedrig.
  - Bewertung: als Quelle fuer Event-Center-Adapter nutzbar, aber noch nicht produktiver Resolve-Pfad.

### Savegame-Felder

- `storage.js`
  - normalisiert `state.events` als kanonische Legacy-Eventstruktur.
  - migriert altes `saved.event` nach `state.events`.
  - erhaelt `state.events.scheduler`, `history`, `machineState`, `activeEventId`, Pending-/Resolved-Felder.
  - loescht `state.event` als altes Legacy-Mirror-Feld.
  - Risiko: kritisch.
  - Bewertung: alte `state.events` Felder muessen lesbar bleiben; `state.eventV2` muss defensiv und idempotent initialisiert werden, bevor produktive V2-Writes erlaubt sind.

- `state.eventV2`
  - bisher nur ueber V2 Preview-/Dry-Run-Module definiert.
  - Risiko: mittel.
  - Bewertung: noch nicht produktiv in `storage.js` normalisiert; echter Save-Write bleibt Blocker fuer harten Cutover.

### Tests

- `test/event-flow-*.test.js`
  - pruefen V1 Event Flow, Persistence, Follow-ups.
  - Risiko: kritisch.
  - Bewertung: duerfen nicht einfach angepasst werden; sie beweisen Legacy-Kompatibilitaet.

- `test/event-phase*.test.js`
  - viele Tests modellieren Legacy-Active-Events, Shadow-Modus und Bridge-Readiness.
  - Risiko: mittel bis kritisch.
  - Bewertung: teilweise spaeter auf Bridge-Kontrakt umstellen, aber aktuell als Regressionen behalten.

- `test/event-realism-runtime.test.js`, `test/event-resolver-guards-integration.test.js`
  - pruefen V1/Foundation Eligibility und Resolver.
  - Risiko: mittel.
  - Bewertung: vorerst Legacy-Regression.

### Dev-Scripts

- V1-nahe Scripts:
  - `dev/verify_event_pool_authoring.js`
  - `dev/verify_event_weighting.js`
  - `dev/verify_pending_chain_lifecycle.js`
  - `dev/verify_resolver_guards.js`
  - `dev/verify_resolver_guard_pipeline.js`
  - `dev/event_runtime_simulation.js`
  - Risiko: mittel.
  - Bewertung: bleiben als Legacy-/Regressionstools, nicht produktive Autoritaet.

- V2-nahe Scripts:
  - `dev/run-event-v2-*`
  - Risiko: niedrig.
  - Bewertung: als neue Cutover-Smokes erweitern.

### Push / Retention / Daily / Missions

- `storage.js` normalisiert Retention/Daily/Run-Ziele unabhaengig von V1.
- `app.js` nutzt Event-Abschluss in UI/Progression-Kontexten; konkrete Event-Completion Hooks sind an `state.events.resolvedOutcome` gekoppelt.
- Push/Service Worker sind nicht direkt im Eventsystem-V2-Pfad.
- Risiko: mittel.
- Bewertung: darf heute nicht nebenbei umgebaut werden; Bridge muss V1-Felder defensiv lesbar halten.

## Risikoanalyse

| Stelle | Risiko | Entscheidung |
| --- | --- | --- |
| `events.js` State Machine | kritisch | darf nicht geloescht werden, produktive Writes spaeter nur via Bridge blocken/ersetzen |
| `sim.js` Tick-Aufruf | kritisch | braucht Adapter, kein Direktumbau ohne Browser-/Save-Smoke |
| `storage.js` Legacy Events | kritisch | Legacy-Read behalten, `eventV2` defensiv initialisieren erst nach separatem Save-Test |
| Event Center in `app.js` | kritisch | braucht V2 ViewModel/Fallback, kein UI-Grossumbau |
| V1 Tests | mittel/kritisch | als Regression behalten, spaeter gezielt neue Bridge-Erwartungen ergaenzen |
| V2 Preview/Contracts | niedrig/mittel | geeignet fuer Bridge-Harness |
| Dev-Scripts V1 | niedrig/mittel | behalten, deprecaten spaeter |

## Cutover-Strategie

### Welche V2-Komponente uebernimmt welche V1-Aufgabe?

- V1 Event-Autoritaet -> neue zentrale Bridge `src/events/EventSystemRuntimeBridge.js`.
- V1 Create -> Bridge erzeugt kontrolliert genau ein V2 OpenEvent in-memory.
- V1 Resolve -> Bridge nutzt V2 Resolve Apply Contract und verschiebt in V2 History in-memory.
- V1 Save-Shape -> `EventV2SaveShapePreview` validiert/normalisiert `state.eventV2`.
- V1/V2 Doppelautoritaet -> `EventV2WriteGatePreview` blockt Konflikte.

### Welche V1-Pfade werden deaktiviert?

In der Bridge:

- `v1CanCreateEvents: false`
- `v1CanResolveEvents: false`
- `v1CanWriteEvents: false`

In produktiven Browser-Dateien heute noch nicht hart deaktiviert, weil `app.js`/`sim.js`/`storage.js` tief gekoppelt sind und ein Direktumbau ohne weitere UI-/Save-Smokes riskant waere.

### Welche Legacy-Felder bleiben zum Lesen erhalten?

- `state.events`
- `state.events.history`
- `state.events.machineState`
- `state.events.activeEventId`
- `state.history.events`
- altes `saved.event` Migrationslesen in `storage.js`

### Alte offene V1-Events

Heute nicht loeschen.

Strategie:

- Legacy-Fallback lesbar halten.
- Bridge darf sie als `legacyV1ReadFallback: true` erkennen.
- Kein automatisches Ueberschreiben oder hartes Dismissal.

### Doppeltes Schreiben verhindern

- Bridge wertet vor Create/Resolve das V2 Write-Gate aus.
- Bei `v1WouldWrite && v2WouldWrite` wird geblockt.
- Zielmodus: `v2-active-with-v1-legacy-read`.

### Savegame-Kompatibilitaet

- Alte Saves ohne `eventV2` duerfen nicht crashen.
- Bridge erzeugt bei Bedarf nur eine normalisierte in-memory `eventV2` Struktur.
- Keine harte Migration, keine alten Felder loeschen.

## Audit-Entscheidung

Ein vollstaendiger produktiver Cutover direkt in `app.js`/`sim.js`/`storage.js` ist heute zu riskant.

Kontrolliert machbar ist:

- zentrale Bridge schaffen
- V2 als neue Autoritaet in dieser Bridge aktivieren
- V1 dort als Legacy-Read-Fallback belassen
- In-Memory Create/Resolve fuer abgesicherte Events pruefen
- neuen Cutover-Smoke bauen
- echten produktiven Runtime-/Save-/Event-Center-Umbau als naechste, kleinere Integrationsphase vorbereiten
