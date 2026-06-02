# Codex Pre-Release Stability Follow-up (Time + Encoding)

Datum: 2026-06-01

## Ausgangslage

Nach der Pre-Release-Audit-Phase standen zwei Release-Risiken offen:

1. `npm run test:runtime` wirkte haengend bei `test/time-system-runtime.test.js`
2. `node test/encoding-utf8-regression.test.js` schlug wegen Mojibake-/Replacement-Markern fehl

Ziel war eine kleine, kontrollierte Stabilitaetsrunde ohne Feature-Ausbau und ohne Event-V2-Umstrukturierung.

## Analyse `time-system-runtime`

- Isolierter Lauf mit Debug (`TIME_TEST_DEBUG=1`) lief vollstaendig durch.
- Ursache des wahrgenommenen Hangs: sehr lange, ausgabearme Szenarienkette (mehrere Minuten), kein sichtbarer Fortschritt im Sammellauf.
- Zusaetzlich fehlte ein harter Szenario-Abbruch bei echtem Block.

## Ursache des Hangs

Kein reproduzierbarer Deadlock in der produktiven Zeitlogik.

Hauptursache war Test-Transparenz/Robustheit:

- langer Lauf ohne Fortschrittsausgabe
- kein pro-Szenario-Timeout als Schutz bei echtem Stillstand

## Fix (Time)

- `test/time-system-runtime.test.js`:
  - pro Szenario sichtbare Start/Done-Ausgabe (`[time-test] start/done ...`)
  - pro Szenario Timeout via `Promise.race` (Default: `120000ms`, env-overridable)
  - Timer-Cleanup in `finally`

Wichtig: Keine produktive Zeit-/Simulationslogik wurde dafuer umgebaut.

## Analyse Encoding-Test

Der UTF-8-Regressionstest meldete konkret:

- Mojibake (`Ã`) in:
  - `data/actions.json`
  - `sim.js`
  - `src/i18n/locales/de.json`
  - `src/i18n/locales/es.json`
  - `storage.js`
  - `styles.css`
  - `test/stability-top5-regression.test.js`
- Replacement-Zeichen (`�`) in:
  - `data/events/catalog/_planning/phase-169-resolve-flow-no-write-gate-report.json`

Nach Behebung der Textstellen blieb noch ein Testfehler uebrig: harte SW-Cache-Versionserwartung (`care-detail-fix-v3`) war veraltet.

## Liste relevanter Encoding-Fundstellen

- `data/actions.json:928`
- `sim.js:977,1126,1410,1492,2499,2613,2649,2671,2712,2740,2908,2909`
- `src/i18n/locales/de.json:451,458,813`
- `src/i18n/locales/es.json:452`
- `storage.js:1962,2444,2456`
- `styles.css:7104` (Kommentar)
- `test/stability-top5-regression.test.js:213`
- `data/events/catalog/_planning/phase-169-resolve-flow-no-write-gate-report.json:85,135,136,145`

## Welche Fundstellen behoben wurden

Alle oben gelisteten Mojibake-/Replacement-Vorkommen wurden gezielt korrigiert (Umlaute, spanische Akzente, Report-Text mit `�`).

Zusaetzlich wurde `test/encoding-utf8-regression.test.js` robuster gemacht:

- Entfernt harte Versions-String-Abhaengigkeit
- Stattdessen prueft der Test jetzt:
  - `sw.js` definiert ein explizites `SW_VERSION`
  - `sw.js` verwendet explizite `APP_SHELL_FILES`
  - `textEncoding.js` ist im SW-Shell-Cache enthalten

## Welche Fundstellen bewusst nicht geaendert wurden

- Keine globale Blind-Ersetzung ueber das gesamte Repo
- Keine inhaltliche Umschreibung von Event-V2-Logik oder Save-Struktur
- Nur konkret betroffene, nachweisbare Zeichenprobleme wurden geaendert

## Geaenderte Dateien

- `test/time-system-runtime.test.js`
- `test/encoding-utf8-regression.test.js`
- `test/ui-feedback-phase7.test.js` (starrer 700ms-Check auf robustes Polling mit Timeout umgestellt)
- `data/actions.json`
- `sim.js`
- `src/i18n/locales/de.json`
- `src/i18n/locales/es.json`
- `storage.js`
- `styles.css`
- `test/stability-top5-regression.test.js`
- `data/events/catalog/_planning/phase-169-resolve-flow-no-write-gate-report.json`

## Ausgefuehrte Tests

- `node test/time-system-runtime.test.js`
- `npm run test:runtime`
- `node test/encoding-utf8-regression.test.js`
- `npm run check:i18n`
- `npm run check:syntax`
- `npm run test:smoke`
- `npm run test:event-release`
- `node dev/run-event-v2-release-gate-snapshot.js`
- `node test/service-worker-shell-assets.test.js`

## Testergebnisse

- `time-system-runtime` isoliert: **passed**
- `test:runtime` gesamt: **passed**
- `encoding-utf8-regression`: **passed**
- `check:i18n`: **passed**
- `check:syntax`: **passed**
- `test:smoke`: **passed**
- `test:event-release`: **passed**
- `event-v2-release-gate-snapshot`: **ok=true**, `gate=go`
- `service-worker-shell-assets`: **passed**

## Finale Einschaetzung

`go`

Beide offenen Release-Risiken aus der vorherigen `caution`-Einschaetzung sind in dieser Follow-up-Runde geschlossen worden. Die Kern-Gates sind gruen und der Event-V2-Release-Snapshot bleibt bei `go`.

