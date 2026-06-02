# Phase 139 - Event Center Preview Bridge (Dev Flag Only)

## Scope
- Dev-only Event-V2 Event-Center Preview Bridge auf Basis bestehender Preview/Shadow-Pipeline.
- Keine Gameplay-Aktivierung.
- Keine Runtime-Umschaltung.
- Keine Save-/Migration-Mutation.

## Architekturpruefung (read-only)
- Produktiver Runtime-Pfad bleibt V1-authoritativ ueber `events.js`/`app.js`.
- Sicherer V2-Lab-Pfad: `EventV2PreviewModel` -> `EventV2EventCenterPreviewAdapter` -> `EventV2ShadowFeedModel`.
- Neuer Bridge-Punkt liegt isoliert unter `src/events/v2/preview/` und ist nicht in produktive App-Entry-Points eingebunden.

## Umsetzung
- Neue Datei: `src/events/v2/preview/EventV2EventCenterPreviewBridge.js`
- Uebersetzt Shadow-Feed-Items in Event-Center-Preview-kompatible Datenstruktur.
- Erzwingt Safety-Felder:
  - `isEventV2Preview: true`
  - `isShadowOnly: true`
  - `canActivateGameplay: false`
  - `canMutateSave: false`
  - `actions: []`

## Risiko
- Niedrig: rein dev/lab Datenbruecke, keine Runtime- oder Save-Integration.
