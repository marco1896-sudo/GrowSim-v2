# Care Studio Moisture/Risk Consistency Fix

## Ausgangsproblem

Care Studio konnte widerspruechliche Werte anzeigen: ein niedriger globaler Feuchtewert im Header, gleichzeitig hohe Oberflaechen-/Wurzelzonenfeuchte im Feuchteprofil, eine Warnung vor zu feuchter Wurzelzone und trotzdem niedriges Risiko.

## Ursache

Der Header las Feuchte und Risiko aus `state.status.water` und `state.status.risk`. Feuchteprofil, Warnbox, Giessempfehlung und Diagnose lasen dagegen aus `state.care.water` und der daraus abgeleiteten Care-Summary. Dadurch konnten UI-Bereiche denselben Pflegezustand aus unterschiedlichen Quellen bewerten.

## Fix

- `src/simulation/careModel.js`
  - Care-Summary erweitert um:
    - `displayMoisture`
    - `riskScore`
    - `rootZoneRiskScore`
  - `riskLevel` wird fuer Care Studio aus Care-Druckwerten abgeleitet: Trockenstress, Wurzelzonenfeuchte/Root-Zone-Druck und Salzlast.

- `src/ui/mappings/careMapping.js`
  - Care-Studio-Header nutzt fuer Feuchte und Risiko die Care-Summary statt blind `state.status.water/risk`.
  - Versorgung und Stress bleiben globaler Status, weil diese Werte nicht aus dem Feuchteprofil abgeleitet werden.

- `app.js`
  - Feuchte-Chip nutzt `moistureBand` fuer Ton/Detail.
  - Wurzelrisiko-Miniwert nutzt `rootZoneRiskScore`, damit hohe Wurzelzonenfeuchte nicht mehr als 0% wirkt.

- `test/care-studio-runtime.test.js`
  - Erwartung auf Care-Summary-Quelle angepasst.

- `test/care-studio-moisture-risk-consistency.test.js`
  - Neuer dev-only Smoke fuer:
    - Oberflaeche hoch, Wurzelzone hoch
    - Oberflaeche trocken, Wurzelzone feucht
    - Oberflaeche trocken, Wurzelzone trocken

## Eventsystem-Pruefung

Event V2 und die Event-Trigger wurden nicht umverdrahtet. Die Eventdruck-/Eligibility-Pfade lesen weiterhin `state.status.water`, `state.status.risk`, Stress, Klima und Event-eigene Snapshots. Die neue Care-Summary-Ableitung wird fuer Care-Studio-Anzeige und Diagnose verwendet, nicht als Event-Trigger-Quelle.

Auswirkung:

- Keine Aenderung an Event-Wahrscheinlichkeiten.
- Keine Aenderung an Event-V2-Daten.
- Keine Aenderung an Eventtexten.
- Keine Savegame-Migration.
- Keine Offline-/Night-/Tick-Aenderung.

## Tests

- `node test/care-studio-moisture-risk-consistency.test.js` - passed
- `node test/care-studio-runtime.test.js` - passed
- `node --check src/simulation/careModel.js; node --check src/ui/mappings/careMapping.js; node --check app.js` - passed
- `node test/care-model-preview.test.js` - passed
- `node test/care-trends.test.js` - passed
- `node test/ui-care-sheet-regression.test.js` - passed
- `node test/care-studio-de-locale.test.js` - passed
- `npm run check:i18n` - passed
- `npm run test:event-release` - passed
- `node test/event-realism-runtime.test.js` - passed
- `node test/event-resume-reconciliation-runtime.test.js` - passed
- `node dev/run-event-v2-release-gate-snapshot.js` - passed, `gate: go`
- `npm run test:smoke` - passed

## Release Gate

go
