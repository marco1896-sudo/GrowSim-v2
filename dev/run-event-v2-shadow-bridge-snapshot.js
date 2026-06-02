'use strict';

const Snapshot = require('../src/events/v2/shadow-bridge/ShadowBridgeReadOnlySnapshot.js');
const Report = require('../src/events/v2/shadow-bridge/ShadowBridgeSnapshotReport.js');

const result = Snapshot.createShadowBridgeSnapshot({
  context: {
    simulation: {
      tickCount: 128,
      simTimeMs: 384000
    },
    plant: {
      stageIndex: 2,
      stageProgress: 0.42
    },
    status: {
      water: 74,
      nutrition: 61,
      stress: 8
    },
    setup: {
      mode: 'indoor',
      type: 'soil'
    },
    events: {
      activeEventId: null,
      machineState: 'idle'
    }
  },
  v2Diagnostics: {
    blocker: 0,
    error: 0,
    warning: 0,
    info: 4,
    bridgePass: 12,
    bridgeWarning: 0,
    bridgeBlocked: 0,
    eventsMapped: 12,
    infoDensity: 0.33,
    budgetWarnings: 0
  }
}, {
  source: 'manual_dev_snapshot_smoke',
  locale: 'de',
  fallbackLocale: 'en'
});

if (process.argv.includes('--markdown')) {
  console.log(Report.formatSnapshotMarkdown(result));
} else {
  console.log(JSON.stringify(Report.createSnapshotReportData(result), null, 2));
}

