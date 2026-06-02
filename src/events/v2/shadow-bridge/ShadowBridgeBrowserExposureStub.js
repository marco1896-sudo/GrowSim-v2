'use strict';

(function initShadowBridgeBrowserExposureStub(globalScope) {
  const GuardedEntry = (globalScope && globalScope.ShadowBridgeGuardedEntry) ||
    (typeof require !== 'undefined' ? require('./ShadowBridgeGuardedEntry.js') : null);
  const OWNERSHIP_MARKER = '__eventV2ShadowBridgeExposureOwner';
  const OWNERSHIP_VALUE = 'event_v2_shadow_bridge_browser_exposure_stub';

  function createResult(overrides) {
    return Object.assign({
      ok: true,
      safeToProceed: true,
      registered: false,
      unregistered: false,
      skipped: false,
      reason: null,
      runtimeTouched: false,
      saveTouched: false,
      uiReplaced: false,
      featureFlagsTouched: false,
      legacyEventsTouched: false,
      eventActivated: false,
      noop: true,
      legacyAuthoritative: true,
      diagnostics: []
    }, overrides || {});
  }

  function isValidTargetWindow(targetWindow) {
    return Boolean(targetWindow && typeof targetWindow === 'object');
  }

  function createExposedGlobal(metadataOptions) {
    const metadata = Object.freeze({
      kind: 'event_v2_shadow_bridge_guarded_entry_global',
      version: 'phase-41',
      defaultEnabled: false,
      noop: true,
      legacyAuthoritative: true,
      registeredBy: OWNERSHIP_VALUE,
      registeredAt: metadataOptions && metadataOptions.registeredAt ? String(metadataOptions.registeredAt) : null
    });

    const exposedGlobal = {
      runShadowBridgeGuardedEntry: GuardedEntry.runShadowBridgeGuardedEntry,
      metadata,
      noop: true,
      legacyAuthoritative: true
    };

    Object.defineProperty(exposedGlobal, OWNERSHIP_MARKER, {
      value: OWNERSHIP_VALUE,
      enumerable: false,
      configurable: false,
      writable: false
    });

    return Object.freeze(exposedGlobal);
  }

  function getAllowedGlobalKeys() {
    return Object.freeze([
      'runShadowBridgeGuardedEntry',
      'metadata',
      'noop',
      'legacyAuthoritative'
    ]);
  }

  function registerShadowBridgeGuardedEntryGlobal(targetWindow, options) {
    const opts = Object.assign({
      enabled: false,
      allowGlobalRegistration: false,
      allowOverwrite: false,
      registeredAt: null
    }, options || {});

    if (!isValidTargetWindow(targetWindow)) {
      return createResult({ ok: false, safeToProceed: false, skipped: true, reason: 'invalid_target_window' });
    }
    if (opts.enabled !== true) {
      return createResult({ skipped: true, reason: 'registration_disabled' });
    }
    if (opts.allowGlobalRegistration !== true) {
      return createResult({ ok: false, safeToProceed: false, skipped: true, reason: 'global_registration_not_allowed' });
    }
    if (targetWindow.ShadowBridgeGuardedEntry && opts.allowOverwrite !== true) {
      return createResult({ ok: false, safeToProceed: false, skipped: true, reason: 'global_already_exists' });
    }

    targetWindow.ShadowBridgeGuardedEntry = createExposedGlobal({ registeredAt: opts.registeredAt });
    return createResult({ registered: true, reason: 'registered' });
  }

  function unregisterShadowBridgeGuardedEntryGlobal(targetWindow) {
    if (!isValidTargetWindow(targetWindow)) {
      return createResult({ ok: false, safeToProceed: false, skipped: true, reason: 'invalid_target_window' });
    }
    const current = targetWindow.ShadowBridgeGuardedEntry;
    if (!current) {
      return createResult({ skipped: true, reason: 'global_not_present' });
    }
    if (!current || current[OWNERSHIP_MARKER] !== OWNERSHIP_VALUE) {
      return createResult({ ok: false, safeToProceed: false, skipped: true, reason: 'global_not_owned_by_stub' });
    }

    delete targetWindow.ShadowBridgeGuardedEntry;
    return createResult({ unregistered: true, reason: 'unregistered' });
  }

  const api = Object.freeze({
    registerShadowBridgeGuardedEntryGlobal,
    unregisterShadowBridgeGuardedEntryGlobal,
    getAllowedGlobalKeys,
    OWNERSHIP_MARKER,
    OWNERSHIP_VALUE
  });

  globalScope.ShadowBridgeBrowserExposureStub = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
