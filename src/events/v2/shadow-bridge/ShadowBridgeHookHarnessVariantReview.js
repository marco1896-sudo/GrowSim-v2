'use strict';

const hookHarnessVariantReview = Object.freeze({
  id: 'shadow_bridge_hook_harness_variant_review',
  phase: 62,
  variants: Object.freeze([
    Object.freeze({
      id: 'direct_browser_run_event_state_machine_call',
      recommended: false,
      risk: 'high',
      evidenceValue: 'high_but_not_safe',
      reversibility: 'poor_if_state_mutates',
      runtimeProximity: 'real_runtime_path',
      liveStateRisk: 'high',
      guardrailCompatibility: 'no',
      reason: 'direct_call_would_enter_legacy_state_machine_with_state'
    }),
    Object.freeze({
      id: 'browser_monkeypatch_legacy_state_machine',
      recommended: false,
      risk: 'medium_high',
      evidenceValue: 'distorted',
      reversibility: 'medium',
      runtimeProximity: 'modified_runtime_path',
      liveStateRisk: 'medium',
      guardrailCompatibility: 'no',
      reason: 'monkeypatch_would_distort_legacy_smoke_claim'
    }),
    Object.freeze({
      id: 'isolated_node_or_dev_hook_unit_harness',
      recommended: true,
      risk: 'low',
      evidenceValue: 'hook_unit_only',
      reversibility: 'high',
      runtimeProximity: 'isolated',
      liveStateRisk: 'low',
      guardrailCompatibility: 'yes',
      reason: 'can_prove_noop_preflight_without_live_state'
    }),
    Object.freeze({
      id: 'extract_hook_helper_from_app_js',
      recommended: false,
      risk: 'medium',
      evidenceValue: 'good_later',
      reversibility: 'medium',
      runtimeProximity: 'runtime_structure_change',
      liveStateRisk: 'low',
      guardrailCompatibility: 'not_now',
      reason: 'would_be_a_runtime_structure_change_beyond_phase_62'
    }),
    Object.freeze({
      id: 'combined_static_plus_browser_api_harness',
      recommended: true,
      risk: 'low',
      evidenceValue: 'best_current_scope',
      reversibility: 'high',
      runtimeProximity: 'near_boundary_without_trigger',
      liveStateRisk: 'low',
      guardrailCompatibility: 'yes',
      reason: 'validates_app_hook_form_and_browser_noop_behavior_without_direct_runtime_trigger'
    })
  ])
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { hookHarnessVariantReview };
}
