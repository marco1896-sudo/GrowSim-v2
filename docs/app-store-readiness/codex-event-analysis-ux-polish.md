# Event & Analysis UX Polish

## Ausgangslage

- Gastmodus, Store-Text, Mobile-UX und Legal-/Policy-Audits lagen bereits vor.
- Event-V2-Gate, Runtime-, Smoke-, Service-Worker- und Encoding-Checks waren zuletzt gruen.
- Event Center und Analyse wirkten aus Nutzersicht noch zu technisch, vor allem in leeren Zustaenden, Headern, Tab-Titeln und einzelnen Coach-/Statusformulierungen.

## Ziel der Phase

- Event Center und Analyse sollten verstaendlicher, motivierender und app-reifer wirken.
- Keine Event-V2-Architektur, Savegame-Struktur, Scheduler-/Resolve-/Cooldown-Logik oder Cloud-/Gastmodus-Mechanik anfassen.
- Nur UX, Text, Informationshierarchie und Coach-Sprache verbessern.

## Gepruefte Event-Center-Flaechen

- `dashboard`-Overview mit Event-Center-Karte
- modernes Event Sheet (`eventSheetModernRoot`)
- leere Event-Zustaende
- aktive Event-Zustaende
- resolving-/resolved-Zustaende
- sichtbare Header, Labels und Hinweistexte

## Gepruefte Analyse-Flaechen

- Analyse-Header und Tabs
- Overview/Kurzcheck
- Diagnose-/Coach-Tab
- Verlauf-Tab
- sichtbare Status-, Hilfs- und Panel-Titel

## Gefundene technische oder unklare Nutzertexte

- `Event-System`
- `Analysezentrum`
- `Kein Dateiexport`
- `Kein aktiver Schattenhinweis verfuegbar`
- `Legacy bleibt autoritativ, die Vorschau dient nur der Einordnung.`
- Diagnose-orientierte Tab-/Panel-Titel ohne klare naechste Aktion

## Geaenderte Dateien

- `app.js`
- `index.html`
- `src/i18n/locales/de.json`
- `src/i18n/locales/en.json`
- `src/i18n/locales/es.json`
- `test/public-text-readiness.test.js`
- `test/ui-onboarding-settings-smoke.test.js`

## UX-/Textaenderungen im Event Center

- Leerer Zustand jetzt spielerisch und ruhig: kein akutes Ereignis, Buddy meldet sich bei Auffaelligkeiten.
- Aktive und resolving-Zustaende erklaeren klarer:
  - warum jetzt
  - naechster Fokus
  - was beim Warten passieren kann
- Header und Top-Player-Copy von technischer System-Sprache auf `Grow-Lage` umgestellt.
- Alte technische Fallback-Copy aus dem sichtbaren Nutzerpfad entfernt.

## UX-/Textaenderungen in Analyse/Statistik

- Analyse-Einstieg von `Analysezentrum` auf `Run-Coach` umgestellt.
- Neue Kurzcheck-Zusammenfassung oben mit:
  - Gesamtzustand
  - staerkstem Pluspunkt
  - groesstem Bremsfaktor
  - naechster sinnvoller Aktion
- Diagnose-Tab sprachlich als Coach-Flaeche umgerahmt.
- Verlauf-Titel und Panel-Hinweise von technischer Report-Sprache auf nutzerverstaendlichen Verlauf umgestellt.
- `System` im sichtbaren Verlauf zu `Run-Update` umbenannt.

## Buddy-/Coach-Texte

- Buddy hilft jetzt in leerem Event-Zustand, bei aktiver Lage und waehrend der Auswertung kuerzer und ruhiger.
- Analyse startet mit einer kompakten Buddy-Kurzcheck-Hierarchie statt nur mit Detailblöcken.
- Keine kindische oder uebererklaerende Sprache eingefuehrt.

## Neue oder geaenderte Tests

- `test/public-text-readiness.test.js`
  - prueft Event-/Analyse-Shell auf alte technische Copy
- `test/ui-onboarding-settings-smoke.test.js`
  - prueft neue Analyse-Header-, Tab- und Verlaufstexte

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
- Keine Event-V2-Regression sichtbar.

## Offene Risiken

- Ein Teil der Analyseflaeche bleibt weiterhin in `app.js` mit gemischter Alt-/Neu-Struktur verankert; funktional stabil, aber langfristig weiter schwer wartbar.
- Die Textpolitur verbessert Hierarchie und Ton deutlich, ersetzt aber noch keinen groesseren Analyse-UX-Refactor.
- Juristische Endfreigabe aus dem separaten Legal-/Policy-Audit bleibt unveraendert offen.

## Finale Einschaetzung

`go`

Begruendung:

- Event Center und Analyse wirken spuerbar weniger technisch.
- Die erste Wahrnehmung ist jetzt coachiger und handlungsorientierter.
- Alle geforderten Gates blieben gruen.
- Event-V2, Gastmodus, Gameover, Service Worker und Encoding zeigten keine Regression.
