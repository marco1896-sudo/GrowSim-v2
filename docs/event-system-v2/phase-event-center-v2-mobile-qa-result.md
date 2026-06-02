# Eventsystem V2 - Event Center Mobile QA Result

## Executive Summary

Der Mobile-QA-Pass fuer den ersten V2-Live-Pilotpfad ist erfolgreich:

- `indoor_dry_rootball` wird im Event Center korrekt angezeigt.
- `stabilize` ist mobil klickbar und resolvebar.
- `openEvents -> history` bleibt stabil.
- `appliedDelta` bleibt dokumentiert.
- Reload bleibt idempotent (kein Double-Apply).
- Keine rohen i18n-Keys im Pilotpfad.
- Keine kritischen Layoutfehler in den drei Ziel-Viewports.

## Geaenderte Dateien

- `dev/run-event-center-v2-mobile-qa-smoke.js`

## Neue Dateien

- `dev/run-event-center-v2-mobile-qa-smoke.js`
- `docs/event-system-v2/phase-event-center-v2-mobile-qa.md`
- `docs/event-system-v2/phase-event-center-v2-mobile-qa-result.md`

## Getestete Viewports

- `360 x 740`
- `390 x 844`
- `430 x 932`

## Testergebnisse

`dev/run-event-center-v2-mobile-qa-smoke.js`:

- alle 3 Viewports bestanden
- `stabilize` in allen 3 Viewports klickbar
- Resolve stabil, Reload stabil
- keine doppelte History nach Reload
- kein Double-Apply
- keine kritischen Console-Errors im Pilotpfad

Zusatz-Smokes/Regressionen:

- `run-event-center-v2-apply-delta-pilot-smoke`: gruen
- `run-event-center-v2-browser-reload-smoke`: gruen
- `run-event-center-v2-resolve-pilot-smoke`: gruen
- `run-event-system-v2-browser-runtime-bridge-pilot-smoke`: gruen
- `run-event-v2-final-catalog-audit`: gruen
- `npm run check:syntax`: gruen
- `npm run test:event-release`: gruen
- `npm run test:smoke`: gruen

## UI-/Layout-Befund

- Event Center oeffnet in allen 3 mobilen Viewports ohne Crash.
- Titel/Beschreibung sind lesbar.
- Optionen `inspect`, `stabilize`, `overreact` sichtbar.
- Keine defekten/unsichtbaren Buttons im Pilotflow beobachtet.

## State-/Reload-Befund

- Nach `stabilize`:
  - `eventV2.openEvents.length === 0`
  - `eventV2.history` enthaelt genau den geloesten Eintrag
  - `applyPreview` und `appliedDelta` vorhanden
- Nach Reload:
  - keine History-Duplikate
  - kein erneutes Delta-Apply
  - V1-History bleibt unveraendert

Hinweis: Kleine Float-Abweichungen zwischen Resolve und Reload kommen durch normalen Tick-Fortschritt und sind kein Double-Apply.

## i18n-Befund

- Im Pilotpfad wurden keine rohen i18n-Keys sichtbar.

## Bekannte Restrisiken

- Headless-Browser mit geblocktem Service Worker erzeugt bekannte SW-Register-Noise-Errors; diese sind fuer den Pilotpfad als nicht-kritisch klassifiziert.
- Der produktive Mutationspfad bleibt absichtlich auf ein Event/eine Option begrenzt.

## Naechste empfohlene Mini-Phase

Ein kurzer manueller Device-QA-Pass fuer denselben Pilotpfad (`indoor_dry_rootball / stabilize`) mit 1:1 Checkliste und Screenshot-Nachweis.
