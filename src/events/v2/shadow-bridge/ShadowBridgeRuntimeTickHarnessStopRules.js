'use strict';

const runtimeTickHarnessStopRules = Object.freeze({
  id: 'shadow_bridge_runtime_tick_harness_stop_rules',
  phase: 66,
  stopImmediatelyIf: Object.freeze([
    'save_or_storage_is_touched',
    'ui_is_changed_or_replaced',
    'event_activation_occurs',
    'real_state_is_passed_to_v2',
    'nowMs_is_passed_to_v2',
    'runtime_path_cannot_be_isolated_cleanly',
    'legacy_state_machine_must_be_patched',
    'result_labels_cannot_stay_honest'
  ]),
  stopMode: 'abort_and_fall_back_to_boundary_planning_only'
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runtimeTickHarnessStopRules };
}
