# Phase 139 - Dev Flag Preview Notes

## Aktuelle Event-Center Datenquelle
- Produktiv: unveraenderter V1 Runtime-Pfad.
- Dev/Lab: Event-V2 Preview/Shadow-Pipeline ueber dedizierte Scripts und Reports.

## Sicherster Bridge-Punkt
- `src/events/v2/preview/EventV2EventCenterPreviewBridge.js`
- Begruendung: liegt ausserhalb produktiver Runtime-Entry-Points und konsumiert nur bereits validierte Preview/Shadow-Modelle.

## Risiken
- Kein technischer Blocker.
- Watch-Status bleibt inhaltlich bei 14/22 Items (asset watch), blockiert aber die Bridge nicht.

## Nicht geaendert
- `app.js`
- `index.html`
- `sw.js`
- Event-Katalogdateien
- Locale-Dateien
