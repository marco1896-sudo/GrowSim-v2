'use strict';

(function initShadowBridgeDryRunResult(globalScope) {
  function createShadowBridgeDryRunResult(input) {
    const data = input || {};
    const safety = data.safetyReport || {};
    const diagnostics = data.diagnostics || {};
    const ok = Boolean(data.catalogOk && data.mappingOk && safety.ok);
    const safeToProceed = ok &&
      Number(diagnostics.blocker || 0) === 0 &&
      Number(diagnostics.error || 0) === 0 &&
      Number(diagnostics.warning || 0) === 0 &&
      Number(diagnostics.budgetWarnings || 0) === 0;

    return {
      ok,
      safeToProceed,
      mode: 'manual_read_only_dry_run',
      status: safeToProceed ? 'noop_pass' : 'noop_blocked',
      runtimeTouched: false,
      saveTouched: false,
      uiReplaced: false,
      featureFlagsTouched: false,
      legacyEventsTouched: false,
      eventsMapped: Number(data.eventsMapped || 0),
      bridgePass: Number(diagnostics.bridgePass || 0),
      bridgeWarning: Number(diagnostics.bridgeWarning || 0),
      bridgeBlocked: Number(diagnostics.bridgeBlocked || 0),
      blocker: Number(diagnostics.blocker || 0),
      error: Number(diagnostics.error || 0),
      warning: Number(diagnostics.warning || 0),
      info: Number(diagnostics.info || 0),
      infoDensity: Number(diagnostics.infoDensity || 0),
      budgetWarnings: Number(diagnostics.budgetWarnings || 0),
      catalogProbe: data.catalogProbe || null,
      mappingProbe: data.mappingProbe || null,
      safetyReport: safety,
      abortReason: safeToProceed ? null : (safety.abortReason || 'dry_run_gate_failed')
    };
  }

  const api = Object.freeze({
    createShadowBridgeDryRunResult
  });

  globalScope.ShadowBridgeDryRunResult = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

