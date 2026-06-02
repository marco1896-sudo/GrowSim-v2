# Eventsystem V2 – Presentation Map (Result)

## Executive Summary
Die sichtbare V2-Event-Darstellung wurde in ein wiederverwendbares Mapping-Modul ausgelagert.  
`indoor_dry_rootball` bleibt funktional unveraendert aktiv, nutzt aber jetzt zentral gepflegte Copy-/Option-/Visual-Daten. Ein zweites Event (`shared_panic_watering_misread`) wurde nur als Mapping vorbereitet, nicht aktiviert.

## Neue Dateien
- `src/events/v2/ui/EventV2PresentationMap.js`
- `dev/run-event-v2-presentation-map-smoke.js`
- `docs/event-system-v2/phase-event-v2-presentation-map.md`
- `docs/event-system-v2/phase-event-v2-presentation-map-result.md`

## Geänderte Dateien
- `index.html`
- `app.js`

## Mapping-Struktur
Das Modul liefert:
- `getEventV2Presentation(eventId, options)`
- `getEventV2OptionPresentation(eventId, optionId, options)`
- `getEventV2VisualPresentation(eventId, options)`
- `normalizeEventV2Presentation(eventId, rawEvent)`

Inhaltlich abgedeckt:
- Titel, Beschreibung, Kategorie-/Severity-Label
- Insights
- Optionen (Label + Beschreibung)
- Visualstrategie
- neutraler Fallback ohne Rohkeys

## Tests
- Syntaxchecks fuer neues Modul und betroffene Runtime-Dateien
- bestehende Browser-/Mobile-/Reload-/ApplyDelta-Smokes
- event-release/test-smoke Pipelines
- neuer `event_v2_presentation_map_smoke`

## Restrisiken
- Das Mapping ist aktuell auf Pilot-Events ausgerichtet; fuer breiteren Rollout sind weitere Copy-/Visual-Reviews pro Event noetig.
- Bekannte, nicht-kritische SW-Hinweise in Browser-Smokes bleiben unveraendert.

## Nächste Mini-Phase
Die gleiche Presentation-Map als Pflichtquelle fuer weitere freigegebene Pilot-Events verwenden, bevor diese sichtbar aktiviert werden.
