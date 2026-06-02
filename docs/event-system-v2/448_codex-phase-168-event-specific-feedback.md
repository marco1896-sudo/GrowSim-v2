# Phase 168 - Event-Specific Feedback Draft

## Analyse (Aufgabe A)
- Aktuelle Schwäche (vor Phase 168): Feedback war funktional, aber häufig generisch.
- Optionstypen: `inspect`, `stabilize`, `observe`, `wait`, `overreact`.
- Nutzbarer Kontext: `eventId`, `fixtureId`, `category`, `environment`, `severity`, `reason`.
- Event-spezifische Zielgruppen in diesem Draft:
  - Indoor VPD / Dry Rootball Cluster
  - Outdoor Heat/Dry Wind
  - Panic-Watering-Misread
  - Overwatering Early
  - Healthy Baseline

## Umsetzung
- Draft-Datei unter `_planning` erstellt (6 Kontexte).
- Dev-only Feedback-Layer liefert event-spezifische `short` + `learning` Texte.
- Fallback auf generisches Feedback bleibt aktiv für unbekannte Events.

## Safety
- Keine Runtime-/Save-/Storage-Pfade.
- Keine Event-/Locale-Datei geändert.

## Rollback
- `EventV2ResolveFeedbackCopy.js` entkoppeln/ausblenden, ResolvePreviewModel fällt auf generische Texte zurück.
