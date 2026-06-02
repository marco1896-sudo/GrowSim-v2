'use strict';

const PASSIVE_REGISTRATION_READINESS = Object.freeze({
  phase: 56,
  status: 'review_only',
  browserApiContainerVisible: true,
  guardedEntryAutoRegistered: false,
  explicitRegistrationWorks: true,
  noopCallWorks: true,
  negativeCaseBlocks: true,
  unregisterWorks: true,
  foreignGlobalProtectionWorks: true,
  storageWrites: 0,
  pageErrors: 0,
  consoleErrors: 0,
  uiTouched: false,
  eventActivated: false,
  legacyAuthoritative: true,
  appJsHookExists: false,
  liveStateAccess: false,
  recommendedNextStep: 'minimal_app_js_noop_hook_plan_refresh'
});

const REGISTRATION_STRATEGY_REVIEW = Object.freeze([
  Object.freeze({
    id: 'manual_smoke_only',
    risk: 'lowest',
    reversibility: 'high',
    debugability: 'high',
    runtimeRisk: 'none',
    pwaShellImpact: 'none_additional',
    noOpLegacyCompatibility: 'excellent',
    recommended: true,
    note: 'Keep as current safe baseline and regression check.'
  }),
  Object.freeze({
    id: 'future_minimal_app_js_noop_hook_registration',
    risk: 'medium',
    reversibility: 'single_hook_removal_if_kept_tiny',
    debugability: 'medium_high',
    runtimeRisk: 'present_but_controllable_if_no_state_no_return_usage',
    pwaShellImpact: 'none_additional',
    noOpLegacyCompatibility: 'good_if_default_off',
    recommended: true,
    note: 'Only as a future plan refresh, not implementation in Phase 56.'
  }),
  Object.freeze({
    id: 'automatic_registration_on_script_load',
    risk: 'high',
    reversibility: 'lower',
    debugability: 'medium_low',
    runtimeRisk: 'global_side_effect_on_shell_load',
    pwaShellImpact: 'higher',
    noOpLegacyCompatibility: 'weak',
    recommended: false,
    note: 'Forbidden because registration becomes a script-load side effect.'
  }),
  Object.freeze({
    id: 'separate_registration_file',
    risk: 'medium',
    reversibility: 'moderate',
    debugability: 'medium',
    runtimeRisk: 'low_if_passive_but_extra_loading_surface',
    pwaShellImpact: 'higher_due_to_extra_script',
    noOpLegacyCompatibility: 'possible',
    recommended: false,
    note: 'Avoids app.js but reintroduces multi-script complexity.'
  }),
  Object.freeze({
    id: 'user_action_or_dev_only_trigger',
    risk: 'low_medium',
    reversibility: 'high',
    debugability: 'high',
    runtimeRisk: 'low_if_dev_only',
    pwaShellImpact: 'none_additional',
    noOpLegacyCompatibility: 'good',
    recommended: true,
    note: 'Useful for manual diagnostics, not a runtime bridge yet.'
  })
]);

function getShadowBridgePassiveRegistrationReadinessReview() {
  return Object.freeze({
    readiness: PASSIVE_REGISTRATION_READINESS,
    variants: REGISTRATION_STRATEGY_REVIEW
  });
}

module.exports = {
  PASSIVE_REGISTRATION_READINESS,
  REGISTRATION_STRATEGY_REVIEW,
  getShadowBridgePassiveRegistrationReadinessReview
};
