'use strict';

(function initShadowBridgeSnapshotContext(globalScope) {
  const Sanitizer = (globalScope && globalScope.ShadowBridgeSnapshotSanitizer) ||
    (typeof require !== 'undefined' ? require('./ShadowBridgeSnapshotSanitizer.js') : null);

  function createShadowBridgeSnapshotContext(input) {
    const sanitized = Sanitizer.sanitizeSnapshotInput(input || {});
    return {
      readOnlyContext: sanitized.readOnlyContext,
      v2Diagnostics: sanitized.v2Diagnostics,
      diagnostics: sanitized.diagnostics
    };
  }

  const api = Object.freeze({
    createShadowBridgeSnapshotContext
  });

  globalScope.ShadowBridgeSnapshotContext = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

