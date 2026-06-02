# Eventsystem V2 - Event Center Resolve Pilot Result

## Executive Summary

Der Event-Center-V2-Resolve-Pilot ist fuer genau ein Event umgesetzt:

- Pilot-Event: `indoor_dry_rootball`
- Optionen: `inspect`, `stabilize`, `overreact`
- Event Center kann ein vorhandenes V2-Pilot-OpenEvent lesen.
- Resolve fuer `stabilize` laeuft ueber die Bridge/V2.
- `eventV2.openEvents` wird nach Resolve geleert.
- `eventV2.history` erhaelt den geloesten Eintrag.
- V1 schreibt im Pilotpfad nicht parallel.

Dies ist kein Full Event-Center-Cutover und keine breite V2-Aktivierung.

## Geaenderte Dateien

- `src/events/EventSystemRuntimeBridge.js`
  - Event-Center-Pilot-ViewModel, Pilot-OpenEvent-Vorbereitung und V2-Resolve fuer `indoor_dry_rootball` ergaenzt.
- `app.js`
  - Modernes Event Sheet liest V2-Pilotdaten.
  - Event-Option-Klicks fuer V2-Pilotevents gehen direkt in den V2-Resolve-Pfad.
  - UI-Controller-Eventoptionen laufen ueber den App-Wrapper statt direkt am Bridge-Blocking vorbei.
- `ui.js`
  - Legacy-Event-Sheet defensiv um V2-Pilotdaten erweitert; der produktive Browserpfad nutzt aktuell den modernen Renderer in `app.js`.
- `storage.js`
  - Gespeichertes `saved.eventV2` wird beim Restore defensiv uebernommen, ohne alte V1-Felder zu loeschen.

## Neue Dateien

- `dev/run-event-center-v2-resolve-pilot-smoke.js`
  - Prueft V2-Pilot-OpenEvent, Event-Center-ViewModel, Resolve, History, invalid Option, V1-No-Write und Save/Reload-aehnlichen Roundtrip.
- `docs/event-system-v2/phase-event-center-v2-resolve-pilot.md`
  - Umsetzung, Hook, Resolve-Ablauf, Save/Reload-Verhalten und Grenzen.
- `docs/event-system-v2/phase-event-center-v2-resolve-pilot-result.md`
  - Dieser Abschlussbericht.

## Pilot-Event

Verwendet:

- `indoor_dry_rootball`

Nicht aktiviert:

- `shared_panic_watering_misread`
- weitere V2-Events

## Resolve-Optionen

Unterstuetzte Option-IDs:

- `inspect`
- `stabilize`
- `overreact`

Der Smoke resolved `stabilize`.

## Event-Center-Verhalten

Wenn `state.eventV2.openEvents` ein unterstuetztes `indoor_dry_rootball` Pilot-Event enthaelt:

- Modernes Event Sheet zeigt V2-Titel und Beschreibung.
- Optionen werden als bestehende Event-Buttons gerendert.
- Button-Klick fuer V2-Pilotdaten nutzt `resolveEventCenterV2PilotOption(...)`.
- Legacy V1-Resolve wird in diesem Pfad nicht parallel ausgefuehrt.

Wenn kein V2-Pilot-Event offen ist:

- bestehender Legacy-Fallback bleibt erhalten.
- alte V1-Daten crashen nicht.

## Save/Reload-Verhalten

`storage.js` uebernimmt `saved.eventV2` beim Restore defensiv:

- `openEvents` bleiben erhalten, wenn sie im Save vorhanden sind.
- `history` bleibt erhalten, wenn sie im Save vorhanden ist.
- `meta.counters` werden defensiv gemerged.
- alte `state.events`/V1-Felder werden nicht geloescht.

Der Node-Smoke prueft einen JSON-Save/Reload-aehnlichen Roundtrip. Zusaetzlich wurde ein Browser-Pilotcheck mit gesaeetem Local-State ausgefuehrt:

- V2-Pilot-Event erschien im modernen Event Sheet.
- Optionen wurden angezeigt.
- Klick auf `stabilize` schrieb nach `eventV2.history`.
- `eventV2.openEvents` war danach leer.

