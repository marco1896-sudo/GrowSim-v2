# Grow Simulator Gastmodus Phase 1 - Startup-Unblock

## Ausgangslage

Das App-Store-Reife-Audit und das Gastmodus-Konzept haben den Startup-Login-/Cloud-Sync-Gate als P0-Blocker benannt. Neue Nutzer ohne Session konnten den Grow Simulator nicht zuerst lokal erleben, weil der Boot-Flow vor der lokalen Save-Initialisierung auf Auth wartete.

Ziel dieser Phase war der kleinste technische Einstieg: ein frischer Start ohne Session soll lokal als Gast starten, ohne Auth- oder Cloud-Sync-Funktionalitaet zu entfernen.

## Ursache des blockierenden Startup-Login-Gates

In `boot()` wurde bei fehlender gueltiger Session `setAuthGateActive(true)` gesetzt, der Cloud/Auth-Dialog als Gate geoeffnet und danach auf `waitForStartupAuthGateClear()` gewartet. Dadurch lief `initOrMigrateState()` fuer neue Nutzer erst nach Login oder Auth-Gate-Aufloesung.

Zusaetzlich konnte ein alter lokaler UI-Snapshot `state.ui.authGateActive` wiederherstellen. Damit bestand das Risiko, dass auch ein lokaler Save nach Reload wieder in einen blockierenden Gate-Zustand faellt.

## Geaenderte Dateien

- `app.js`
- `storage.js`
- `test/stability-top5-regression.test.js`
- `test/guest-mode-startup.test.js`
- `docs/app-store-readiness/codex-guest-mode-phase-1-startup-unblock.md`

## Konkrete Aenderung am Boot-/Auth-/Save-Flow

`boot()` behandelt einen fehlenden Auth-Token jetzt als lokalen Gaststart. Der Auth-Gate-Zustand bleibt inaktiv, ein eventuell offener Auth-Dialog wird geschlossen, und der Boot-Flow laeuft weiter zu `initOrMigrateState()`.

Der bestehende Auth-Pfad fuer gueltige Sessions bleibt erhalten. Wenn eine Session vorhanden ist, kann Cloud/Auth weiterhin wie bisher initialisiert werden.

`performAuthLogout()` fuehrt den Nutzer jetzt in einen lokalen Gastzustand zurueck, statt sofort wieder ein blockierendes Auth-Gate zu oeffnen.

`restoreState()` setzt wiederhergestellte UI-Gate-Daten fuer `authGateActive` explizit auf `false`. Damit werden alte lokale Saves nicht durch einen gespeicherten Gate-Zustand blockiert.

## Verhalten ohne Session

Ein frischer Start ohne Session bootet lokal. `initOrMigrateState()` laeuft, lokaler State wird initialisiert, Onboarding bzw. Run-Setup bleibt erreichbar, und der Auth-/Cloud-Dialog erscheint nicht als blockierendes Startup-Gate.

Cloud Sync wird ohne Login nicht automatisch aktiviert.

## Verhalten mit Session

Bei gueltiger Session bleibt das bisherige Verhalten moeglich: Auth wird erkannt, Cloud-nahe Logik kann weiter genutzt werden, und der Startup-Flow erzwingt kein zusaetzliches Gate.

## Verhalten bei bestehendem lokalem Save

Ein bestehender lokaler Save ohne Session wird weiter aus dem lokalen Speicher geladen. Reload bleibt moeglich und der Nutzer bleibt im lokalen Gastmodus.

Falls ein alter Save einen gespeicherten `authGateActive`-UI-Zustand enthaelt, wird dieser beim Restore neutralisiert.

## Angepasste oder neue Tests

Der bisherige Stabilitaets-Test fuer den sofortigen Startup-Gate-Zustand wurde auf das neue Produktverhalten umgestellt: signierter Zustand fehlt, die App startet als lokaler Gast, und `authGateActive` bleibt `false`.

Der Cloud-Retry-Test oeffnet den Auth-Dialog nun gezielt ueber die Cloud/Auth-Funktion statt ueber ein automatisches Startup-Gate.

Neu hinzugefuegt wurde `test/guest-mode-startup.test.js`. Der Test prueft:

- frischer Start ohne Session
- Gastmodus ohne aktives Auth-Gate
- lokaler State initialisiert
- Run-Setup erreichbar
- erster lokaler Save wird geschrieben
- Reload laedt den lokalen Gast-Spielstand ohne Auth-Gate

## Ausgefuehrte Tests

- `npm run check:syntax`
- `npm run check:i18n`
- `node test\guest-mode-startup.test.js`
- `node test\stability-top5-regression.test.js`
- `npm run test:runtime`
- `npm run test:smoke`
- `npm run test:event-release`
- `node dev\run-event-v2-release-gate-snapshot.js`
- `node test\service-worker-shell-assets.test.js`

## Testergebnisse

Alle ausgefuehrten Tests waren erfolgreich.

`check:i18n` und einzelne Runtime-I18n-Pruefungen zeigen weiterhin bestehende Hinweis-/Fallback-Ausgaben, brechen aber nicht fehl und wurden durch diese Phase nicht erweitert.

Der Event-V2-Release-Gate-Snapshot meldet `go`.

## Offene Risiken

Cloud/Auth-Architektur wurde bewusst nicht umgebaut. Spaetere Phasen muessen deshalb besonders pruefen, dass optionale Cloud-Funktionen ohne Login weiterhin nur einen klaren Login-Hinweis anzeigen und kein neues Startup-Gate erzeugen.

Alte Browser-/Service-Worker-Zustaende koennen in einer Entwicklerumgebung kurzzeitig veraltete Runtime-Dateien halten. Die Service-Worker-Shell-Asset-Pruefung ist gruen; fuer manuelle QA sollte dennoch ein harter Reload bzw. ein Cache-Clear in der lokalen Browserinstanz eingeplant werden.

Leaderboard, verifizierte Ergebnisse, Push und Cloud Save duerfen weiterhin Login verlangen. Diese Bereiche wurden in Phase 1 nicht fachlich erweitert und sollten bei spaeteren UI-Phasen separat validiert werden.

## Finale Einschaetzung

go

Der lokale Gaststart funktioniert im automatisierten frischen Start ohne Session, bestehende Session-Nutzung wurde nicht entfernt, lokaler Save und Reload wurden gezielt geprueft, und die geforderten Test-Gates sind gruen.
