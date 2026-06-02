# Phase 136 - Shadow Feed Integration Notes

## Vorhandene Integrationspunkte
- `src/events/v2/preview/EventV2PreviewModel.js`
- `src/events/v2/preview/EventV2EventCenterPreviewAdapter.js`
- `src/events/v2/ui-lab/qa/EventV2AdapterMatrix.js`
- `src/events/v2/engine/ShadowEventEngine.js` (weiterhin read-only stub)

## Empfohlener sicherer Andockpunkt
- `src/events/v2/preview/EventV2ShadowFeedModel.js` als reine Transformationsschicht.
- Keine Imports in `app.js`.
- Keine Runtime-Bridge-Aktivierung.

## Risikoanalyse
- Runtime-Risiko: niedrig (kein Runtime-Hook).
- Save-Risiko: niedrig (kein Persistenzzugriff).
- UI-Risiko: niedrig (dev-only Reports/Modelle).

## Offene Punkte
- Sichtbare Shadow-Feed-Darstellung im Lab (Phase 137).
- Danach ggf. Event-Center-Lab-Bridge als naechster Schritt.
