# Phase 137 - Shadow Feed Lab Bridge

## Bestehende Datenquelle
- Bisher nutzte die Lab-Gallery nur `phase-134-event-center-preview-report.json` (Preview-Items).
- Shadow-Feed-Daten liegen separat in `phase-136-shadow-feed-readiness-report.json`.

## Bridge-Anpassung
- Isolierter Modus-Schalter in der Lab-Gallery:
  - `Preview Items`
  - `Shadow Feed`
- Shadow-Modus liest nur dev/planning-Daten und bleibt strikt non-runtime.

## Sicherheit
- Keine Runtime-Imports in App-Flows.
- Kein Save-Zugriff.
- Kein Event-Trigger.
- Keine produktive UI-Verbindung.
