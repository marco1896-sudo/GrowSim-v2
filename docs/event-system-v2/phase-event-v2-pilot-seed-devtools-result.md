# Eventsystem V2 – Dev-only Seed/Reset-Hilfe (Ergebnis)

## Executive Summary
Die Dev-only Seed/Reset-Hilfe für den V2-Pilotpfad (`indoor_dry_rootball`) ist umgesetzt. Der Browser kann den Pilotzustand jetzt reproduzierbar vorbereiten und zurücksetzen, ohne V1 zu verändern oder neue produktive Pfade zu öffnen.

## Neue Dateien
- `src/events/v2/dev/EventV2PilotSeedDevTools.js`
- `dev/run-event-v2-pilot-seed-devtools-smoke.js`
- `docs/event-system-v2/phase-event-v2-pilot-seed-devtools.md`

## Geänderte Dateien
- `index.html` – Dev-Tool-Skript in bestehende Lade-Reihenfolge aufgenommen.
- `app.js` – Dev-Tool-Installation im Boot-Schritt `bind_dev_helpers` ergänzt.

## DevTools-Zugriff
- Freigabe nur unter Dev-Bedingungen (localhost/127.0.0.1, Dev-Query oder Dev-Mode).
- Verfügbare Globals im Dev-Fall:
  - `__seedEventV2PilotIndoorDryRootball`
  - `__resetEventV2Pilot`
  - `__getEventV2PilotState`
- Außerhalb Dev: keine Registrierung.

## Testbefehle
- `node --check src/events/v2/dev/EventV2PilotSeedDevTools.js`
- `node --check dev/run-event-v2-pilot-seed-devtools-smoke.js`
- `node dev/run-event-v2-pilot-seed-devtools-smoke.js`
- plus bestehende V2 Pilot-Smokes laut Phase

## Testergebnisse
- Seed/Reset-Verhalten funktioniert in isoliertem Smoke.
- Dev-Gating funktioniert (Dev erlaubt, Non-Dev blockiert).
- `eventV2` wird defensiv initialisiert.
- V1-Legacy-Daten werden nicht destruktiv verändert.
- Browser-Reload-Smoke nutzt jetzt denselben Seed-Pfad wie die manuelle QA:
  - `__resetEventV2Pilot({ clearHistory: true, resetStatus: true })`
  - `__seedEventV2PilotIndoorDryRootball({ instanceId })`
  - `__getEventV2PilotState()`
- Die frühere direkte LocalStorage-Initialisierung im Reload-Smoke wurde entfernt.

## Restrisiken
- Browser-Session-spezifische Unterschiede (z. B. vorhandener Alt-State im LocalStorage) können manuelle QA beeinflussen; dafür bleibt der Reset-Helfer notwendig.

## Nächste empfohlene Mini-Phase
Den bestehenden Browser-Reload-Smoke optional auf die neuen Seed-Helpers umstellen, um manuelle State-Präparation weiter zu reduzieren.