## V1-Legacy-Verhalten

V1-Dateien wurden nicht geloescht.

Im Pilotpfad:

- V1 Create bleibt deaktiviert.
- V1 Resolve bleibt deaktiviert.
- V1 Write bleibt deaktiviert.
- V1 Legacy Read bleibt erhalten.

Der neue Smoke prueft, dass V1-History nicht waechst, waehrend V2 resolved.

## ApplyDelta

ApplyDelta wird in dieser Phase nicht direkt auf `state.status` angewendet.

Stattdessen wird das Ergebnis als kontrolliertes `applyPreview` im V2-History-Eintrag gespeichert:

- `applyDeltaAppliedToStatus: false`
- `applyDeltaStoredAsPilotPreview: true`

Damit bleibt der Pilot nachvollziehbar, ohne Balancing oder Sim-State-Mutation auszuweiten.

## Testbefehle

```bash
node --check src/events/EventSystemRuntimeBridge.js
node --check app.js
node --check sim.js
node --check storage.js
node --check events.js
node --check dev/run-event-center-v2-resolve-pilot-smoke.js
node dev/run-event-center-v2-resolve-pilot-smoke.js
node dev/run-event-system-v2-browser-runtime-bridge-pilot-smoke.js
node dev/run-event-system-v2-cutover-smoke.js
node dev/run-event-v2-write-gate-smoke.js
node dev/run-event-v2-save-shape-dry-run-smoke.js
node dev/run-event-v2-save-load-roundtrip-smoke.js
node dev/run-event-v2-final-catalog-audit.js
npm run check:syntax
npm run test:event-release
npm run test:smoke
npm run check:i18n
```

## Testergebnisse

Bestanden:

- alle `node --check` Befehle
- neuer Event-Center-V2-Resolve-Pilot-Smoke
- Browser Runtime Bridge Pilot Smoke
- Cutover Smoke
- Write-Gate Smoke
- Save-Shape Dry-Run Smoke
- Save/Load Roundtrip Smoke
- Final Catalog Audit
- Browser-Pilotcheck mit Local-State und modernem Event Sheet
- `npm run check:syntax`
- `npm run test:event-release`
- `npm run test:smoke`

Hinweis:

- Ein erster `npm run test:smoke` Lauf hatte einmalig einen Timing-Fehler in `ui-feedback-phase7.test.js`.
- Der Einzeltest `node test/ui-feedback-phase7.test.js` lief danach gruen.
- Die wiederholte gesamte `npm run test:smoke` Suite lief gruen.

Bekannte i18n-Abweichung:

- `npm run check:i18n` schlaegt weiterhin mit den bekannten 7 dynamischen Care-Studio-Heuristik-Treffern fehl.
- Locale-Paritaet `de/en/es` bleibt vollstaendig.
- Es wurden keine neuen V2-Roh-i18n-Keys eingefuehrt.

## Bekannte Restrisiken

- Es ist weiterhin nur ein Pilot-Event produktiv ueber das Event Center angebunden.
- ApplyDelta ist noch Preview/History, keine echte Status-Mutation.
- Automatisierter Browser-Reload ist als Inline-Pilotcheck ausgefuehrt, aber noch kein dauerhaftes Dev-Script.
- Browser-Service-Worker kann alte Scriptversionen cachen; der Browsercheck wurde deshalb mit blockierten Service Workern und Cachebuster ausgefuehrt.
- V1 ist weiterhin im Code vorhanden und bleibt fuer Legacy-Read notwendig.

## Naechste empfohlene Mini-Phase

1. Dauerhaften Browser-Reload-Smoke fuer `eventV2.openEvents -> resolve -> eventV2.history` als Dev-Script aufnehmen.
2. ApplyDelta-In-Memory-Pilot fuer genau `indoor_dry_rootball` hinter enger Bridge-Pruefung.
3. Danach erst entscheiden, ob `shared_panic_watering_misread` in denselben Event-Center-Pilot darf.
