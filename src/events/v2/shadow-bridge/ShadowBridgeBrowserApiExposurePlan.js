'use strict';

const BROWSER_API_EXPOSURE_CONTRACT = Object.freeze({
  phase: 54,
  status: 'plan_only',
  targetGlobal: 'ShadowBridgeBrowserBridgeCandidate',
  mustExposeOnScriptLoad: true,
  mustNotAutoRegisterGuardedEntry: true,
  allowedVisibleKeys: Object.freeze([
    'registerShadowBridgeBrowserBridgeCandidate',
    'unregisterShadowBridgeBrowserBridgeCandidate',
    'createShadowBridgeBrowserBridgeCandidate',
    'getAllowedGlobalKeys',
    'metadata',
    'noop',
    'legacyAuthoritative'
  ]),
  forbiddenGlobalsOnLoad: Object.freeze([
    'ShadowBridgeGuardedEntry'
  ]),
  defaultFlags: Object.freeze({
    noop: true,
    legacyAuthoritative: true,
    defaultEnabled: false,
    automaticRegistration: false
  })
});

const RECOMMENDED_PATCH_SHAPE = Object.freeze({
  file: 'src/events/v2/shadow-bridge/ShadowBridgeBrowserBridgeCandidate.js',
  applyInPhase: 55,
  summary: 'Expose a passive browser API container on window.ShadowBridgeBrowserBridgeCandidate when window is available, without registering window.ShadowBridgeGuardedEntry.',
  guardrails: Object.freeze([
    'Do not call registerShadowBridgeBrowserBridgeCandidate during script load.',
    'Do not overwrite an existing foreign window.ShadowBridgeBrowserBridgeCandidate.',
    'Keep Node module.exports path intact.',
    'Keep window.ShadowBridgeGuardedEntry absent until explicit register call.',
    'Expose only the allowed API container keys.'
  ])
});

function getShadowBridgeBrowserApiExposurePlan() {
  return Object.freeze({
    contract: BROWSER_API_EXPOSURE_CONTRACT,
    recommendedPatch: RECOMMENDED_PATCH_SHAPE
  });
}

module.exports = {
  BROWSER_API_EXPOSURE_CONTRACT,
  RECOMMENDED_PATCH_SHAPE,
  getShadowBridgeBrowserApiExposurePlan
};
