# Eventsystem V2 - Real-Browser Visible Debug Result

## Executive Summary
Der sichtbare echte Browserpfad wurde nachgezogen. Der neue Smoke nutzt die Dev-Seed-Helper und klickt den echten Events-Button. Bei aktivem `indoor_dry_rootball` OpenEvent gewinnt V2 sichtbar vor Legacy/Cooldown.

## Geaenderte Dateien
- `app.js`
  - V2-Pilot-Sheet blendet den Legacy-History-Slot nicht mehr ein.
- `index.html`
  - Build-ID auf `20260527-ev2-real-visible` aktualisiert.
- `src/events/v2/dev/EventV2PilotSeedDevTools.js`
  - Seed/Reset aktualisiert ein offenes Event Sheet explizit und dispatcht `eventV2PilotSeeded`.

## Neue Dateien
- `dev/run-event-center-v2-real-browser-visible-smoke.js`
- `docs/event-system-v2/phase-event-center-v2-real-browser-visible-debug.md`
- `docs/event-system-v2/phase-event-center-v2-real-browser-visible-debug-result.md`

## Ursache
Die bisherigen Smokes prueften nicht hart genug den sichtbaren Nutzerpfad. Sie konnten intern das Event Sheet oeffnen, waehrend der echte Browserpfad weiterhin durch Cache, sichtbare Button-Interaktion und Legacy-History-Darstellung anders wirkte.

Zusätzlich blieb im V2-Pilot-Sheet ein Legacy-History-Slot sichtbar. Das erzeugte optisch weiter V1-Kontext, obwohl der eigentliche Resolve bereits V2 war.

## Fix
- Neuer Build-Cache-Bust.
- Real-Browser-Smoke mit echtem `#eventsActionBtn`.
- V2-Pilot-Seed aktualisiert sichtbare UI bei offenem Sheet.
- Aktiver V2-Pilot zeigt keinen Legacy-History-Slot mehr.

## Sichtbares Ergebnis
Nach:

```js
__resetEventV2Pilot({ clearHistory: true, resetStatus: true })
__seedEventV2PilotIndoorDryRootball()
```

und Oeffnen des Event Centers ist sichtbar:

- `V2 Pilot aktiv, Bridge-Pfad autoritativ.`
- `Indoor dry rootball`
- V2-DOM-Marker fuer System, Authority und Event-ID
- Optionen `inspect`, `overreact`, `stabilize`
- keine Legacy-Autoritaetsmeldung
- keine Abklingzeit-Copy
- kein Legacy-Visual
- kein Legacy-History-Slot im aktiven V2-Pfad

## Tests
Bestanden:

- `node --check app.js`
- `node --check ui.js`
- `node --check storage.js`
- `node --check src/events/EventSystemRuntimeBridge.js`
- `node --check src/events/v2/dev/EventV2PilotSeedDevTools.js`
- `node --check dev/run-event-center-v2-real-browser-visible-smoke.js`
- `node dev/run-event-center-v2-real-browser-visible-smoke.js`
- `node dev/run-event-center-v2-browser-reload-smoke.js`
- `node dev/run-event-center-v2-mobile-qa-smoke.js`
- `node dev/run-event-center-v2-apply-delta-pilot-smoke.js`
- `node dev/run-event-center-v2-resolve-pilot-smoke.js`
- `node dev/run-event-v2-pilot-seed-devtools-smoke.js`
- `npm run check:syntax`
- `npm run test:event-release`
- `npm run test:smoke`

Nicht ausgefuehrt:

- `npm run check:i18n` (optional)

## Restrisiken
- Ein bereits offener Browser-Tab kann alte Scripts halten, bis ein Hard Reload erfolgt.
- Service-Worker-/Cache-Zustaende auf `127.0.0.1:5173` koennen manuell geloescht werden, falls der alte Look trotzdem sichtbar bleibt.

## Naechste Mini-Phase
Nach manueller Sichtpruefung kann der naechste kleine Schritt sein, den V2-Pilotstatus im Dev-Modus noch leichter auffindbar zu machen, ohne Produktiv-UI aufzubauen.
