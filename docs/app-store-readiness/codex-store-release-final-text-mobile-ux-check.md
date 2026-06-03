# Grow Simulator Store-Release Final Text + Mobile UX Check

## Ausgangslage

- Gastmodus ist bereits Standard.
- Lokaler Start ohne Session funktioniert.
- Cloud Sync ist optional.
- Die Phasen 1 bis 5 der Gastmodus-/Store-Readiness-Arbeit lagen bereits im Arbeitsbaum vor.
- Ziel dieser Abschlussrunde war kein neues Feature, sondern eine finale Pruefung von sichtbaren Texten, Mobile-Breite, Privacy-/Info-Flaechen und Hauptflows.

## Ziel der Abschlussrunde

- DE/EN/ES auf sichtbare Reife pruefen.
- Mobile UX auf 390x844 gegen Overlap, abgeschnittene Texte und blockierende Flows pruefen.
- Privacy-/Info-/Cloud-Kommunikation auf Konsistenz mit lokalem Save und optionaler Cloud pruefen.
- Nur kleine, eindeutig noetige Text-/i18n-/UX-Korrekturen vornehmen.
- Alle bestehenden Regression-Gates gruen halten.

## Gepruefte Sprachen

- Deutsch
- Englisch
- Spanisch

## Gepruefte Mobile-Flows

- Frischer Gaststart ohne Session
- Run-Builder bis Run-Start
- Reload mit lokalem Save
- Menue oeffnen
- Einstellungen oeffnen
- Privacy/Datenschutz oeffnen
- Auth-/Cloud-Dialog oeffnen
- Logout zurueck in lokalen Gaststatus
- Analyse kurz oeffnen
- Event-V2-Release-Sichtbarkeit ueber die vorhandenen Browser-/Mobile-Smokes
- Gameover-Flow ueber Runtime-Test

## Gepruefte Privacy-/Info-Flaechen

- Projektbeschreibung in `README.md`
- App-Beschreibung in `manifest.webmanifest`
- About-/Projektinfo-Dialog
- Privacy-Sheet
- Impressum-/Info-Flaechen
- Settings: lokaler Save, Cloud Sync, Erinnerungen
- Auth-/Cloud-Modal
- Gastmodus-Hinweise im Onboarding

## Gefundene Probleme

1. EN/ES-Laufzeitwerte im Settings-/Reminder-Bereich fielen teilweise auf deutsche Push-/Status-Texte zurueck.
2. Dynamische Settings-Werte fuer Simulationstempo und Event-Fenster blieben in EN/ES ebenfalls deutsch.
3. Timing-sensitive Gates (`gameover-flow`, `stability-top5`, `event-v2-release-gate-snapshot`) konnten unter starker Parallel-Last false negatives zeigen und mussten fuer die finale Aussage isoliert erneut laufen.

## Behobene Probleme

1. Push-/Reminder-Laufzeittexte werden jetzt fuer DE/EN/ES ueber das bestehende i18n-System eingespeist statt nur aus der deutschen Default-Praesentation.
2. Dynamische Settings-Werte fuer `Simulationstempo` und `Ereignisse` wurden auf lokalisierte Format-Strings umgestellt.
3. Ein Runtime-Regressionstest deckt jetzt explizit ab, dass EN/ES im Settings-Sheet keine deutschen Push-/Status-Reste mehr zeigen.

## Bewusst zurueckgestellte Punkte

- Keine groesseren Umbauten an Auth-, Cloud-, Save- oder Event-Architektur.
- Keine juristische Endfreigabe der Datenschutz-/Info-Texte.
- Keine kosmetische Verkuerzung des Menues: auf 390x844 reicht die erste Ansicht nicht bis zum letzten Eintrag, die Liste bleibt aber sauber scrollbar und blockiert den Flow nicht.

## Geaenderte Dateien

- `app.js`
- `src/ui/state/pushUiPresentation.js`
- `src/ui/state/menuUiPresentation.js`
- `src/i18n/locales/de.json`
- `src/i18n/locales/en.json`
- `src/i18n/locales/es.json`
- `test/ui-onboarding-settings-smoke.test.js`
- `docs/app-store-readiness/codex-store-release-final-text-mobile-ux-check.md`

## Tests

- `npm run check:syntax`
- `npm run check:i18n`
- `node test/public-text-readiness.test.js`
- `node test/guest-mode-startup.test.js`
- `node test/menu-ui-presentation.test.js`
- `node test/push-ui-presentation.test.js`
- `node test/ui-onboarding-settings-smoke.test.js`
- `node test/gameover-flow-runtime.test.js`
- `node test/stability-top5-regression.test.js`
- `npm run test:runtime`
- `npm run test:smoke`
- `npm run test:event-release`
- `node dev/run-event-v2-visibility-health-report.js`
- `node dev/run-event-v2-release-gate-snapshot.js`
- `node test/service-worker-shell-assets.test.js`
- `node test/encoding-utf8-regression.test.js`

## Testergebnisse

- `check:syntax`: bestanden
- `check:i18n`: bestanden
- `public-text-readiness`: bestanden
- `guest-mode-startup`: bestanden
- `menu-ui-presentation`: bestanden
- `push-ui-presentation`: bestanden
- `ui-onboarding-settings-smoke`: bestanden
- `gameover-flow-runtime`: bestanden
- `stability-top5-regression`: bestanden
- `test:runtime`: bestanden
- `test:smoke`: bestanden
- `test:event-release`: bestanden
- `run-event-v2-visibility-health-report`: bestanden
- `run-event-v2-release-gate-snapshot`: bestanden (`gate: go`)
- `service-worker-shell-assets`: bestanden
- `encoding-utf8-regression`: bestanden

Hinweis:

- Ein frueher Parallel-Durchlauf zeigte bei einzelnen timing-sensitiven Gates false negatives. Die finale Bewertung basiert auf den isolierten Wiederholungslaufen, die gruene Ergebnisse geliefert haben.
- `check:i18n` meldet weiterhin nur die bekannte Heuristik-Liste ungenutzter Keys; keine neuen Missing Keys.

## Offene rechtliche/produktseitige Restpunkte

- Juristische Endpruefung fuer Datenschutz, Impressum, Push-/Reminder-Hinweise und Account-/Cloud-Beschreibung ist weiterhin empfohlen.
- `legal.de_only_notice` bleibt relevant: die eigentlichen Rechtstexte sind weiterhin deutschzentriert.
- Diese Abschlussrunde bestaetigt die Produktkommunikation technisch und UX-seitig, ersetzt aber keine formale Rechtspruefung.

## Finale Einschaetzung

`go`

Begruendung:

- Gastmodus, lokaler Save und optionale Cloud wirken in den geprueften Hauptflows konsistent.
- Die sichtbaren DE/EN/ES-Texte zeigen nach dem Fix keine neuen i18n-Key-Leaks und keine deutschen Reminder-/Status-Reste mehr in EN/ES.
- Mobile 390x844 bleibt in den geprueften Flows benutzbar; es wurden keine blockierenden Layout- oder Overlay-Probleme gefunden.
- Alle angeforderten Regression-Gates und das Event-V2-Release-Gate sind im finalen isolierten Lauf gruen.
- Juristische Endpruefung bleibt empfohlen, blockiert die aktuelle technische Produktreife aber nicht.
