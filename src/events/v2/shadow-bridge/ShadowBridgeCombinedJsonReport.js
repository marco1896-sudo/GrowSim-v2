'use strict';

(function initShadowBridgeCombinedJsonReport(globalScope) {
  function toJsonObject(combinedResult) {
    const result = combinedResult || {};
    const dryRun = result.dryRun || {};
    const snapshot = result.snapshot || {};
    return {
      ok: Boolean(result.ok),
      safeToProceed: Boolean(result.safeToProceed),
      combinedStatus: result.combinedStatus || 'blocked',
      runtimeTouched: Boolean(result.runtimeTouched),
      saveTouched: Boolean(result.saveTouched),
      uiReplaced: Boolean(result.uiReplaced),
      featureFlagsTouched: Boolean(result.featureFlagsTouched),
      legacyEventsTouched: Boolean(result.legacyEventsTouched),
      eventActivated: Boolean(result.eventActivated),
      legacyAuthoritative: Boolean(result.legacyAuthoritative),
      noop: Boolean(result.noop),
      blocker: Number(result.blocker || 0),
      error: Number(result.error || 0),
      warning: Number(result.warning || 0),
      info: Number(result.info || 0),
      abortReason: result.abortReason || null,
      dryRun: {
        ok: Boolean(dryRun.ok),
        safeToProceed: Boolean(dryRun.safeToProceed),
        eventsMapped: Number(dryRun.eventsMapped || 0),
        bridgePass: Number(dryRun.bridgePass || 0),
        bridgeWarning: Number(dryRun.bridgeWarning || 0),
        bridgeBlocked: Number(dryRun.bridgeBlocked || 0),
        blocker: Number(dryRun.blocker || 0),
        error: Number(dryRun.error || 0),
        warning: Number(dryRun.warning || 0),
        info: Number(dryRun.info || 0),
        infoDensity: Number(dryRun.infoDensity || 0),
        budgetWarnings: Number(dryRun.budgetWarnings || 0)
      },
      snapshot: {
        ok: Boolean(snapshot.ok),
        safeToProceed: Boolean(snapshot.safeToProceed),
        noop: Boolean(snapshot.noop),
        legacyAuthoritative: Boolean(snapshot.legacyAuthoritative),
        blocker: Number(snapshot.blocker || 0),
        error: Number(snapshot.error || 0),
        warning: Number(snapshot.warning || 0),
        info: Number(snapshot.info || 0)
      },
      gateFailures: result.gate && Array.isArray(result.gate.failures) ? result.gate.failures : []
    };
  }

  function toJsonString(combinedResult) {
    return JSON.stringify(toJsonObject(combinedResult), null, 2);
  }

  const api = Object.freeze({
    toJsonObject,
    toJsonString
  });

  globalScope.ShadowBridgeCombinedJsonReport = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

