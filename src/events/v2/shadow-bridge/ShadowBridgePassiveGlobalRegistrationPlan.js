'use strict';

const REGISTRATION_STRATEGY_DECISION = Object.freeze({
  phase: 52,
  status: 'plan_only',
  recommendedNextStep: 'manual_browser_global_registration_smoke',
  automaticRegistrationOnLoadAllowed: false,
  appJsRegistrationAllowedNow: false,
  runtimeHookAllowedNow: false,
  defaultMode: 'disabled_noop',
  requiredOptionsForFutureRegistration: Object.freeze({
    enabled: true,
    allowGlobalRegistration: true
  })
});

const REGISTRATION_VARIANTS = Object.freeze([
  Object.freeze({
    id: 'no_registration_candidate_loaded_only',
    risk: 'lowest',
    reversibility: 'trivial',
    debugability: 'limited_but_safe',
    runtimeRisk: 'none',
    pwaShellImpact: 'already_accepted_script_load_only',
    noOpCompatibility: 'excellent',
    recommended: true,
    phaseUse: 'current_default'
  }),
  Object.freeze({
    id: 'manual_dev_console_or_smoke_registration',
    risk: 'low',
    reversibility: 'explicit_unregister',
    debugability: 'high',
    runtimeRisk: 'none_if_mock_or_manual_only',
    pwaShellImpact: 'none_additional',
    noOpCompatibility: 'excellent',
    recommended: true,
    phaseUse: 'phase_53_candidate'
  }),
  Object.freeze({
    id: 'separate_passive_registration_function_not_auto_executed',
    risk: 'low_medium',
    reversibility: 'explicit_unregister',
    debugability: 'high',
    runtimeRisk: 'low_if_unhooked',
    pwaShellImpact: 'possible_future_script_or_existing_candidate_api_only',
    noOpCompatibility: 'good',
    recommended: true,
    phaseUse: 'future_design_option'
  }),
  Object.freeze({
    id: 'automatic_registration_on_script_load',
    risk: 'high',
    reversibility: 'harder_after_shell_load',
    debugability: 'medium',
    runtimeRisk: 'unnecessary_global_side_effect',
    pwaShellImpact: 'higher_shell_side_effect_risk',
    noOpCompatibility: 'weak',
    recommended: false,
    phaseUse: 'forbidden'
  }),
  Object.freeze({
    id: 'registration_via_future_app_js_hook',
    risk: 'medium_high_now',
    reversibility: 'single_hook_removal_if_done_later',
    debugability: 'medium',
    runtimeRisk: 'touches_runtime_boundary',
    pwaShellImpact: 'none_additional_but_runtime_risk',
    noOpCompatibility: 'possible_but_not_yet',
    recommended: false,
    phaseUse: 'not_before_dedicated_hook_review'
  })
]);

function getShadowBridgePassiveGlobalRegistrationPlan() {
  return Object.freeze({
    decision: REGISTRATION_STRATEGY_DECISION,
    variants: REGISTRATION_VARIANTS
  });
}

module.exports = {
  REGISTRATION_STRATEGY_DECISION,
  REGISTRATION_VARIANTS,
  getShadowBridgePassiveGlobalRegistrationPlan
};
