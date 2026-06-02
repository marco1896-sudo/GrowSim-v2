'use strict';

(function initShadowBridgeReportHarness(globalScope) {
  const DryRun = (globalScope && globalScope.ShadowBridgeDryRun) ||
    (typeof require !== 'undefined' ? require('./ShadowBridgeDryRun.js') : null);
  const Formatter = (globalScope && globalScope.ShadowBridgeReportFormatter) ||
    (typeof require !== 'undefined' ? require('./ShadowBridgeReportFormatter.js') : null);
  const WritePolicy = (globalScope && globalScope.ShadowBridgeReportWritePolicy) ||
    (typeof require !== 'undefined' ? require('./ShadowBridgeReportWritePolicy.js') : null);
  const HarnessResult = (globalScope && globalScope.ShadowBridgeHarnessResult) ||
    (typeof require !== 'undefined' ? require('./ShadowBridgeHarnessResult.js') : null);
  const CombinedHarness = (globalScope && globalScope.ShadowBridgeCombinedReportHarness) ||
    (typeof require !== 'undefined' ? require('./ShadowBridgeCombinedReportHarness.js') : null);

  function runShadowBridgeReportHarness(options) {
    const opts = Object.assign({
      projectRoot: typeof process !== 'undefined' ? process.cwd() : '',
      locale: 'de',
      fallbackLocale: 'en',
      formats: ['json', 'markdown'],
      writeReports: false,
      allowOverwrite: false
    }, options || {});

    const dryRun = DryRun.runShadowBridgeDryRun(opts);
    const reports = Formatter.formatReports(dryRun, { formats: opts.formats });
    const writeResult = WritePolicy.writeReportsIfAllowed(opts.projectRoot, reports, {
      writeReports: opts.writeReports,
      allowOverwrite: opts.allowOverwrite,
      timestamp: opts.timestamp
    });

    return HarnessResult.createHarnessResult({
      dryRun,
      reports,
      writeResult
    });
  }

  function runShadowBridgeCombinedReportHarness(options) {
    return CombinedHarness.runShadowBridgeCombinedReportHarness(options || {});
  }

  const api = Object.freeze({
    runShadowBridgeReportHarness,
    runShadowBridgeCombinedReportHarness
  });

  globalScope.ShadowBridgeReportHarness = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
