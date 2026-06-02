# Event V2 Shadow-Bridge (Planning Boundary)

Diese Dateien definieren nur die Boundary- und Guardrail-Vertraege fuer die erste spaetere read-only Shadow-Bridge.

Wichtig:
- Keine Runtime-Imports.
- Keine Save-Mutationen.
- Keine Eventaktivierung.
- Keine UI-Ersetzung.

Zweck:
- Integrationsrisiken vor der ersten Runtime-Beruehrung minimieren.
- No-Op/Dry-Run Regeln formalisieren.

Manueller Dry-Run:
```js
const dryRun = require('./src/events/v2/shadow-bridge/ShadowBridgeDryRun.js');
const result = dryRun.runShadowBridgeDryRun({ projectRoot: process.cwd() });
```

Der Dry-Run darf nur manuell aufgerufen werden und bleibt ohne App-Start-, Tick- oder UI-Anbindung.

Manueller Report-Harness:
```js
const harness = require('./src/events/v2/shadow-bridge/ShadowBridgeReportHarness.js');
const result = harness.runShadowBridgeReportHarness({
  projectRoot: process.cwd(),
  writeReports: false
});
```

Optional:
- `node dev/run-event-v2-shadow-bridge-report.js`
- `node dev/run-event-v2-shadow-bridge-report.js --markdown`
- `node dev/run-event-v2-shadow-bridge-report.js --write`

Reports werden nur mit `--write` erzeugt und duerfen nur unter `docs/event-system-v2/generated/` landen.

Manueller Read-only Snapshot-Smoke:
```js
const snapshot = require('./src/events/v2/shadow-bridge/ShadowBridgeReadOnlySnapshot.js');
const result = snapshot.createShadowBridgeSnapshot({
  context: {
    simulation: { tickCount: 1, simTimeMs: 1000 },
    plant: { stageIndex: 1, stageProgress: 0.25 },
    status: { water: 70, nutrition: 55, stress: 5 },
    setup: { mode: 'indoor', type: 'soil' },
    events: { activeEventId: null, machineState: 'idle' }
  }
});
```

Optional:
- `node dev/run-event-v2-shadow-bridge-snapshot.js`
- `node dev/run-event-v2-shadow-bridge-snapshot.js --markdown`

Der Snapshot-Prototyp nutzt nur explizit uebergebenen Input, kopiert erlaubte Felder und bestaetigt No-Op-, Legacy-Authority- und Guardrail-Flags.

Manueller Combined Report:
```js
const combined = require('./src/events/v2/shadow-bridge/ShadowBridgeCombinedReportHarness.js');
const result = combined.runShadowBridgeCombinedReportHarness({
  projectRoot: process.cwd(),
  writeReports: false
});
```

Optional:
- `node dev/run-event-v2-shadow-bridge-combined-report.js`
- `node dev/run-event-v2-shadow-bridge-combined-report.js --markdown`
- `node dev/run-event-v2-shadow-bridge-combined-report.js --write`

Der Combined Report kombiniert Dry-Run und Snapshot. Er blockt, wenn einer der beiden Pfade nicht gruen ist oder wenn Runtime-, Save-, UI-, Feature-Flag-, Legacy- oder Eventaktivierungs-Guardrails verletzt werden.
