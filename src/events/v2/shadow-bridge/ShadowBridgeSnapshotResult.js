'use strict';

(function initShadowBridgeSnapshotResult(globalScope) {
  function countDiagnostics(diagnostics, severity) {
    return (diagnostics || []).filter((item) => item && item.severity === severity).length;
  }

  function createSnapshotResult(snapshot, validation, sanitizerDiagnostics) {
    const validationDiagnostics = validation && Array.isArray(validation.diagnostics) ? validation.diagnostics : [];
    const inputDiagnostics = Array.isArray(sanitizerDiagnostics) ? sanitizerDiagnostics : [];
    const diagnostics = inputDiagnostics.concat(validationDiagnostics);
    const ok = Boolean(validation && validation.ok);
    const safeToProceed = Boolean(validation && validation.safeToProceed);

    return {
      ok,
      safeToProceed,
      status: safeToProceed ? 'snapshot_noop_pass' : 'snapshot_noop_blocked',
      abortReason: safeToProceed ? null : ((validation && validation.abortReason) || 'snapshot_failed'),
      noop: Boolean(snapshot && snapshot.guardrails && snapshot.guardrails.noop),
      legacyAuthoritative: Boolean(snapshot && snapshot.guardrails && snapshot.guardrails.legacyAuthoritative),
      runtimeTouched: Boolean(snapshot && snapshot.guardrails && snapshot.guardrails.runtimeTouched),
      saveTouched: Boolean(snapshot && snapshot.guardrails && snapshot.guardrails.saveTouched),
      uiReplaced: Boolean(snapshot && snapshot.guardrails && snapshot.guardrails.uiReplaced),
      featureFlagsTouched: Boolean(snapshot && snapshot.guardrails && snapshot.guardrails.featureFlagsTouched),
      legacyEventsTouched: Boolean(snapshot && snapshot.guardrails && snapshot.guardrails.legacyEventsTouched),
      eventActivated: Boolean(snapshot && snapshot.guardrails && snapshot.guardrails.eventActivated),
      blocker: countDiagnostics(diagnostics, 'blocker'),
      error: countDiagnostics(diagnostics, 'error'),
      warning: countDiagnostics(diagnostics, 'warning'),
      info: countDiagnostics(diagnostics, 'info'),
      snapshot,
      diagnostics,
      validation: validation || null
    };
  }

  const api = Object.freeze({
    createSnapshotResult
  });

  globalScope.ShadowBridgeSnapshotResult = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

