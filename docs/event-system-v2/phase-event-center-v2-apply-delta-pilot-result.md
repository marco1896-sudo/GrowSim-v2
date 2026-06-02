# Eventsystem V2 - Event Center ApplyDelta Pilot Result

## Executive Summary

Der ApplyDelta-In-Memory-Pilot ist fuer genau einen Pfad umgesetzt:

- Event: `indoor_dry_rootball`
- Option: `stabilize`

Der Resolve ueber den Event-Center-V2-Pfad schreibt weiterhin keine direkten Storage-APIs und loescht keine V1-Daten. Neu ist: der `applyPreview` wird fuer `stabilize` in einen kleinen Status-Delta umgesetzt und im History-Eintrag als `appliedDelta` dokumentiert.

Status: erfolgreich, eng begrenzt, reload-stabil.

## Geaenderte Dateien

- `src/events/EventSystemRuntimeBridge.js`
  - Eng begrenzter ApplyDelta-Pilot fuer `indoor_dry_rootball / stabilize`.
  - Erlaubte Targets: `status.stress`, `status.risk`, `status.water`.
  - Idempotenzmarker `history.appliedDelta` ergaenzt.
- `dev/run-event-center-v2-browser-reload-smoke.js`
  - Browser-Reload-Smoke prueft jetzt zusaetzlich Statusaenderung, `appliedDelta`, Persistenz und keine doppelte Anwendung nach Reload.
- `dev/run-event-center-v2-resolve-pilot-smoke.js`
  - Erwartung fuer `stabilize` auf echten minimalen ApplyDelta aktualisiert.

## Neue Dateien

- `dev/run-event-center-v2-apply-delta-pilot-smoke.js`
  - Node-Smoke fuer den engen ApplyDelta-Pilot, Idempotenz, Preview-only-Optionen, ungueltige Option und Statusgrenzen.
- `docs/event-system-v2/phase-event-center-v2-apply-delta-pilot.md`
  - Phasen-Dokumentation.
- `docs/event-system-v2/phase-event-center-v2-apply-delta-pilot-result.md`
  - Dieser Abschlussbericht.

## Pilot-Event

`indoor_dry_rootball`

## Pilot-Option

`stabilize`

## Angewendete Deltas

Im Node-Pfad liefert der bestehende Resolve-Apply-Contract:

```json
[
  { "target": "status.stress", "delta": -1 },
  { "target": "status.risk", "delta": -1 }
]
```

Der Browser-Fallback bleibt ebenfalls auf erlaubte Statusziele begrenzt und hat im Browser-Smoke mindestens einen erlaubten Statuswert veraendert.

## Idempotenz-Schutz

Der History-Eintrag enthaelt:

- `applyPreview`
- `appliedDelta.applied: true`
- `appliedDelta.source: "event-v2-apply-delta-pilot"`
- `appliedDelta.eventId`
- `appliedDelta.selectedOption`
- `appliedDelta.deltas[]` mit `target`, `delta`, `before`, `after`

Nach Reload ist kein offenes Event mehr vorhanden. Ein erneuter Resolve wird geblockt und der Status wird nicht erneut veraendert.

## Save/Reload-Verhalten

Es wurde keine neue direkte Storage-Schreiblogik eingebaut.

Der Status wird im bestehenden State veraendert und ueber den bestehenden Persist-/Restore-Pfad erhalten. Der Browser-Reload-Smoke bestaetigt:

- `openEvents` bleibt leer
- `history` bleibt erhalten
- `appliedDelta` bleibt erhalten
- Status bleibt nach Reload unveraendert
- keine doppelte History
- keine doppelte Delta-Anwendung

## V1-Legacy-Verhalten

V1 bleibt Legacy-Read-Fallback.

Geprueft:

- V1-History waechst nicht parallel
- alte V1-Daten crashen nicht
- V1-Dateien wurden nicht geloescht

## Ausdruecklich nicht geaendert

- keine weiteren V2-Events aktiviert
- kein ApplyDelta fuer `inspect`
- kein ApplyDelta fuer `overreact`
- kein Event-Center-Redesign
- kein Storage-Umbau
- keine harte Migration
- keine Daily-/Retention-/Mission-/Push-/Monetarisierungslogik
- keine V1-Dateien geloescht

## Testbefehle

```bash
node --check src/events/EventSystemRuntimeBridge.js
node --check app.js
node --check ui.js
node --check storage.js
node --check dev/run-event-center-v2-apply-delta-pilot-smoke.js
node --check dev/run-event-center-v2-browser-reload-smoke.js
node --check dev/run-event-center-v2-resolve-pilot-smoke.js
node dev/run-event-center-v2-apply-delta-pilot-smoke.js
node dev/run-event-center-v2-browser-reload-smoke.js
node dev/run-event-center-v2-resolve-pilot-smoke.js
node dev/run-event-system-v2-browser-runtime-bridge-pilot-smoke.js
node dev/run-event-system-v2-cutover-smoke.js
node dev/run-event-v2-save-load-roundtrip-smoke.js
node dev/run-event-v2-final-catalog-audit.js
npm run check:syntax
npm run test:event-release
npm run test:smoke
npm run check:i18n
```

## Testergebnisse

Bestanden:

- `node --check src/events/EventSystemRuntimeBridge.js`
- `node --check app.js`
- `node --check ui.js`
- `node --check storage.js`
- `node --check dev/run-event-center-v2-apply-delta-pilot-smoke.js`
- `node --check dev/run-event-center-v2-browser-reload-smoke.js`
- `node --check dev/run-event-center-v2-resolve-pilot-smoke.js`
- `node dev/run-event-center-v2-apply-delta-pilot-smoke.js`
- `node dev/run-event-center-v2-browser-reload-smoke.js`
- `node dev/run-event-center-v2-resolve-pilot-smoke.js`
- `node dev/run-event-system-v2-browser-runtime-bridge-pilot-smoke.js`
- `node dev/run-event-system-v2-cutover-smoke.js`
- `node dev/run-event-v2-save-load-roundtrip-smoke.js`
- `node dev/run-event-v2-final-catalog-audit.js`
- `npm run check:syntax`
- `npm run test:event-release`
- `npm run test:smoke`

Optionaler i18n-Check:

- `npm run check:i18n` laeuft mit Locale-Paritaet gruen (`de/en/es` je 1444 Keys, keine Missing/Extra zwischen Locales), endet aber weiterhin mit den bekannten 7 dynamischen Care-Studio-Heuristik-Funden als Fehler.

## Bekannte Restrisiken

- Der ApplyDelta-Pfad ist absichtlich noch kein generischer Event-V2-Delta-Executor.
- Die Browser-Fallback-Preview ist weniger detailreich als der Node-Contract, bleibt aber auf erlaubte Targets begrenzt.
- Weitere Events und Optionen brauchen eigene Contract-/Smoke-Freigabe.

## Naechste empfohlene Mini-Phase

Den ApplyDelta-Pilot nicht ausweiten, sondern zuerst eine kleine Beobachtungsphase/QA fuer `indoor_dry_rootball / stabilize` im Browser machen: Statusanzeige, Reload, altes Save, Mobile Event Center.
