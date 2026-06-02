'use strict';

(function initShadowBridgeJsonReport(globalScope) {
  function toJsonObject(dryRunResult) {
    const result = dryRunResult || {};
    return {
      ok: Boolean(result.ok),
      safeToProceed: Boolean(result.safeToProceed),
      status: result.status || 'unknown',
      runtimeTouched: Boolean(result.runtimeTouched),
      saveTouched: Boolean(result.saveTouched),
      uiReplaced: Boolean(result.uiReplaced),
      featureFlagsTouched: Boolean(result.featureFlagsTouched),
      legacyEventsTouched: Boolean(result.legacyEventsTouched),
      eventsMapped: Number(result.eventsMapped || 0),
      bridgePass: Number(result.bridgePass || 0),
      bridgeWarning: Number(result.bridgeWarning || 0),
      bridgeBlocked: Number(result.bridgeBlocked || 0),
      blocker: Number(result.blocker || 0),
      error: Number(result.error || 0),
      warning: Number(result.warning || 0),
      info: Number(result.info || 0),
      infoDensity: Number(result.infoDensity || 0),
      budgetWarnings: Number(result.budgetWarnings || 0),
      abortReason: result.abortReason || null
    };
  }

  function toJsonString(dryRunResult) {
    return JSON.stringify(toJsonObject(dryRunResult), null, 2);
  }

  function toCombinedJsonObject(combinedResult) {
    const CombinedJson = (globalScope && globalScope.ShadowBridgeCombinedJsonReport) ||
      (typeof require !== 'undefined' ? require('./ShadowBridgeCombinedJsonReport.js') : null);
    return CombinedJson.toJsonObject(combinedResult);
  }

  function toCombinedJsonString(combinedResult) {
    const CombinedJson = (globalScope && globalScope.ShadowBridgeCombinedJsonReport) ||
      (typeof require !== 'undefined' ? require('./ShadowBridgeCombinedJsonReport.js') : null);
    return CombinedJson.toJsonString(combinedResult);
  }

  const api = Object.freeze({
    toJsonObject,
    toJsonString,
    toCombinedJsonObject,
    toCombinedJsonString
  });

  globalScope.ShadowBridgeJsonReport = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
