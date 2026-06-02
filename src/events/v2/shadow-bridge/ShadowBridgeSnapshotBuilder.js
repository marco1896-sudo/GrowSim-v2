'use strict';

(function initShadowBridgeSnapshotBuilder(globalScope) {
  const Context = (globalScope && globalScope.ShadowBridgeSnapshotContext) ||
    (typeof require !== 'undefined' ? require('./ShadowBridgeSnapshotContext.js') : null);
  const Validator = (globalScope && globalScope.ShadowBridgeSnapshotValidator) ||
    (typeof require !== 'undefined' ? require('./ShadowBridgeSnapshotValidator.js') : null);
  const Result = (globalScope && globalScope.ShadowBridgeSnapshotResult) ||
    (typeof require !== 'undefined' ? require('./ShadowBridgeSnapshotResult.js') : null);

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.keys(value).forEach((key) => deepFreeze(value[key]));
    return Object.freeze(value);
  }

  function createGuardrails(overrides) {
    return Object.assign({
      runtimeTouched: false,
      saveTouched: false,
      uiReplaced: false,
      featureFlagsTouched: false,
      legacyEventsTouched: false,
      eventActivated: false,
      legacyAuthoritative: true,
      noop: true,
      safeToProceed: true
    }, overrides || {});
  }

  function createMeta(options) {
    const opts = options || {};
    return {
      createdAt: opts.createdAt || new Date().toISOString(),
      source: opts.source || 'manual_snapshot_input',
      mode: opts.mode || 'manual_diagnostic',
      phase: opts.phase || 33,
      locale: opts.locale || 'de',
      fallbackLocale: opts.fallbackLocale || 'en'
    };
  }

  function createShadowBridgeSnapshot(input, options) {
    const opts = options || {};
    const context = Context.createShadowBridgeSnapshotContext(input || {});
    const guardrails = createGuardrails(opts.guardrails);
    const snapshot = {
      kind: 'event_v2_shadow_bridge_read_only_snapshot',
      meta: createMeta(opts),
      readOnlyContext: context.readOnlyContext,
      v2Diagnostics: context.v2Diagnostics,
      guardrails,
      snapshotQuality: {
        hasRequiredMeta: true,
        hasReadOnlyContext: true,
        hasGuardrails: true,
        hasNoLiveReferences: context.diagnostics.every((item) => item.code !== 'snapshot_live_reference_omitted'),
        isFrozenOrCloneSafe: true
      }
    };

    snapshot.guardrails.safeToProceed = guardrails.runtimeTouched === false &&
      guardrails.saveTouched === false &&
      guardrails.uiReplaced === false &&
      guardrails.featureFlagsTouched === false &&
      guardrails.legacyEventsTouched === false &&
      guardrails.eventActivated === false &&
      guardrails.noop === true &&
      guardrails.legacyAuthoritative === true;

    deepFreeze(snapshot);
    const validation = Validator.validateShadowBridgeSnapshot(snapshot);
    return Result.createSnapshotResult(snapshot, validation, context.diagnostics);
  }

  const api = Object.freeze({
    createShadowBridgeSnapshot,
    deepFreeze
  });

  globalScope.ShadowBridgeSnapshotBuilder = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

