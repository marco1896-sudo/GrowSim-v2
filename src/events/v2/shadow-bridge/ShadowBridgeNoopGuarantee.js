'use strict';

(function initShadowBridgeNoopGuarantee(globalScope) {
  function evaluateNoopGuarantee(flags) {
    const safeFlags = Object.assign({
      runtimeTouched: false,
      saveTouched: false,
      uiReplaced: false,
      featureFlagsTouched: false,
      legacyEventsTouched: false,
      eventActivated: false,
      noop: true,
      legacyAuthoritative: true
    }, flags || {});

    const trueMeansFailure = [
      'runtimeTouched',
      'saveTouched',
      'uiReplaced',
      'featureFlagsTouched',
      'legacyEventsTouched',
      'eventActivated'
    ];
    const failed = trueMeansFailure.filter((key) => safeFlags[key] === true);
    if (safeFlags.noop !== true) failed.push('noop');
    if (safeFlags.legacyAuthoritative !== true) failed.push('legacyAuthoritative');

    return {
      ok: failed.length === 0,
      failed,
      runtimeTouched: safeFlags.runtimeTouched,
      saveTouched: safeFlags.saveTouched,
      uiReplaced: safeFlags.uiReplaced,
      featureFlagsTouched: safeFlags.featureFlagsTouched,
      legacyEventsTouched: safeFlags.legacyEventsTouched,
      eventActivated: safeFlags.eventActivated,
      noop: safeFlags.noop,
      legacyAuthoritative: safeFlags.legacyAuthoritative
    };
  }

  const api = Object.freeze({
    evaluateNoopGuarantee
  });

  globalScope.ShadowBridgeNoopGuarantee = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
