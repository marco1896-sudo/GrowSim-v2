'use strict';

(function initShadowBridgeReadOnlySnapshotContract(globalScope) {
  const READ_ONLY_SNAPSHOT_CONTRACT = Object.freeze({
    allowedReadFields: Object.freeze([
      'simulation.tickCount',
      'simulation.simTimeMs',
      'plant.stageIndex',
      'plant.stageProgress',
      'status.water',
      'status.nutrition',
      'status.stress',
      'climate.tent',
      'environmentControls',
      'setup',
      'events.machineState',
      'events.activeEventId',
      'events.scheduler',
      'history.events'
    ]),
    forbiddenWriteFields: Object.freeze([
      'state',
      'state.events',
      'state.status',
      'state.plant',
      'state.history',
      'state.run',
      'localStorage',
      'IndexedDB',
      'serviceWorker',
      'featureFlags'
    ]),
    outputShape: Object.freeze({
      kind: 'event_v2_read_only_diagnostic_snapshot',
      mutable: false,
      mayActivateEvent: false,
      mayRenderUi: false,
      mayPersist: false
    }),
    requiredSections: Object.freeze([
      'meta',
      'readOnlyContext',
      'v2Diagnostics',
      'guardrails',
      'snapshotQuality'
    ]),
    cloneSafetyRules: Object.freeze([
      'explicit_input_only',
      'copy_allowed_fields_only',
      'omit_functions',
      'omit_dom_objects',
      'omit_unknown_runtime_references',
      'freeze_snapshot_result'
    ])
  });

  const api = Object.freeze({
    READ_ONLY_SNAPSHOT_CONTRACT
  });

  globalScope.ShadowBridgeReadOnlySnapshotContract = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
