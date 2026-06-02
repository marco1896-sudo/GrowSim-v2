# Eventsystem V2 – Combined Visibility Health Report

## Ziel

Ein einzelner Dev-Befehl liefert eine kompakte Gesundheitspruefung des aktuellen V2-Pilotzustands.

## Warum sinnvoll

- Browser-, Mobile- und Outcome-Checks werden gebuendelt.
- Sichtbarer Status der zwei Live-Pilot-Events wird schneller nachvollziehbar.
- Safety-Signale (Idempotenz, V1-Write-Block, Legacy-Copy-Freiheit) sind zentral sichtbar.

## Gebuendelte Smokes

- `run-event-center-v2-combined-visible-matrix-smoke.js`
- `run-event-center-v2-combined-visible-mobile-matrix-smoke.js`
- `run-event-center-v2-pilot-options-matrix-smoke.js`
- `run-event-center-v2-shared-panic-watering-pilot-smoke.js`
- `run-event-center-v2-browser-reload-smoke.js`
- optional per Flag:
  - `run-event-center-v2-real-browser-visible-smoke.js`
  - `run-event-center-v2-mobile-qa-smoke.js`

## Abgedeckte Events

- `indoor_dry_rootball`
- `shared_panic_watering_misread`

## Ausdruecklich nicht geaendert

- Keine neue Event-/Option-Aktivierung.
- Keine neue Delta-Logik.
- Kein Runtime-/Storage-Umbau.
