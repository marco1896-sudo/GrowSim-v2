'use strict';

(function initShadowBridgeBoundary(globalScope) {
  const SHADOW_BRIDGE_BOUNDARY = Object.freeze({
    mode: 'read_only_shadow',
    allowedInputSources: Object.freeze([
      'data/events/catalog/events/**',
      'data/events/catalog/learning-cards/**',
      'src/i18n/locales/de.json',
      'src/i18n/locales/en.json',
      'src/i18n/locales/es.json'
    ]),
    forbiddenActions: Object.freeze([
      'mutate_runtime_state',
      'write_savegame',
      'activate_events_in_game',
      'replace_live_event_ui',
      'import_legacy_runtime_modules',
      'auto_run_on_app_start',
      'wire_into_tick_loop'
    ]),
    requiredNoopFlags: Object.freeze([
      'runtimeTouched=false',
      'saveTouched=false',
      'uiReplaced=false',
      'featureFlagsTouched=false',
      'legacyEventsTouched=false'
    ]),
    outputType: 'noop_shadow_result'
  });

  const api = Object.freeze({
    SHADOW_BRIDGE_BOUNDARY
  });

  globalScope.ShadowBridgeBoundary = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
