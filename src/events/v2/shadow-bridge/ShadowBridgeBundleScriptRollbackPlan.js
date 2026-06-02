'use strict';

(function initShadowBridgeBundleScriptRollbackPlan(moduleScope) {
  const BUNDLE_SCRIPT_ROLLBACK_PLAN = Object.freeze({
    phase: 'phase-48',
    status: 'plan_only',
    triggerScenarios: Object.freeze([
      'bundle script 404 or timeout',
      'boot error banner for bridge candidate',
      'candidate tests fail after script planning',
      'combined report no longer passes',
      'manual PWA reload/update check fails'
    ]),
    rollbackSteps: Object.freeze([
      'Remove the single ShadowBridgeBrowserBridgeCandidate.js line from coreScriptList.',
      'Ship a shell update with a new build id.',
      'Run browser bridge candidate tests.',
      'Run comparison smoke.',
      'Run combined report.',
      'Run guarded entry contract tests.',
      'Manually verify first load, reload, and PWA shell update behavior.'
    ]),
    swChangeRequiredForRollback: false
  });

  const api = Object.freeze({
    BUNDLE_SCRIPT_ROLLBACK_PLAN
  });

  if (moduleScope && moduleScope.exports) {
    moduleScope.exports = api;
  }
})(typeof module !== 'undefined' ? module : null);

