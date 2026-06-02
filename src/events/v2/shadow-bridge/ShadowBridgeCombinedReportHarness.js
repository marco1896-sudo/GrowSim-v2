'use strict';

(function initShadowBridgeCombinedReportHarness(globalScope) {
  const DryRun = (globalScope && globalScope.ShadowBridgeDryRun) ||
    (typeof require !== 'undefined' ? require('./ShadowBridgeDryRun.js') : null);
  const Snapshot = (globalScope && globalScope.ShadowBridgeReadOnlySnapshot) ||
    (typeof require !== 'undefined' ? require('./ShadowBridgeReadOnlySnapshot.js') : null);
  const SafetyGate = (globalScope && globalScope.ShadowBridgeCombinedSafetyGate) ||
    (typeof require !== 'undefined' ? require('./ShadowBridgeCombinedSafetyGate.js') : null);
  const CombinedResult = (globalScope && globalScope.ShadowBridgeCombinedResult) ||
    (typeof require !== 'undefined' ? require('./ShadowBridgeCombinedResult.js') : null);
  const CombinedReport = (globalScope && globalScope.ShadowBridgeCombinedReport) ||
    (typeof require !== 'undefined' ? require('./ShadowBridgeCombinedReport.js') : null);
  const WritePolicy = (globalScope && globalScope.ShadowBridgeReportWritePolicy) ||
    (typeof require !== 'undefined' ? require('./ShadowBridgeReportWritePolicy.js') : null);

  function createDefaultSnapshotInput(dryRun) {
    return {
      context: {
        simulation: { tickCount: 0, simTimeMs: 0 },
        plant: { stageIndex: 0, stageProgress: 0 },
        status: { water: 0, nutrition: 0, stress: 0 },
        setup: { mode: 'manual', type: 'diagnostic' },
        events: { activeEventId: null, machineState: 'not_connected' }
      },
      v2Diagnostics: {
        blocker: Number(dryRun.blocker || 0),
        error: Number(dryRun.error || 0),
        warning: Number(dryRun.warning || 0),
        info: Number(dryRun.info || 0),
        bridgePass: Number(dryRun.bridgePass || 0),
        bridgeWarning: Number(dryRun.bridgeWarning || 0),
        bridgeBlocked: Number(dryRun.bridgeBlocked || 0),
        eventsMapped: Number(dryRun.eventsMapped || 0),
        infoDensity: Number(dryRun.infoDensity || 0),
        budgetWarnings: Number(dryRun.budgetWarnings || 0)
      }
    };
  }

  function runShadowBridgeCombinedReportHarness(options) {
    const opts = Object.assign({
      projectRoot: typeof process !== 'undefined' ? process.cwd() : '',
      locale: 'de',
      fallbackLocale: 'en',
      formats: ['json', 'markdown'],
      writeReports: false,
      allowOverwrite: false
    }, options || {});

    const dryRun = DryRun.runShadowBridgeDryRun(opts);
    const snapshotInput = opts.snapshotInput || createDefaultSnapshotInput(dryRun);
    const snapshot = Snapshot.createShadowBridgeSnapshot(snapshotInput, {
      source: 'manual_combined_report_harness',
      locale: opts.locale,
      fallbackLocale: opts.fallbackLocale
    });
    const gate = SafetyGate.evaluateCombinedSafetyGate({ dryRun, snapshot });
    const baseResult = CombinedResult.createCombinedResult({ dryRun, snapshot, gate });
    const reports = CombinedReport.formatCombinedReports(baseResult, { formats: opts.formats });
    const writeResult = WritePolicy.writeReportsIfAllowed(opts.projectRoot, reports, {
      writeReports: opts.writeReports,
      allowOverwrite: opts.allowOverwrite,
      timestamp: opts.timestamp
    });

    return Object.assign({}, baseResult, {
      reports,
      writeResult
    });
  }

  const api = Object.freeze({
    runShadowBridgeCombinedReportHarness,
    createDefaultSnapshotInput
  });

  globalScope.ShadowBridgeCombinedReportHarness = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

