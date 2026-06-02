'use strict';

(function initShadowBridgeReadOnlySnapshot(globalScope) {
  const Builder = (globalScope && globalScope.ShadowBridgeSnapshotBuilder) ||
    (typeof require !== 'undefined' ? require('./ShadowBridgeSnapshotBuilder.js') : null);
  const Sanitizer = (globalScope && globalScope.ShadowBridgeSnapshotSanitizer) ||
    (typeof require !== 'undefined' ? require('./ShadowBridgeSnapshotSanitizer.js') : null);
  const Validator = (globalScope && globalScope.ShadowBridgeSnapshotValidator) ||
    (typeof require !== 'undefined' ? require('./ShadowBridgeSnapshotValidator.js') : null);
  const Result = (globalScope && globalScope.ShadowBridgeSnapshotResult) ||
    (typeof require !== 'undefined' ? require('./ShadowBridgeSnapshotResult.js') : null);

  function createShadowBridgeSnapshot(input, options) {
    return Builder.createShadowBridgeSnapshot(input, options);
  }

  const api = Object.freeze({
    createShadowBridgeSnapshot,
    sanitizeSnapshotInput: Sanitizer.sanitizeSnapshotInput,
    validateShadowBridgeSnapshot: Validator.validateShadowBridgeSnapshot,
    createSnapshotResult: Result.createSnapshotResult
  });

  globalScope.ShadowBridgeReadOnlySnapshot = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

