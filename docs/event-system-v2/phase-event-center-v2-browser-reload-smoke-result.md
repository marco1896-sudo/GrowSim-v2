# Eventsystem V2 - Event Center Browser Reload Smoke Result

## Executive Summary

Der dauerhafte Browser-/Reload-Smoke fuer den Event-Center-V2-Resolve-Pilot ist umgesetzt und bestanden.

Der Smoke prueft im echten Browserpfad:

- Save mit `eventV2.openEvents`
- Browser-Restore
- Event-Center-Anzeige fuer `indoor_dry_rootball`
- Resolve ueber `stabilize`
- Persistenz nach Resolve
- Reload
- History bleibt erhalten
- keine doppelte History
- kein V1-Parallelwrite
- keine rohen i18n Keys im Pilotpfad

## Neue Dateien

- `dev/run-event-center-v2-browser-reload-smoke.js`
  - Dauerhafter Playwright-Smoke fuer `eventV2.openEvents -> Event Center -> stabilize -> eventV2.history -> reload`.
- `docs/event-system-v2/phase-event-center-v2-browser-reload-smoke.md`
  - Ziel, Ablauf, Grenzen und Save-/Restore-Erwartungen.
- `docs/event-system-v2/phase-event-center-v2-browser-reload-smoke-result.md`
  - Dieser Abschlussbericht.

## Geaenderte Dateien

Keine produktiven Runtime-Dateien wurden fuer diese Phase geaendert.

## Echter Browser-Smoke

Ein echter Browser-Smoke war moeglich.

Technischer Rahmen:

- Playwright Chromium
- eigener Static-Testserver auf freiem lokalen Port
- Devmode-URL
- Service Worker blockiert, damit keine alte Scriptversion den Test verfaelscht
- Auth-/Remote-Save-Harness aus bestehender Test-Infrastruktur
- `localStorage["grow-sim-state-v2"]` wird nur initial geseedet und beim Reload nicht erneut ueberschrieben

## Getesteter Ablauf

1. Test-Save mit `eventV2.openEvents[0]` fuer `indoor_dry_rootball` vorbereiten.
2. App im Browser starten.
3. Event Center oeffnen.
4. V2-Pilot-Event erkennen.
5. Optionen `inspect`, `stabilize`, `overreact` pruefen.
6. `stabilize` klicken.
7. Auf persistierten Local-State mit leerem `openEvents` und History-Eintrag warten.
8. Browserseite reloaden.
9. State erneut pruefen.
10. Sicherstellen, dass History nicht dupliziert wurde.

## Pilotevent

Getestet wurde ausschliesslich:

- `indoor_dry_rootball`

Resolved wurde:

- `stabilize`

Weitere V2-Events wurden nicht aktiviert.

## Reload-Ergebnis

Der Smoke meldet:

```json
{
  "openEventsEmptyAfterResolve": true,
  "historyContainsResolvedEvent": true,
  "historyPersistsAfterReload": true,
  "noDuplicateHistoryAfterReload": true,
  "v1DidNotWriteParallel": true,
  "applyPreviewStored": true,
  "rawI18nKeysVisible": false,
  "pilotScopeLimited": true
}
```

Nach Reload:

- `eventV2.openEvents.length === 0`
- `eventV2.history.length === 1`
- History enthaelt `eventId: "indoor_dry_rootball"`
- History enthaelt `selectedOption: "stabilize"`
- `applyPreview` bleibt erhalten

## Save-/Restore-Ergebnis

Der Test bestaetigt:

- ein Save mit offenem V2-Pilot-Event wird geladen
- Resolve wird in LocalStorage persistiert
- Reload laedt den geloesten Zustand
- der initiale Seed ueberschreibt den Reload-Zustand nicht

## V1-Legacy-Verhalten

Der Test-State enthaelt eine alte V1-History.

Geprueft:

- V1-History-Laenge bleibt unveraendert
- V1 schreibt nicht parallel
- alte V1-Daten crashen nicht

## Testbefehle

```bash
node --check dev/run-event-center-v2-browser-reload-smoke.js
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

- `node --check dev/run-event-center-v2-browser-reload-smoke.js`
- `node dev/run-event-center-v2-browser-reload-smoke.js`
- `node dev/run-event-center-v2-resolve-pilot-smoke.js`
- `node dev/run-event-system-v2-browser-runtime-bridge-pilot-smoke.js`
- `node dev/run-event-system-v2-cutover-smoke.js`
- `node dev/run-event-v2-save-load-roundtrip-smoke.js`
- `node dev/run-event-v2-final-catalog-audit.js`
- `npm run check:syntax`
- `npm run test:event-release`
- `npm run test:smoke`

Bekannte optionale Abweichung:

- `npm run check:i18n` schlaegt weiterhin mit 7 bekannten dynamischen Care-Studio-Heuristiktreffern fehl.
- Locale-Paritaet `de/en/es` ist vollstaendig.
- Keine neuen V2-Pilot-i18n-Leaks wurden gefunden.

## Bekannte Restrisiken

- ApplyDelta wird weiterhin nur als `applyPreview` gespeichert und noch nicht auf `state.status` angewendet.
- Der Smoke deckt nur `indoor_dry_rootball` ab.
- Der Smoke laeuft im lokalen Dev-Browserpfad, nicht gegen ein Produktionsdeployment.
- Service Worker werden im Smoke blockiert, um Cache-Artefakte auszuschliessen; ein separater PWA/SW-Reload-Test waere eine eigene Phase.

## Naechste empfohlene Mini-Phase

1. ApplyDelta-In-Memory-Pilot fuer genau `indoor_dry_rootball`, weiterhin hinter Bridge/Write-Gate.
2. Danach ein kleiner Status-Mutation-Smoke mit Reload, ohne weitere Events zu aktivieren.
3. Erst danach pruefen, ob `shared_panic_watering_misread` fuer den Event-Center-Pilot freigegeben wird.
