'use strict';

(function initShadowBridgeBrowserLoadingPairPlan(moduleScope) {
  const BROWSER_LOADING_PAIR_PLAN = Object.freeze({
    phase: 'phase-46',
    status: 'plan_only',
    productivelyApplied: false,
    strategy: 'two_script_pair',
    scripts: Object.freeze([
      {
        src: 'src/events/v2/shadow-bridge/ShadowBridgeBrowserGuardedEntryCandidate.js',
        order: 1,
        purpose: 'Provides a browser-safe guarded entry runner candidate.'
      },
      {
        src: 'src/events/v2/shadow-bridge/ShadowBridgeBrowserExposureCandidate.js',
        order: 2,
        purpose: 'Registers the guarded entry runner only through explicit targetWindow/options.'
      }
    ]),
    recommended: false,
    reason: 'Two separate scripts increase load-order and dependency-handoff risk before app.js.',
    wouldNeedThirdRegistrationScript: true,
    risks: Object.freeze([
      'Guarded Entry Candidate does not automatically expose itself globally.',
      'Exposure Candidate expects explicit deps and cannot discover the runner by itself.',
      'A third registration layer would be needed to connect both scripts.',
      'Three-script ordering would be fragile in the boot-critical coreScriptList.'
    ]),
    rollback: Object.freeze([
      'Remove all pair-related script lines from coreScriptList.',
      'Ship a shell update with a new build id.',
      'Run candidate tests and combined report again.'
    ])
  });

  const api = Object.freeze({
    BROWSER_LOADING_PAIR_PLAN
  });

  if (moduleScope && moduleScope.exports) {
    moduleScope.exports = api;
  }
})(typeof module !== 'undefined' ? module : null);

