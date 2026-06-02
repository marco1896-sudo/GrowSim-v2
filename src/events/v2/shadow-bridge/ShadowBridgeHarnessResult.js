'use strict';

(function initShadowBridgeHarnessResult(globalScope) {
  function createHarnessResult(input) {
    const data = input || {};
    const dryRun = data.dryRun || {};
    const writeResult = data.writeResult || null;

    return {
      ok: Boolean(dryRun.ok),
      safeToProceed: Boolean(dryRun.safeToProceed),
      mode: 'manual_shadow_bridge_report_harness',
      dryRun,
      reports: data.reports || {},
      writeResult,
      runtimeTouched: Boolean(dryRun.runtimeTouched),
      saveTouched: Boolean(dryRun.saveTouched),
      uiReplaced: Boolean(dryRun.uiReplaced),
      featureFlagsTouched: Boolean(dryRun.featureFlagsTouched),
      legacyEventsTouched: Boolean(dryRun.legacyEventsTouched)
    };
  }

  const api = Object.freeze({
    createHarnessResult
  });

  globalScope.ShadowBridgeHarnessResult = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

