# Phase 143 - Candidate Feed Integration

## Integrationspunkt
Sicherster Punkt: isolierte Lab-Preview unter `dev/event-v2-preview-gallery.html` mit `src/events/v2/ui-lab/EventV2PreviewGallery.js`.

## Umsetzung
- Neuer Adapter für Candidate-Preview-Items:
  - `src/events/v2/preview/EventV2CandidateFeedPreviewAdapter.js`
- Gallery um neuen Modus erweitert:
  - `candidate` Modus
  - Fixture-Filter für 3 Snapshots
  - Candidate-only / No-write / Watch-Hinweise sichtbar
- Keine Runtime-/Save-/Gameplay-Kopplung.

## Safety
- Keine Actions erzeugt.
- Keine Eventauslösung.
- Kein Write-Pfad.
