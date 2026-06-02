# Eventsystem V2 - Event Center UI Priority Fix Result

## Executive Summary

Der sichtbare Event-Center-Pfad priorisiert ein vorhandenes V2-Pilot-OpenEvent jetzt klar vor Legacy/Cooldown.

Fuer `indoor_dry_rootball` gilt bei vorhandenem `state.eventV2.openEvents`:

- V2-Daten werden angezeigt.
- V2-DOM-Marker sind vorhanden.
- Legacy-Autoritaetshinweis erscheint nicht.
- Legacy-Cooldown-Texte erscheinen nicht.
- Das falsche Overwatering-/Eimer-Visual wird nicht genutzt.
- `stabilize` bleibt ueber den V2-Pfad resolvebar.

## Geaenderte Dateien

- `app.js`
  - V2-Pilot-Content bekommt Eventsystem-/Authority-Marker.
  - V2-Pilot-Header zeigt V2 statt Legacy-Autoritaet.
  - V2-Pilot-Media ignoriert Legacy-`activeImagePath`.
- `index.html`
  - Build-ID auf `20260527-ev2-ui-priority` aktualisiert, damit der echte Dev-Browser neue Script-URLs laedt.
- `dev/run-event-center-v2-browser-reload-smoke.js`
  - Smoke prueft jetzt sichtbare V2-Prioritaet gegen Legacy-Cooldown und falsches Visual.
- `dev/run-event-center-v2-mobile-qa-smoke.js`
  - Mobile-QA-Smoke prueft dieselben sichtbaren V2-Prioritaetsregeln.

## Neue Dateien

- `docs/event-system-v2/phase-event-center-v2-ui-priority-fix.md`
- `docs/event-system-v2/phase-event-center-v2-ui-priority-fix-result.md`

## Ursache

Der V2-Pilot konnte fachlich gelesen und resolved werden, aber das moderne Sheet renderte weiterhin pauschal Legacy-Copy und konnte Legacy-Media durchreichen.

Im echten Browser kam zusaetzlich eine alte Build-ID hinzu, wodurch der Browser weiterhin alte versionierte Scripts nutzen konnte.

## Fix

Der moderne Event-Sheet-Pfad unterscheidet jetzt sichtbar zwischen V2-Pilot und Legacy:

- V2: `data-event-system="v2"`
- V2: `data-event-id="indoor_dry_rootball"`
- V2: `data-event-authority="v2"`
- V2-Subtitle: `V2 Pilot aktiv, Bridge-Pfad autoritativ.`
- Legacy-Subtitle nur noch fuer Nicht-V2-Pfade
- V2-Pilot nutzt kein Legacy-`activeImagePath`

## Ergebnis im Browser

Live-Browser-Check nach Build-Bump:

```json
{
  "build": "20260527-ev2-ui-priority",
  "dataset": {
    "eventSystem": "v2",
    "eventId": "indoor_dry_rootball",
    "eventAuthority": "v2"
  },
  "title": "Indoor dry rootball",
  "subtitle": "V2 Pilot aktiv, Bridge-Pfad autoritativ.",
  "forbidden": {
    "legacyAuthoritative": false,
    "cooldownTitle": false,
    "cooldownText": false,
    "overwateringImage": false,
    "legacyOrigin": false
  }
}
```

Hinweis:

- Im normalen Browser ist ein V2-Pilot nur sichtbar, wenn `state.eventV2.openEvents` tatsaechlich ein unterstuetztes offenes Event enthaelt.
- Ohne offenes V2-Event bleibt Legacy/History/Cooldown als Fallback erlaubt.

## Tests

Bestanden:

- `node --check app.js`
- `node --check ui.js`
- `node --check storage.js`
- `node --check src/events/EventSystemRuntimeBridge.js`
- `node --check dev/run-event-center-v2-browser-reload-smoke.js`
- `node --check dev/run-event-center-v2-mobile-qa-smoke.js`
- `node dev/run-event-center-v2-browser-reload-smoke.js`
- `node dev/run-event-center-v2-mobile-qa-smoke.js`
- `node dev/run-event-center-v2-apply-delta-pilot-smoke.js`
- `node dev/run-event-center-v2-resolve-pilot-smoke.js`
- `node dev/run-event-system-v2-browser-runtime-bridge-pilot-smoke.js`
- `npm run check:syntax`
- `npm run test:event-release`
- `npm run test:smoke`

Nicht erneut ausgefuehrt:

- `npm run check:i18n`

Bekannter Status:

- Der i18n-Check hatte zuletzt weiterhin nur die bekannten dynamischen Care-Studio-Heuristik-Funde; der V2-Pilotpfad zeigte in den Browser-Smokes keine rohen i18n-Keys.

## Naechste Mini-Phase

Eine kleine Dev-Only-Seed-/Reset-Hilfe fuer den Browser waere sinnvoll, damit `indoor_dry_rootball` im echten Dev-Browser reproduzierbar als offenes V2-Event vorbereitet werden kann, ohne manuell LocalStorage oder Console-State zu bearbeiten.
