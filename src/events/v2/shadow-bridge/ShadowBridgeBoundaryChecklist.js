'use strict';

(function initShadowBridgeBoundaryChecklist(globalScope) {
  const BOUNDARY_CHECKLIST = Object.freeze([
    Object.freeze({ id: 'legacy_authoritative', required: true, description: 'Legacy event runtime remains authoritative.' }),
    Object.freeze({ id: 'default_disabled', required: true, description: 'V2 bridge entry defaults to disabled/no-op.' }),
    Object.freeze({ id: 'diagnostic_only', required: true, description: 'V2 output is diagnostic snapshot only.' }),
    Object.freeze({ id: 'no_state_write', required: true, description: 'No runtime state mutation is allowed.' }),
    Object.freeze({ id: 'no_save_write', required: true, description: 'No save or persistence write is allowed.' }),
    Object.freeze({ id: 'no_ui_render', required: true, description: 'No live UI render or replacement is allowed.' }),
    Object.freeze({ id: 'no_feature_flag_change', required: true, description: 'No feature flag mutation is allowed.' }),
    Object.freeze({ id: 'manual_harness_green', required: true, description: 'Manual report harness must remain green.' }),
    Object.freeze({ id: 'manual_input_only', required: true, description: 'Snapshot prototype only accepts explicit input.' }),
    Object.freeze({ id: 'snapshot_clone_safe', required: true, description: 'Snapshot output keeps no live Runtime references.' })
  ]);

  function evaluateChecklist(results) {
    const values = results || {};
    const failed = BOUNDARY_CHECKLIST
      .filter((item) => item.required && values[item.id] !== true)
      .map((item) => item.id);
    return {
      ok: failed.length === 0,
      failed,
      total: BOUNDARY_CHECKLIST.length
    };
  }

  const api = Object.freeze({
    BOUNDARY_CHECKLIST,
    evaluateChecklist
  });

  globalScope.ShadowBridgeBoundaryChecklist = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
