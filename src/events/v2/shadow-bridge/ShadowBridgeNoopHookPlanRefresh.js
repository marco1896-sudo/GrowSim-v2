'use strict';

const NOOP_HOOK_PLAN_REFRESH = Object.freeze({
  phase: 57,
  status: 'plan_only',
  recommendedHookLocation: 'app.js:function runEventStateMachine(nowMs):function_start',
  recommendedVariant: 'variant_b_explicit_register_then_noop_call',
  implementationAllowedInPhase57: false,
  appJsPatchAllowedInPhase57: false,
  legacyAuthoritative: true,
  liveStateAllowed: false,
  returnValueUsed: false,
  saveAllowed: false,
  uiAllowed: false,
  eventActivationAllowed: false,
  automaticRegistrationOnScriptLoadAllowed: false
});

const UPDATED_HOOK_REQUIREMENTS = Object.freeze([
  'lookup window.ShadowBridgeBrowserBridgeCandidate defensively',
  'return immediately if API container is missing',
  'register only with enabled=true and allowGlobalRegistration=true',
  'do not pass live state',
  'call runShadowBridgeGuardedEntry with input=null and enabled=false only',
  'ignore all return values',
  'wrap all bridge operations in try/catch',
  'always continue legacy event flow',
  'rollback by removing one call and one helper'
]);

function getShadowBridgeNoopHookPlanRefresh() {
  return Object.freeze({
    plan: NOOP_HOOK_PLAN_REFRESH,
    requirements: UPDATED_HOOK_REQUIREMENTS
  });
}

module.exports = {
  NOOP_HOOK_PLAN_REFRESH,
  UPDATED_HOOK_REQUIREMENTS,
  getShadowBridgeNoopHookPlanRefresh
};
