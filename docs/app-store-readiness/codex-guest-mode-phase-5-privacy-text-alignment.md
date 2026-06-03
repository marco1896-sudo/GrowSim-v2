# Grow Simulator Gastmodus Phase 5 - Datenschutz- und Textabgleich

## Ausgangslage

Die Gastmodus-Phasen 1 bis 4 haben den lokalen Start ohne Session technisch freigemacht und gegen Startup-/Reload-/Logout-Regressions abgesichert.

Offen blieb Phase 5: sichtbare Texte, Datenschutz-/Info-Flaechen und optionale Cloud-/Login-Kommunikation mussten auf denselben Produktstand gebracht werden. Vor dieser Phase gab es noch einzelne Widersprueche wie "MVP"/"prototype"-Reste, einen Platzhalter im Projektinfo-Dialog, loginlastige Privacy-Formulierungen und uneinheitliche Gastmodus-/Cloud-Texte zwischen Deutsch, Englisch und Spanisch.

## Ziel von Phase 5

- Gastmodus, lokaler Save und optionaler Cloud Sync in allen sichtbaren Produkttexten konsistent machen.
- Privacy-/Imprint-/Info-Flaechen auf den realen Produktfluss ausrichten.
- Login spaeter und optional erklaeren statt wie eine Startvoraussetzung wirken zu lassen.
- Push-/Reminder-Kommunikation ruhig, optional und nicht-blockierend formulieren.
- Oeffentliche Reife-Begriffe wie `MVP`, `prototype` oder Platzhaltertext entfernen.
- Keine Auth-/Cloud-Architektur umbauen und keine Save-Logik aendern.

## Gepruefte Datenschutz-/Info-Flaechen

- `index.html`
  - Privacy-Sheet
  - Auth-/Cloud-Modal
  - Onboarding-Gast-Hinweis
- `ui.js`
  - Projektinfo-/About-Dialog
- `manifest.webmanifest`
  - App-Name und Beschreibung
- `README.md`
  - oeffentliche Projektbeschreibung
- `src/i18n/locales/de.json`
- `src/i18n/locales/en.json`
- `src/i18n/locales/es.json`
- `src/ui/state/menuUiPresentation.js`
- `src/ui/state/pushUiPresentation.js`

## Gepruefte Cloud-/Login-/Push-Texte

- Gaststart / lokaler Save
- Einstellungen: Cloud Sync, lokaler Spielstand, Erinnerungen
- Auth-Modal fuer Gast und eingeloggte Nutzer
- Reward-/Leaderboard-Hinweise mit Account-Bezug
- Projektinfo-/About-Text
- Push-Feedback bei fehlendem Login, fehlender Browser-Unterstuetzung und deaktivierten Berechtigungen

## Gefundene Widersprueche

1. `manifest.webmanifest` und `README.md` trugen noch `MVP`-/`prototype`-Sprache.
2. Der About-Dialog zeigte noch den Platzhalter `Grow Simulator MVP · Weitere Infos folgen.`.
3. Die Privacy-Kommunikation war in Teilen noch login- und serverzentriert, obwohl Gaststart/lokaler Save inzwischen Standard sind.
4. Das Auth-Modal erklaerte den optionalen Charakter von Konto/Cloud nicht deutlich genug.
5. Einige sichtbare Labels im Auth-Modal waren noch statisch auf Deutsch verdrahtet.
6. Spanische Texte waren noch auf dem alten "Login erforderlich"-Stand.
7. Push-/Reminder-Texte klangen teils technischer oder haerter als noetig.

## Geaenderte Dateien

- `README.md`
- `app.js`
- `index.html`
- `manifest.webmanifest`
- `src/i18n/locales/de.json`
- `src/i18n/locales/en.json`
- `src/i18n/locales/es.json`
- `src/ui/state/menuUiPresentation.js`
- `src/ui/state/pushUiPresentation.js`
- `test/guest-mode-startup.test.js`
- `test/ui-onboarding-settings-smoke.test.js`
- `test/public-text-readiness.test.js`
- `ui.js`
- `docs/app-store-readiness/codex-guest-mode-phase-5-privacy-text-alignment.md`

## Geaenderte Nutzertexte

- App-/Projektbeschreibung:
  - `Grow Simulator` statt `Grow Simulator MVP`
  - keine `prototype`-Sprache mehr in Manifest/README

- Projektinfo:
  - About-Dialog erklaert jetzt lokalen Start, optionale Cloud-Funktionen, verifizierte Ergebnisse, Leaderboard und Erinnerungen ohne Platzhaltertext

- Auth-/Cloud-Kommunikation:
  - `Konto & Cloud` / `Account & cloud` / `Cuenta y nube`
  - klarer Hinweis: lokales Spielen funktioniert auch ohne Konto
  - eingeloggte Nutzer sehen weiterhin, dass Cloud Sync optional bleibt

