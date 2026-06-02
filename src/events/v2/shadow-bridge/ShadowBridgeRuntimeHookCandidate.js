'use strict';

(function initShadowBridgeRuntimeHookCandidate(globalScope) {
  const RUNTIME_HOOK_CANDIDATES = Object.freeze([
    Object.freeze({
      id: 'app_run_event_state_machine_preflight',
      file: 'app.js',
      seam: 'runEventStateMachine(nowMs)',
      recommendation: 'preferred_later_candidate',
      phase35Decision: 'design_go_only',
      rationale: 'This is the narrowest existing event tick boundary before legacy event routing continues.',
      risks: Object.freeze([
        'tick_path_sensitivity',
        'exception_can_affect_loop',
        'state_reference_must_be_sanitized_before_v2',
        'must_not_call_v2_by_default'
      ]),
      allowedLaterBehavior: Object.freeze([
        'guard_check',
        'explicit_disabled_noop',
        'diagnostic_snapshot_only',
        'legacy_continues_authoritative'
      ]),
      forbiddenLaterBehavior: Object.freeze([
        'activate_event',
        'write_state',
        'write_save',
        'replace_ui',
        'set_feature_flag',
        'loop_or_interval_registration'
      ])
    }),
    Object.freeze({
      id: 'event_engine_route_tick_preflight',
      file: 'src/events/eventEngine.js',
      seam: 'routeTick(nowMs, state)',
      recommendation: 'riskier_alternative',
      phase35Decision: 'avoid_for_first_hook',
      rationale: 'This file already owns legacy/shadow routing, feature flags and persistence-aware shadow state.',
      risks: Object.freeze([
        'higher_coupling_to_existing_shadow_runtime',
        'feature_flag_confusion',
        'persistence_adapter_proximity',
        'authority_blur_between_v1_shadow_and_v2_bridge'
      ]),
      allowedLaterBehavior: Object.freeze([]),
      forbiddenLaterBehavior: Object.freeze([
        'first_v2_bridge_hook',
        'persistence_access',
        'routing_override',
        'soft_cutover_change'
      ])
    })
  ]);

  function getPreferredRuntimeHookCandidate() {
    return RUNTIME_HOOK_CANDIDATES.find((candidate) => candidate.recommendation === 'preferred_later_candidate') || null;
  }

  const api = Object.freeze({
    RUNTIME_HOOK_CANDIDATES,
    getPreferredRuntimeHookCandidate
  });

  globalScope.ShadowBridgeRuntimeHookCandidate = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

