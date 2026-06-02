'use strict';

(function initShadowBridgeBundleLoadingReadinessReview(moduleScope) {
  const GATE_REVIEW = Object.freeze({
    phase: 'phase-49',
    status: 'review_only',
    phase50Recommendation: 'go_for_first_script_tag_only',
    productivelyApplied: false,
    gates: Object.freeze([
      { id: 'bundleCandidateTestsGreen', required: true, expected: true },
      { id: 'comparisonSmokeGreen', required: true, expected: true },
      { id: 'combinedReportGreen', required: true, expected: true },
      { id: 'guardedEntryContractTestsGreen', required: true, expected: true },
      { id: 'syntaxcheckGreen', required: true, expected: true },
      { id: 'pwaShellRiskAccepted', required: true, expected: true, riskLevel: 'medium' },
      { id: 'rollbackDocumented', required: true, expected: true },
      { id: 'noAutomaticGlobalRegistration', required: true, expected: true },
      { id: 'noEventActivation', required: true, expected: true },
      { id: 'noSave', required: true, expected: true },
      { id: 'noUi', required: true, expected: true },
      { id: 'noHook', required: true, expected: true },
      { id: 'noLiveState', required: true, expected: true }
    ]),
    restrictionsForPhase50: Object.freeze([
      'Only add the single bundle candidate script line.',
      'Do not edit app.js.',
      'Do not edit sw.js.',
      'Do not add a hook.',
      'Do not activate events.',
      'Do not read live state.',
      'Do not touch save or UI.'
    ])
  });

  const api = Object.freeze({
    GATE_REVIEW
  });

  if (moduleScope && moduleScope.exports) {
    moduleScope.exports = api;
  }
})(typeof module !== 'undefined' ? module : null);

