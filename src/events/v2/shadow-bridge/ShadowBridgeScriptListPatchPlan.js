'use strict';

(function initShadowBridgeScriptListPatchPlan(moduleScope) {
  const SCRIPT_LIST_PATCH_PLAN = Object.freeze({
    phase: 'phase-44',
    status: 'plan_only',
    productivelyApplied: false,
    targetFile: 'index.html',
    targetList: 'coreScriptList',
    currentAnchor: "{ src: 'app.js' }",
    proposedCandidateScript: {
      src: 'src/events/v2/shadow-bridge/ShadowBridgeBrowserExposureCandidate.js',
      position: 'before_app_js',
      reason: 'The later app.js no-op lookup would need the browser exposure API available before app.js runs.'
    },
    dependencyStatus: {
      candidateAloneIsEnough: false,
      needsGuardedEntryRunner: true,
      recommendedNextStep: 'Prepare a browser-compatible guarded entry candidate before changing index.html.'
    },
    forbiddenInThisPhase: Object.freeze([
      'Do not edit index.html.',
      'Do not edit app.js.',
      'Do not edit sw.js.',
      'Do not create a productive script tag.',
      'Do not attach Runtime, Save, UI, or event activation.'
    ]),
    rollbackPlan: Object.freeze([
      'Remove the candidate script line from coreScriptList.',
      'Reload the shell with the updated build id.',
      'Run exposure candidate tests and combined report again.',
      'Manually verify PWA shell reload behavior before any Runtime hook.'
    ])
  });

  const api = Object.freeze({
    SCRIPT_LIST_PATCH_PLAN
  });

  if (moduleScope && moduleScope.exports) {
    moduleScope.exports = api;
  }
})(typeof module !== 'undefined' ? module : null);

