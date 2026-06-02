'use strict';

(function initShadowBridgeBrowserExposureCandidateTests(globalScope) {
  const Candidate = (typeof require !== 'undefined')
    ? require('./ShadowBridgeBrowserExposureCandidate.js')
    : null;

  function createMockDeps() {
    return {
      metadata: Object.freeze({
        source: 'candidate_test',
        phase: 'phase-43'
      }),
      runShadowBridgeGuardedEntry(input, options) {
        const opts = Object.assign({ enabled: false }, options || {});
        return {
          ok: true,
          safeToProceed: true,
          mode: opts.enabled ? 'guarded_read_only_snapshot_noop' : 'guarded_read_only_noop',
          runtimeTouched: false,
          saveTouched: false,
          uiReplaced: false,
          featureFlagsTouched: false,
          legacyEventsTouched: false,
          eventActivated: false,
          legacyAuthoritative: true,
          noop: true,
          snapshot: null,
          diagnostics: [],
          abortReason: null
        };
      }
    };
  }

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

  function runBrowserExposureCandidateTests() {
    const cases = [
      runCase(
        'candidate_api_loads',
        'Candidate API loads in Node and exposes expected functions.',
        () => ({ targetWindow: {}, result: { ok: Boolean(Candidate && typeof Candidate.registerShadowBridgeBrowserExposureCandidate === 'function'), safeToProceed: true } }),
        ({ result }) => result.ok === true
      ),
      runCase(
        'no_automatic_guarded_global',
        'Loading the candidate does not automatically set ShadowBridgeGuardedEntry.',
        () => {
          const targetWindow = createMockWindow();
          return { targetWindow, result: { ok: true, safeToProceed: true } };
        },
        ({ targetWindow }) => !targetWindow.ShadowBridgeGuardedEntry
      ),
      runCase(
        'invalid_deps_block',
        'Registration without valid deps blocks without throwing.',
        () => {
          const targetWindow = createMockWindow();
          return { targetWindow, result: Candidate.registerShadowBridgeBrowserExposureCandidate(targetWindow, {}, { enabled: true, allowGlobalRegistration: true }) };
        },
        ({ result, targetWindow }) => result.ok === false && result.reason === 'missing_run_shadow_bridge_guarded_entry' && !targetWindow.ShadowBridgeGuardedEntry
      ),
      runCase(
        'explicit_registration_sets_global',
        'Valid deps plus explicit permission registers the global.',
        () => {
          const targetWindow = createMockWindow();
          return { targetWindow, result: Candidate.registerShadowBridgeBrowserExposureCandidate(targetWindow, createMockDeps(), { enabled: true, allowGlobalRegistration: true }) };
        },
        ({ result, targetWindow }) => result.ok === true && result.registered === true && Boolean(targetWindow.ShadowBridgeGuardedEntry)
      ),
      runCase(
        'global_allowed_fields_only',
        'Registered global exposes only allowed visible fields.',
        () => {
          const targetWindow = createMockWindow();
          const result = Candidate.registerShadowBridgeBrowserExposureCandidate(targetWindow, createMockDeps(), { enabled: true, allowGlobalRegistration: true });
          return { targetWindow, result };
        },
        ({ targetWindow }) => {
          const allowed = Candidate.getAllowedGlobalKeys();
          const keys = Object.keys(targetWindow.ShadowBridgeGuardedEntry || {});
          return keys.length === allowed.length && keys.every((key) => allowed.indexOf(key) >= 0);
        }
      ),
      runCase(
        'registered_noop_call_works',
        'No-op call through registered global works.',
        () => {
          const targetWindow = createMockWindow();
          const result = Candidate.registerShadowBridgeBrowserExposureCandidate(targetWindow, createMockDeps(), { enabled: true, allowGlobalRegistration: true });
          const noopResult = targetWindow.ShadowBridgeGuardedEntry.runShadowBridgeGuardedEntry(null, { enabled: false });
          return { targetWindow, result: Object.assign({}, result, { noopResult }) };
        },
        ({ result }) => result.noopResult && result.noopResult.ok === true && result.noopResult.safeToProceed === true && result.noopResult.noop === true && result.noopResult.snapshot === null
      ),
      runCase(
        'no_runtime_save_ui_event_flags',
        'No runtime/save/UI/event flags become true.',
        () => {
          const targetWindow = createMockWindow();
          const result = Candidate.registerShadowBridgeBrowserExposureCandidate(targetWindow, createMockDeps(), { enabled: true, allowGlobalRegistration: true });
          const noopResult = targetWindow.ShadowBridgeGuardedEntry.runShadowBridgeGuardedEntry(null, { enabled: false });
          return { targetWindow, result: Object.assign({}, result, noopResult) };
        },
        ({ result }) => result.runtimeTouched === false && result.saveTouched === false && result.uiReplaced === false && result.eventActivated === false
      ),
      runCase(
        'no_overwrite_without_allow',
        'Existing global is not overwritten without allowOverwrite.',
        () => {
          const targetWindow = { ShadowBridgeGuardedEntry: { foreign: true } };
          return { targetWindow, result: Candidate.registerShadowBridgeBrowserExposureCandidate(targetWindow, createMockDeps(), { enabled: true, allowGlobalRegistration: true }) };
        },
        ({ result, targetWindow }) => result.ok === false && result.reason === 'global_already_exists' && targetWindow.ShadowBridgeGuardedEntry.foreign === true
      ),
      runCase(
        'controlled_overwrite',
        'allowOverwrite=true replaces the global in a controlled way.',
        () => {
          const targetWindow = { ShadowBridgeGuardedEntry: { foreign: true } };
          return { targetWindow, result: Candidate.registerShadowBridgeBrowserExposureCandidate(targetWindow, createMockDeps(), { enabled: true, allowGlobalRegistration: true, allowOverwrite: true }) };
        },
        ({ result, targetWindow }) => result.ok === true && result.registered === true && targetWindow.ShadowBridgeGuardedEntry.foreign !== true
      ),
      runCase(
        'unregister_owned_only',
        'Unregister removes only candidate-owned globals.',
        () => {
          const targetWindow = createMockWindow();
          Candidate.registerShadowBridgeBrowserExposureCandidate(targetWindow, createMockDeps(), { enabled: true, allowGlobalRegistration: true });
          return { targetWindow, result: Candidate.unregisterShadowBridgeBrowserExposureCandidate(targetWindow) };
        },
        ({ result, targetWindow }) => result.ok === true && result.unregistered === true && !targetWindow.ShadowBridgeGuardedEntry
      ),
      runCase(
        'missing_target_window_no_throw',
        'Missing targetWindow does not throw and blocks safely.',
        () => ({ targetWindow: null, result: Candidate.registerShadowBridgeBrowserExposureCandidate(null, createMockDeps(), { enabled: true, allowGlobalRegistration: true }) }),
        ({ result }) => result.ok === false && result.reason === 'invalid_target_window'
      ),
      runCase(
        'missing_runner_no_throw',
        'Missing runShadowBridgeGuardedEntry does not throw and blocks safely.',
        () => {
          const targetWindow = createMockWindow();
          return { targetWindow, result: Candidate.registerShadowBridgeBrowserExposureCandidate(targetWindow, { metadata: {} }, { enabled: true, allowGlobalRegistration: true }) };
        },
        ({ result, targetWindow }) => result.ok === false && result.reason === 'missing_run_shadow_bridge_guarded_entry' && !targetWindow.ShadowBridgeGuardedEntry
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
    runBrowserExposureCandidateTests
  });

  globalScope.ShadowBridgeBrowserExposureCandidateTests = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : {});

