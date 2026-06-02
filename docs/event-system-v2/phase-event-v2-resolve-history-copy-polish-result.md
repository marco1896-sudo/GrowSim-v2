# Eventsystem V2 – Resolve-/History-Copy-Polish (Result)

## Executive Summary

Der sichtbare Resolve-/History-Text im V2-Event-Center wurde von technischer Debugsprache auf spielnahe, deutsche Auswertung umgestellt. Die technische Datenhaltung (History, ApplyPreview, appliedDelta, Reasons) bleibt unveraendert und intern weiter verfuegbar.

## Geaenderte Dateien

- `src/events/v2/ui/EventV2PresentationMap.js`
- `app.js`
- `ui.js`
- `dev/run-event-center-v2-combined-visible-matrix-smoke.js`
- `dev/run-event-center-v2-combined-visible-mobile-matrix-smoke.js`

## Neue Dateien

- `docs/event-system-v2/phase-event-v2-resolve-history-copy-polish.md`
- `docs/event-system-v2/phase-event-v2-resolve-history-copy-polish-result.md`

## Neue Copy-Struktur

- Resolve-/History-Copy ist in `EventV2PresentationMap` als dediziertes Mapping zentralisiert.
- Pro Event/Option gibt es Titel, Kurztext, Badge und Tone.
- Fallback fuer unbekannte Kombinationen bleibt vorhanden.

## Testbefehle

- `node --check app.js`
- `node --check ui.js`
- `node --check src/events/v2/ui/EventV2PresentationMap.js`
- `node dev/run-event-center-v2-combined-visible-matrix-smoke.js`
- `node dev/run-event-center-v2-combined-visible-mobile-matrix-smoke.js`
- `node dev/run-event-center-v2-pilot-options-matrix-smoke.js`
- `node dev/run-event-v2-visibility-health-report.js`
- `node dev/run-event-v2-release-gate-snapshot.js`
- `npm run check:syntax`
- `npm run test:event-release`
- `npm run test:smoke`

## Testergebnisse

- `node --check app.js` ✅
- `node --check ui.js` ✅
- `node --check src/events/v2/ui/EventV2PresentationMap.js` ✅
- `node dev/run-event-center-v2-combined-visible-matrix-smoke.js` ✅
- `node dev/run-event-center-v2-combined-visible-mobile-matrix-smoke.js` ✅
- `node dev/run-event-center-v2-pilot-options-matrix-smoke.js` ✅
- `node dev/run-event-v2-visibility-health-report.js` ✅
- `node dev/run-event-v2-release-gate-snapshot.js` ✅
- `npm run check:syntax` ✅
- `npm run test:event-release` ✅
- `npm run test:smoke` ✅

## Restrisiken

- Der alte Legacy-Event-Sheet-Pfad bleibt technisch vorhanden; diese Phase poliert den aktiven V2-Sichtpfad.
- Weitere V2-Events benoetigen bei Aktivierung jeweils eigene Resolve-Copy-Eintraege.

## Naechste Mini-Phase

Resolve-/History-Copy fuer beide Pilot-Events als i18n-Keys vorbereiten, damit die zentrale Struktur sprachunabhaengig ausgebaut werden kann.
