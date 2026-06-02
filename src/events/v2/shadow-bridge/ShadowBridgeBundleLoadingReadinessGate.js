'use strict';

(function initShadowBridgeBundleLoadingReadinessGate(moduleScope) {
  const REQUIRED_GATE_IDS = Object.freeze([
    'bundleCandidateTestsGreen',
    'comparisonSmokeGreen',
    'combinedReportGreen',
    'guardedEntryContractTestsGreen',
    'syntaxcheckGreen',
    'pwaShellRiskAccepted',
    'rollbackDocumented',
    'noAutomaticGlobalRegistration',
    'noEventActivation',
    'noSave',
    'noUi',
    'noRuntimeHook',
    'noLiveState'
  ]);

  function evaluateBundleLoadingReadiness(input) {
    const data = input && typeof input === 'object' ? input : {};
    const checks = REQUIRED_GATE_IDS.map((id) => ({
      id,
      passed: data[id] === true
    }));
    const failed = checks.filter((item) => item.passed !== true);
    return Object.freeze({
      ok: failed.length === 0,
      readyForScriptTagProposal: failed.length === 0,
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
      failedCheckIds: failed.map((item) => item.id),
      checks: Object.freeze(checks)
    });
  }

  const api = Object.freeze({
    REQUIRED_GATE_IDS,
    evaluateBundleLoadingReadiness
  });

  if (moduleScope && moduleScope.exports) {
    moduleScope.exports = api;
  }
})(typeof module !== 'undefined' ? module : null);

