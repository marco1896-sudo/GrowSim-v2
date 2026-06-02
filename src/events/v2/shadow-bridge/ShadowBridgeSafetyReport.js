'use strict';

(function initShadowBridgeSafetyReport(globalScope) {
  function createSafetyReport(flags) {
    const safeFlags = Object.assign({
      runtimeTouched: false,
      saveTouched: false,
      uiReplaced: false,
      featureFlagsTouched: false,
      legacyEventsTouched: false
    }, flags || {});

    const violations = Object.keys(safeFlags).filter((key) => safeFlags[key] === true);
    return {
      ok: violations.length === 0,
      noopConfirmed: violations.length === 0,
      runtimeUntouched: !safeFlags.runtimeTouched,
      saveUntouched: !safeFlags.saveTouched,
      uiUntouched: !safeFlags.uiReplaced,
      featureFlagsUntouched: !safeFlags.featureFlagsTouched,
      legacyEventsUntouched: !safeFlags.legacyEventsTouched,
      violations,
      abortReason: violations.length > 0 ? 'guardrail_violation' : null,
      flags: safeFlags
    };
  }

  const api = Object.freeze({
    createSafetyReport
  });

  globalScope.ShadowBridgeSafetyReport = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

