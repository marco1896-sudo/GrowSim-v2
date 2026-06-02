'use strict';

(function initShadowBridgeBrowserExposureContractTests(globalScope) {
  const ExposureStub = (globalScope && globalScope.ShadowBridgeBrowserExposureStub) ||
    (typeof require !== 'undefined' ? require('./ShadowBridgeBrowserExposureStub.js') : null);

  function createMockWindow() {
    return {};
  }

  function summarize(result, targetWindow) {
    return {
      ok: Boolean(result && result.ok),
      safeToProceed: Boolean(result && result.safeToProceed),
      registered: Boolean(result && result.registered),
      unregistered: Boolean(result && result.unregistered),
      skipped: Boolean(result && result.skipped),
      reason: result && result.reason ? result.reason : null,
      hasGlobal: Boolean(targetWindow && targetWindow.ShadowBridgeGuardedEntry),
      runtimeTouched: Boolean(result && result.runtimeTouched),
      saveTouched: Boolean(result && result.saveTouched),
      uiReplaced: Boolean(result && result.uiReplaced),
      eventActivated: Boolean(result && result.eventActivated)
    };
  }

  function runCase(id, description, execute, expect) {
    try {
      const data = execute();
      const passed = Boolean(expect(data));
      return {
        id,
        description,
        passed,
        result: summarize(data.result, data.targetWindow),
        error: null
      };
    } catch (error) {
      return {
        id,
        description,
        passed: false,
        result: null,
        error: error && error.message ? error.message : String(error)
      };
    }
  }

  function runBrowserExposureContractTests() {
    const cases = [
      runCase(
        'missing_target_window',
        'No targetWindow results in safe blocked no-op.',
        () => ({ targetWindow: null, result: ExposureStub.registerShadowBridgeGuardedEntryGlobal(null, { enabled: true, allowGlobalRegistration: true }) }),
        ({ result }) => result.ok === false && result.safeToProceed === false && result.reason === 'invalid_target_window'
      ),
      runCase(
        'registration_disabled',
        'enabled=false does not register.',
        () => {
          const targetWindow = createMockWindow();
          return { targetWindow, result: ExposureStub.registerShadowBridgeGuardedEntryGlobal(targetWindow, { enabled: false, allowGlobalRegistration: true }) };
        },
        ({ result, targetWindow }) => result.ok === true && result.registered === false && !targetWindow.ShadowBridgeGuardedEntry
      ),
      runCase(
        'registration_not_allowed',
        'enabled=true without allowGlobalRegistration blocks.',
        () => {
          const targetWindow = createMockWindow();
          return { targetWindow, result: ExposureStub.registerShadowBridgeGuardedEntryGlobal(targetWindow, { enabled: true, allowGlobalRegistration: false }) };
        },
        ({ result, targetWindow }) => result.ok === false && result.reason === 'global_registration_not_allowed' && !targetWindow.ShadowBridgeGuardedEntry
      ),
      runCase(
        'explicit_registration_sets_global',
        'Valid mock window plus explicit permission registers the global.',
        () => {
          const targetWindow = createMockWindow();
          return { targetWindow, result: ExposureStub.registerShadowBridgeGuardedEntryGlobal(targetWindow, { enabled: true, allowGlobalRegistration: true }) };
        },
        ({ result, targetWindow }) => result.ok === true && result.registered === true && Boolean(targetWindow.ShadowBridgeGuardedEntry)
      ),
      runCase(
        'global_allowed_fields_only',
        'Registered global exposes only the allowed fields.',
        () => {
          const targetWindow = createMockWindow();
          const result = ExposureStub.registerShadowBridgeGuardedEntryGlobal(targetWindow, { enabled: true, allowGlobalRegistration: true });
          return { targetWindow, result };
        },
        ({ targetWindow }) => {
          const allowed = ExposureStub.getAllowedGlobalKeys();
          const keys = Object.keys(targetWindow.ShadowBridgeGuardedEntry || {});
          return keys.every((key) => allowed.indexOf(key) >= 0);
        }
      ),
      runCase(
        'no_overwrite_by_default',
        'Existing ShadowBridgeGuardedEntry is not overwritten by default.',
        () => {
          const targetWindow = { ShadowBridgeGuardedEntry: { foreign: true } };
          return { targetWindow, result: ExposureStub.registerShadowBridgeGuardedEntryGlobal(targetWindow, { enabled: true, allowGlobalRegistration: true }) };
        },
        ({ result, targetWindow }) => result.ok === false && result.reason === 'global_already_exists' && targetWindow.ShadowBridgeGuardedEntry.foreign === true
      ),
      runCase(
        'allow_overwrite_replaces_controlled',
        'allowOverwrite=true replaces the target global.',
        () => {
          const targetWindow = { ShadowBridgeGuardedEntry: { foreign: true } };
          return { targetWindow, result: ExposureStub.registerShadowBridgeGuardedEntryGlobal(targetWindow, { enabled: true, allowGlobalRegistration: true, allowOverwrite: true }) };
        },
        ({ result, targetWindow }) => result.ok === true && result.registered === true && targetWindow.ShadowBridgeGuardedEntry.foreign !== true
      ),
      runCase(
        'unregister_removes_owned_global_only',
        'Unregister removes a global only when owned by this stub.',
        () => {
          const targetWindow = createMockWindow();
          ExposureStub.registerShadowBridgeGuardedEntryGlobal(targetWindow, { enabled: true, allowGlobalRegistration: true });
          return { targetWindow, result: ExposureStub.unregisterShadowBridgeGuardedEntryGlobal(targetWindow) };
        },
        ({ result, targetWindow }) => result.ok === true && result.unregistered === true && !targetWindow.ShadowBridgeGuardedEntry
      ),
      runCase(
        'unregister_keeps_foreign_global',
        'Unregister does not delete a foreign global.',
        () => {
          const targetWindow = { ShadowBridgeGuardedEntry: { foreign: true } };
          return { targetWindow, result: ExposureStub.unregisterShadowBridgeGuardedEntryGlobal(targetWindow) };
        },
        ({ result, targetWindow }) => result.ok === false && result.reason === 'global_not_owned_by_stub' && targetWindow.ShadowBridgeGuardedEntry.foreign === true
      ),
      runCase(
        'no_runtime_save_ui_flags',
        'Registration never marks Runtime/Save/UI/Event flags true.',
        () => {
          const targetWindow = createMockWindow();
          return { targetWindow, result: ExposureStub.registerShadowBridgeGuardedEntryGlobal(targetWindow, { enabled: true, allowGlobalRegistration: true }) };
        },
        ({ result }) => result.runtimeTouched === false && result.saveTouched === false && result.uiReplaced === false && result.eventActivated === false
      )
    ];

    const failed = cases.filter((item) => item.passed !== true);
    return {
      ok: failed.length === 0,
      total: cases.length,
      passed: cases.length - failed.length,
      failed: failed.length,
      cases
    };
  }

  const api = Object.freeze({
    runBrowserExposureContractTests
  });

  globalScope.ShadowBridgeBrowserExposureContractTests = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

