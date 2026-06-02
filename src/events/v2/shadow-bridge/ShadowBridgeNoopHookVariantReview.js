'use strict';

const NOOP_HOOK_VARIANTS = Object.freeze([
  Object.freeze({
    id: 'variant_a_api_availability_check_only',
    summary: 'Check only whether window.ShadowBridgeBrowserBridgeCandidate exists, then return.',
    risk: 'lowest',
    reversibility: 'trivial',
    debugability: 'medium',
    runtimeRisk: 'very_low',
    provesRegistrationPath: false,
    noOpLegacyCompatibility: 'excellent',
    recommendedForPhase58: false,
    rationale: 'Too passive to validate the new registration boundary; useful only as an ultra-conservative fallback.'
  }),
  Object.freeze({
    id: 'variant_b_explicit_register_then_noop_call',
    summary: 'Defensively register via the browser API, call GuardedEntry with enabled=false, ignore all results.',
    risk: 'medium_but_bounded',
    reversibility: 'single_call_and_helper_removal',
    debugability: 'high',
    runtimeRisk: 'controlled_if_no_state_and_no_return_usage',
    provesRegistrationPath: true,
    noOpLegacyCompatibility: 'good_when_guarded',
    recommendedForPhase58: true,
    rationale: 'Best next review target because Phase 55/56 proved explicit registration and no-op behavior in browser smoke.'
  })
]);

function getShadowBridgeNoopHookVariantReview() {
  return NOOP_HOOK_VARIANTS.slice();
}

module.exports = {
  NOOP_HOOK_VARIANTS,
  getShadowBridgeNoopHookVariantReview
};
