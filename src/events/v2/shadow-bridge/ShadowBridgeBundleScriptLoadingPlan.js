'use strict';

(function initShadowBridgeBundleScriptLoadingPlan(moduleScope) {
  const BUNDLE_SCRIPT_LOADING_PLAN = Object.freeze({
    phase: 'phase-48',
    status: 'plan_only',
    productivelyApplied: false,
    targetFile: 'index.html',
    targetList: 'coreScriptList',
    proposedScript: Object.freeze({
      src: 'src/events/v2/shadow-bridge/ShadowBridgeBrowserBridgeCandidate.js',
      position: 'directly_before_app_js',
      versionedByLoader: true,
      expectedRuntimeUrl: 'src/events/v2/shadow-bridge/ShadowBridgeBrowserBridgeCandidate.js?v=<buildId>'
    }),
    anchor: "{ src: 'app.js' }",
    reason: 'A later defensive app.js lookup would need the bundle candidate loaded before app.js runs.',
    forbiddenInThisPhase: Object.freeze([
      'Do not edit index.html.',
      'Do not edit app.js.',
      'Do not edit sw.js.',
      'Do not add a productive script tag.',
      'Do not attach runtime, save, UI, or event activation.'
    ])
  });

  const api = Object.freeze({
    BUNDLE_SCRIPT_LOADING_PLAN
  });

  if (moduleScope && moduleScope.exports) {
    moduleScope.exports = api;
  }
})(typeof module !== 'undefined' ? module : null);

