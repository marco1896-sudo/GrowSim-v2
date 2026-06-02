'use strict';

(function initShadowBridgeCombinedResult(globalScope) {
  function createCombinedResult(input) {
    const data = input || {};
    const dryRun = data.dryRun || {};
    const snapshot = data.snapshot || {};
    const gate = data.gate || {};

    return {
      ok: Boolean(gate.ok),
      safeToProceed: Boolean(gate.safeToProceed),
      combinedStatus: gate.combinedStatus || 'blocked',
      mode: 'manual_shadow_bridge_combined_report',
      dryRun,
      snapshot,
      gate,
      reports: data.reports || {},
      runtimeTouched: Boolean(dryRun.runtimeTouched || snapshot.runtimeTouched),
      saveTouched: Boolean(dryRun.saveTouched || snapshot.saveTouched),
      uiReplaced: Boolean(dryRun.uiReplaced || snapshot.uiReplaced),
      featureFlagsTouched: Boolean(dryRun.featureFlagsTouched || snapshot.featureFlagsTouched),
      legacyEventsTouched: Boolean(dryRun.legacyEventsTouched || snapshot.legacyEventsTouched),
      eventActivated: Boolean(dryRun.eventActivated || snapshot.eventActivated),
      legacyAuthoritative: Boolean(snapshot.legacyAuthoritative),
      noop: Boolean(snapshot.noop),
      blocker: Number(gate.blocker || 0),
      error: Number(gate.error || 0),
      warning: Number(gate.warning || 0),
      info: Number(gate.info || 0),
      abortReason: gate.ok ? null : 'combined_safety_gate_failed'
    };
  }

  const api = Object.freeze({
    createCombinedResult
  });

  globalScope.ShadowBridgeCombinedResult = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

