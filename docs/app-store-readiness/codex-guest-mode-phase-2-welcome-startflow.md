# Grow Simulator Gastmodus Phase 2 - Welcome-Startflow

## Ausgangslage

Phase 1 hat den technischen Startup-Blocker geloest: Nutzer ohne Session starten lokal als Gast, `initOrMigrateState()` laeuft ohne Login, lokale Saves bleiben erhalten und Reload im Gastmodus funktioniert.

Phase 2 sollte den sichtbaren Erstkontakt verbessern, ohne Boot, Auth, Cloud Sync oder Save-Struktur tief umzubauen.

## Ziel von Phase 2

Neue Gastnutzer sollen beim ersten Start verstehen, dass sie sofort lokal spielen koennen. Der Einstieg soll freundlicher wirken, Buddy soll ruhig fuehren, Cloud Sync darf nur optional erwaehnt werden und der Weg zum ersten Run soll klar bleiben.

## Geaenderte Dateien

- `index.html`
- `styles.css`
- `app.js`
- `src/i18n/locales/de.json`
- `src/i18n/locales/en.json`
- `src/i18n/locales/es.json`
- `test/guest-mode-startup.test.js`
- `test/ui-onboarding-settings-smoke.test.js`
- `docs/app-store-readiness/codex-guest-mode-phase-2-welcome-startflow.md`

Hinweis: Die Phase baut auf den bereits vorhandenen Phase-1-Aenderungen in `app.js`, `storage.js`, `test/stability-top5-regression.test.js` und `test/guest-mode-startup.test.js` auf.

## Neuer oder verbesserter Startfluss

Der vorhandene Run-Builder bleibt der Startpunkt. Es wurde kein neuer Account-Screen, kein neues Modal und kein neuer Save-Zustand eingefuehrt.

Der erste Run-Builder-Schritt zeigt jetzt:

- eine klare lokale Start-Einordnung
- den Hinweis, dass der Spielstand auf dem aktuellen Geraet gespeichert bleibt
- eine kompakte Gastmodus-Statuszeile
- einen optionalen Cloud-Sync-Hinweis ohne Pflicht-Login
- einen ruhigeren Buddy-Text, der den ersten Schritt erklaert

Nach dem Start des ersten Runs erscheint eine kurze positive Toast-Bestaetigung. Sie blockiert nicht, erzeugt keinen Dialog und veraendert den Run nicht.

## Verhalten frischer Gastnutzer

Ein frischer Start ohne Session zeigt weiterhin kein Auth-Gate. Der Nutzer landet im vorhandenen Run-Setup und sieht dort die neue lokale Welcome-Hilfe. Der Run kann lokal gestartet werden, der lokale Save wird geschrieben und Reload funktioniert weiterhin ohne Welcome-Blockade.

## Verhalten bestehender lokaler Save

Bestehende lokale Saves werden nicht durch einen neuen Welcome-Flow unterbrochen. Wenn bereits ein Setup bzw. Run existiert, bleibt die Landing hidden und der Nutzer landet wie gewohnt im laufenden lokalen Spielstand.

## Verhalten mit Session

Der Session-Pfad wurde nicht fachlich umgebaut. Gueltige Sessions bleiben moeglich, Cloud-nahe Funktionen bleiben erreichbar und der neue Gast-Welcome-Block erscheint nur dort, wo ohnehin der Run-Builder sichtbar ist.

## Neue/geaenderte Texte

Neue i18n-Keys:

- `onboarding.guest.eyebrow`
- `onboarding.guest.title`
- `onboarding.guest.subtitle`
- `onboarding.guest.status`
- `onboarding.guest.cloud_hint`
- `onboarding.guest.buddy`
- `onboarding.guest.run_started`

Die Keys wurden in `de`, `en` und `es` gepflegt. Der erste Versuch erzeugte einen doppelten `onboarding`-Namespace; das wurde korrigiert, sodass `check:i18n` keine fehlenden verwendeten Keys mehr meldet.

## Tests

Gezielt erweitert:

- `test/guest-mode-startup.test.js`
  - prueft Welcome-Note im frischen Gaststart
  - prueft keinen Auth-Gate-Start
  - prueft lokale State-Initialisierung
  - prueft Run-Start, Toast-Bestaetigung, lokalen Save und Reload
  - prueft keine sichtbaren `onboarding.guest`-Key-Leaks
  - prueft kein MVP-/Dev-/Legacy-/Pflicht-Wording im neuen Startbereich

Angepasst:

- `test/ui-onboarding-settings-smoke.test.js`
  - erwartet im ersten Builder-Schritt nun die freundliche Gast-/Run-Ueberschrift statt der alten rein technischen Topfgroessen-Ueberschrift
  - prueft den Gastmodus-Hinweis im ersten Startbereich

Zusaetzlich ausgefuehrt:

- `node test/stability-top5-regression.test.js`
  - prueft weiter signierten Startup, Gaststart, Cloud-Retry und Restore-nahe Stabilitaet

## Testergebnisse

Erfolgreich:

- `npm run check:syntax`
- `npm run check:i18n`
- `node test/guest-mode-startup.test.js`
- `node test/ui-onboarding-settings-smoke.test.js`
- `node test/stability-top5-regression.test.js`
- `npm run test:runtime`
- `npm run test:smoke`
- `npm run test:event-release`
- `node dev/run-event-v2-release-gate-snapshot.js`
- `node test/service-worker-shell-assets.test.js`

`check:i18n` meldet weiterhin bestehende heuristische unused-key-Hinweise, aber keine fehlenden verwendeten Keys.

Der erste Einzellauf von `test/ui-onboarding-settings-smoke.test.js` zeigte einmalig einen nicht reproduzierbaren Transient-UI-Reload-Settle-Fehler in einem spaeteren Menueabschnitt. Der Wiederholungslauf und die komplette `npm run test:smoke`-Suite waren gruen.

Die In-App-Browser-Pruefung auf `http://127.0.0.1:5173/?guest-smoke=1` zeigte einen vorhandenen lokalen Run statt eines frischen Erststarts; dabei erschien kein Auth-Gate. Der frische Erststart wurde durch den gezielten Playwright-Test mit geleertem Storage abgedeckt.

## Offene Risiken

Die Browser-Instanz kann lokale Saves oder Service-Worker-/Cache-Zustaende behalten. Fuer manuelle Erststart-QA sollte Storage gezielt geleert werden.

Der neue Welcome-Block ist bewusst klein. Spaetere Phasen koennen die visuelle Qualitaet weiter steigern, sollten aber weiterhin keine Pflicht-Login-Kommunikation in den Vordergrund stellen.

Cloud Sync wurde nur als optionaler Hinweis im Startflow erwaehnt. Die eigentlichen Cloud-/Settings-Flows sollten in Phase 3 separat weiter poliert und getestet werden.

## Finale Einschaetzung

go

Der Gastmodus-Start wird nicht blockiert, der erste sichtbare Startfluss ist freundlicher und klarer, lokale Saves und Reload bleiben stabil, Session-Nutzung wurde nicht entfernt, und die geforderten Test-Gates sind gruen.
