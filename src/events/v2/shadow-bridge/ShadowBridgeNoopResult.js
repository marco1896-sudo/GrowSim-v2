'use strict';

(function initShadowBridgeNoopResult(globalScope) {
  function createShadowBridgeNoopResult(reason, details) {
    return {
      mode: 'noop',
      status: 'not_integrated',
      reason: reason || 'shadow_bridge_not_connected',
      details: details || {},
      runtimeTouched: false,
      saveTouched: false,
      uiReplaced: false,
      featureFlagsTouched: false,
      legacyEventsTouched: false,
      eventActivated: false
    };
  }

  const api = Object.freeze({
    createShadowBridgeNoopResult
  });

  globalScope.ShadowBridgeNoopResult = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
