'use strict';

const SHADOW_BRIDGE_GLOBAL_REGISTRATION_CONTRACT = Object.freeze({
  phase: 40,
  status: 'contract_only_no_window_write',
  proposedGlobalName: 'ShadowBridgeGuardedEntry',
  proposedGlobalPath: 'window.ShadowBridgeGuardedEntry',
  requiredApi: Object.freeze([
    'runShadowBridgeGuardedEntry(input, options)'
  ]),
  defaultBehavior: Object.freeze({
    enabled: false,
    allowSnapshot: false,
    noop: true,
    legacyAuthoritative: true,
    snapshot: null
  }),
  forbiddenAtRegistration: Object.freeze([
    'event_activation',
    'state_mutation',
    'save_write',
    'ui_render',
    'feature_flag_change',
    'tick_registration',
    'snapshot_from_live_state'
  ]),
  removalRule: 'remove_single_script_entry_or_stub_file_without_data_migration'
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Object.freeze({
    SHADOW_BRIDGE_GLOBAL_REGISTRATION_CONTRACT
  });
}

