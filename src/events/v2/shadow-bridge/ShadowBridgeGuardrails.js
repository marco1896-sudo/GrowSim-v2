'use strict';

(function initShadowBridgeGuardrails(globalScope) {
  const SHADOW_BRIDGE_GUARDRAILS = Object.freeze({
    runtimeIntegration: 'forbidden',
    saveMutation: 'forbidden',
    uiReplacement: 'forbidden',
    eventActivation: 'forbidden',
    featureFlagMutation: 'forbidden',
    automaticExecution: 'forbidden',
    tickLoopWiring: 'forbidden',
    legacyAuthority: 'preserved',
    allowedExecution: Object.freeze([
      'manual_dry_run_only',
      'adapter_mapping_only',
      'diagnostics_only',
      'noop_result_only'
    ]),
    abortCriteria: Object.freeze([
      'any_blocker_or_error_diagnostic',
      'any_warning_in_required_bridge_gate',
      'any_write_attempt_to_runtime_or_save',
      'any_import_path_outside_v2_shadow_scope',
      'any_feature_flag_mutation',
      'any_auto_execution_hook'
    ])
  });

  const api = Object.freeze({
    SHADOW_BRIDGE_GUARDRAILS
  });

  globalScope.ShadowBridgeGuardrails = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
