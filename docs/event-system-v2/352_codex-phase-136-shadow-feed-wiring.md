# Phase 136 - Shadow Feed Wiring

## Ziel
Ein dev-only Shadow-/Noop-Feed wurde auf Basis echter Event-V2-Katalogdaten aufgebaut, ohne Gameplay-Aktivierung und ohne Save-/Runtime-Mutation.

## Integrationspunkte
- `EventV2PreviewModel` liefert Katalog-nahe Previewdaten.
- `EventV2EventCenterPreviewAdapter` liefert Event-Center-kompatible Kartenitems.
- `EventV2ShadowFeedModel` transformiert diese Items in deterministische Shadow-Feed-Eintraege.
- `run-event-v2-shadow-feed-readiness-report.js` validiert 22/22 Feed-Items und Bildpfade.

## Sicherheitsgrenzen
- `canActivateGameplay` ist fuer alle Items `false`.
- `canMutateSave` ist fuer alle Items `false`.
- Keine Runtime-, Save-, Locale- oder Eventdatei-Aenderung.
