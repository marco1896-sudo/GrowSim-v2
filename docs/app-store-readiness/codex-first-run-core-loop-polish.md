# First-Run Core Loop Polish

## Ausgangslage

- Gastmodus, lokaler Start ohne Session, Settings-/Privacy-Polish und Event-/Analyse-UX-Polish waren bereits abgeschlossen.
- Der erste Run bekam nach `Run starten` schon eine positive Toast-Bestaetigung.
- Neue Nutzer landeten danach aber direkt im vollen Home-HUD, wo Run-Ziel, Daily-Teaser, Harvest-Karte und Home-Actions gleichzeitig um Aufmerksamkeit konkurrierten.

## Ziel der Phase

- Den ersten echten Moment nach Run-Start ruhiger, klarer und motivierender machen.
- Keine Event-V2-Architektur, keine Save-Struktur, keine Cloud-/Gastmodus-Logik und kein grosses HUD-Redesign anfassen.
- Bestehende Strukturen weiterverwenden und nur minimal erweitern.

## Gepruefter Ablauf nach Run-Start

- Frischer Nutzer durchlaeuft den bestehenden Run-Builder.
- Nach `Run starten` verschwindet das Landing sauber und der Run wird lokal aktiv.
- Es gab bereits einen nicht-blockierenden Toast.
- Im Home-HUD war die naechste sinnvolle Aktion aber nicht klar genug sichtbar.
- Die kleine Teaser-Flaeche unter dem Player-Panel zeigte sofort Daily-/Retention-Informationen, obwohl fuer neue Nutzer zuerst Pflanze + erster Check wichtiger sind.

## Gefundene UX-Probleme

- Positive Bestaetigung war vorhanden, aber noch nicht stark genug mit einer klaren naechsten Aktion verbunden.
- Die erste sinnvolle Aktion war nicht sichtbar priorisiert.
- Daily-/Retention-Kommunikation konkurrierte im Erstkontakt mit dem ruhigeren Pflanzen-Check.
- Buddy war im Analyse-/Onboarding-Kontext gut eingebunden, aber direkt nach dem echten Run-Start noch nicht als ruhiger Coach im Home-Moment verankert.

## Geaenderte Dateien

- `app.js`
- `ui.js`
- `styles.css`
- `src/i18n/locales/de.json`
- `src/i18n/locales/en.json`
- `src/i18n/locales/es.json`
- `test/guest-mode-startup.test.js`
- `test/ui-onboarding-settings-smoke.test.js`

## Neue oder verbesserte First-Run-Fuehrung

- Die bestehende kleine Home-Teaser-Flaeche unter dem Player-Panel wird fuer den echten ersten frischen Run temporaer als Starter-Karte genutzt.
- Diese Karte ist nicht blockierend und ersetzt in diesem fruehen Moment die aggressivere Daily-Prioritaet.
- Die Karte fuehrt direkt ins `Care Studio` statt in Analyse oder Event Center.
- Die Starter-Karte erscheint nur in einem engen Fenster:
  - aktiver frischer erster Run
  - keine abgeschlossenen/claimbaren Daily-Fortschritte
  - kein aktives/resolving Event
  - kein alter bzw. bestaehender Run
- Danach faellt die Flaeche automatisch wieder auf den normalen Daily-Teaser zurueck.

## Buddy-/Coach-Texte

- Neuer Start-Toast:
  - bestaetigt den Run-Start positiv
  - verweist direkt auf den ersten Check im Care Studio
- Neue Starter-Karte:
  - ruhig
  - kurz
  - fokusiert auf Feuchte und Risiko
  - ohne unnoetigen Giess-/Duenge-Druck
- Neue Texte wurden sauber in DE/EN/ES gepflegt.

## Verhalten frischer Gastnutzer

- Gaststart bleibt unblockiert.
- Nach dem Run-Start erscheint weiter kein Login-/Cloud-Gate.
- Der Nutzer bekommt jetzt direkt einen Buddy-gefuehrten Starter-Hinweis.
- Tippen auf die Starter-Karte oeffnet das Care Studio fuer den ersten sinnvollen Check.

## Verhalten bestehender lokaler Saves

- Bestehende bzw. nicht-frische Runs bekommen keine dauerhafte Erststart-Karte.
- Sobald der fruehe Erststart-Kontext nicht mehr gilt, erscheint wieder der normale Daily-Teaser.
- Die Aenderung fuehrt keinen neuen verpflichtenden Save-Pfad ein.

## Verhalten nach Reload

- Reload eines frischen ersten Runs bleibt unblockiert und restauriert den aktiven Run.
- Die Starter-Karte bleibt nur im engen Erststart-Zeitfenster sichtbar.
- Aeltere/restaurierte Runs fallen nach Reload wieder auf den normalen Daily-Teaser zurueck.
- Transiente UI-Zustaende bleiben weiter neutralisiert; kein blockierender First-Run-Dialog wird gespeichert.

## Neue oder geaenderte Tests

- `test/guest-mode-startup.test.js`
  - prueft neuen Start-Toast
  - prueft sichtbare Starter-Karte
  - prueft Klickpfad ins Care Studio
  - prueft Rueckfall auf Daily-Teaser fuer aeltere restaurierte Runs
- `test/ui-onboarding-settings-smoke.test.js`
  - prueft Starter-Karte nach Run-Start
  - prueft Care-Studio-Zielpfad ueber die Home-Teaser-Flaeche

## Ausgefuehrte Tests

- `npm run check:syntax`
- `npm run check:i18n`
- `node test/public-text-readiness.test.js`
- `node test/guest-mode-startup.test.js`
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

- Alle oben gelisteten Tests bestanden.
- `event-v2-visibility-health-report`: `ok: true`
- `event-v2-release-gate-snapshot`: `gate: go`
- Guest-Mode blieb unblockiert.
- Gameover-Flow blieb gruen.
- Event-V2-Gate blieb gruen.
- Keine fehlenden verwendeten i18n-Keys in DE/EN/ES.

## Offene Risiken

- Die Home-Starter-Fuehrung sitzt weiterhin in der bestehenden Home-/Playercard-Renderstruktur und ist noch kein separater UI-Baustein.
- Der erste Moment ist jetzt klarer, aber noch kein vollwertiges mehrstufiges In-Run-Tutorial.
- `npm run test:runtime` ist gruener, aber relativ langlaufend; das war kein inhaltlicher Fehler, nur ein Laufzeit-Thema im Suite-Umfang.

## Finale Einschaetzung

`go`

Begruendung:

- Der erste Run wirkt nach dem Start klarer, ruhiger und handlungsorientierter.
- Die naechste sinnvolle Aktion ist sichtbar und fuehrt in einen passenden bestehenden Screen.
- Buddy fuehrt kurz und ruhig, ohne zu blockieren.
- Gastmodus, Save/Load, Event-V2 und Gameover blieben stabil.