- Settings:
  - Cloud Sync wird als optionale Sicherung/Geraetewechsel erklaert
  - lokaler Spielstand bleibt klar auf "diesem Geraet"
  - Reminder-/Push-Texte wirken optional statt technisch oder gate-aehnlich

- Reward-/Leaderboard-Kommunikation:
  - kein hartes `Login erforderlich` mehr fuer diese Hinweise
  - stattdessen klare Einordnung als accountgebundene verifizierte Zusatzfunktion

## Verhalten Gastmodus

- Gaststart bleibt lokal, direkt und ohne Blocker.
- Privacy-/Info-Texte beschreiben den lokalen Save jetzt passend zum realen Produktverhalten.
- Onboarding und Einstellungen erklaeren klar, dass Cloud Sync spaeter optional verbunden werden kann.

## Verhalten Cloud/Login-Kommunikation

- Ohne Session wird kein Pflichtcharakter vermittelt.
- Das Auth-Modal ist jetzt als spaeterer optionaler Schritt gerahmt.
- Mit Session bleibt die bestehende Account-Nutzung erhalten.
- Nach Logout bleibt die Kommunikation konsistent: lokaler Run bleibt spielbar, Cloud Sync bleibt optional.

## Verhalten Push/Erinnerungen

- Erinnerungen werden als optionale Zusatzfunktion beschrieben.
- Fehlende Browser-Unterstuetzung oder deaktivierte Berechtigungen werden ruhig erklaert.
- Ohne Konto wird klar gesagt, dass der lokale Run weiter spielbar bleibt.

## Public-Text-Cleanup

- `MVP` aus Manifest/About entfernt
- `prototype` aus der README entfernt
- `Weitere Infos folgen` aus dem About-Dialog entfernt
- keine sichtbare Pflicht-Login-Tonalitaet mehr in den geprueften Gastmodus-/Privacy-/Info-Flaechen

## Neue/geaenderte Tests

- `test/guest-mode-startup.test.js`
  - prueft jetzt zusaetzlich den optionalen Gast-Account-Dialog aus den Settings
  - stellt sicher, dass der Dialog lokalen Start ohne Konto klar erlaubt

- `test/ui-onboarding-settings-smoke.test.js`
  - prueft die neue eingeloggte Cloud-Dialog-Kommunikation
  - prueft den neuen verbundenen Cloud-Titel

- `test/public-text-readiness.test.js`
  - neue kleine Reife-Schranke fuer oeffentliche Produkttexte
  - deckt Manifest, README, About-Placeholder und die drei Gastmodus-Locales ab

## Ausgefuehrte Tests

- `npm run check:syntax`
- `npm run check:i18n`
- `node test/public-text-readiness.test.js`
- `node test/guest-mode-startup.test.js`
- `node test/menu-ui-presentation.test.js`
- `node test/push-ui-presentation.test.js`
- `node test/ui-onboarding-settings-smoke.test.js`
- `npm run test:runtime`
- `npm run test:smoke`
- `npm run test:event-release`
- `node dev/run-event-v2-release-gate-snapshot.js`
- `node test/service-worker-shell-assets.test.js`
- `node test/encoding-utf8-regression.test.js`

## Testergebnisse

Alle ausgefuehrten Tests sind bestanden.

Zusaetzliche Hinweise:

- `check:i18n` ist gruen.
- Die bekannten `unused key`-Heuristik-Hinweise bestehen weiter, sind aber nicht neu durch diese Phase entstanden.
- Das Event-V2-Release-Gate-Snapshot meldet `ok: true` und `gate: go`.

## Offene Risiken

- Die rechtlichen Texte sind weiterhin produktintern abgestimmt, aber keine finale juristische Freigabe.
- `legal.de_only_notice` weist weiterhin korrekt darauf hin, dass der Rechtstext aktuell nur auf Deutsch bereitsteht.
- Im Arbeitsbaum liegen weiterhin offene Aenderungen aus frueheren Gastmodus-Phasen; diese Phase wurde darauf aufbauend umgesetzt.

## Hinweise fuer spaetere juristische Pruefung

- Der aktuelle Datenschutztext beschreibt nun den realen Gastmodus-/Cloud-Stand deutlich besser.
- Vor Store-Release sollte trotzdem eine formale juristische Pruefung fuer Datenschutz, Impressum, Push-Hinweise und eventuelle Server-/Account-Datenfluesse erfolgen.
- Dabei sollte insbesondere geprueft werden, ob die Beschreibung von lokaler Speicherung, optionaler Cloud-Sicherung und Reminder-Berechtigungen vollstaendig genug fuer den Zielmarkt ist.

## Finale Einschaetzung

`go`

Begruendung:

- Gastmodus, lokaler Save und optionaler Cloud Sync werden jetzt konsistent und ohne Startdruck kommuniziert.
- Die geprueften sichtbaren Produkttexte widersprechen dem freigeschalteten Gaststart nicht mehr.
- Alle geforderten Gates und Regressionstests sind gruen.
