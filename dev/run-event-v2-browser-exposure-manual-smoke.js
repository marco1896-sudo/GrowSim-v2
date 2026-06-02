'use strict';

const ExposureStub = require('../src/events/v2/shadow-bridge/ShadowBridgeBrowserExposureStub.js');

function createResult(overrides) {
  return Object.assign({
    ok: true,
    safeToProceed: true,
    registered: false,
    unregistered: false,
    noopResultOk: false,
    allowedFieldsOnly: false,
    foreignGlobalPreserved: false,
    runtimeTouched: false,
    saveTouched: false,
    uiReplaced: false,
    eventActivated: false,
    errors: []
  }, overrides || {});
}

function assertCondition(condition, message, errors) {
  if (!condition) {
    errors.push(message);
  }
}

function runManualBrowserExposureSmoke() {
  const errors = [];
  const mockWindow = {};
  const allowedKeys = ExposureStub.getAllowedGlobalKeys();

  const registerResult = ExposureStub.registerShadowBridgeGuardedEntryGlobal(mockWindow, {
    enabled: true,
    allowGlobalRegistration: true,
    registeredAt: 'phase-42-manual-smoke'
  });

  const globalObject = mockWindow.ShadowBridgeGuardedEntry;
  const visibleKeys = Object.keys(globalObject || {});

  assertCondition(registerResult.ok === true, 'registration_result_not_ok', errors);
  assertCondition(registerResult.safeToProceed === true, 'registration_not_safe', errors);
  assertCondition(registerResult.registered === true, 'global_not_registered', errors);
  assertCondition(Boolean(globalObject), 'global_missing_after_registration', errors);
  assertCondition(
    visibleKeys.length === allowedKeys.length && visibleKeys.every((key) => allowedKeys.indexOf(key) >= 0),
    'global_has_unexpected_visible_fields',
    errors
  );
  assertCondition(typeof globalObject.runShadowBridgeGuardedEntry === 'function', 'global_missing_guarded_entry_runner', errors);
  assertCondition(globalObject.noop === true, 'global_noop_not_true', errors);
  assertCondition(globalObject.legacyAuthoritative === true, 'global_legacy_authoritative_not_true', errors);

  const noopResult = globalObject && typeof globalObject.runShadowBridgeGuardedEntry === 'function'
    ? globalObject.runShadowBridgeGuardedEntry(null, { enabled: false })
    : null;

  assertCondition(Boolean(noopResult), 'noop_result_missing', errors);
  assertCondition(noopResult && noopResult.ok === true, 'noop_result_not_ok', errors);
  assertCondition(noopResult && noopResult.safeToProceed === true, 'noop_result_not_safe', errors);
  assertCondition(noopResult && noopResult.noop === true, 'noop_result_not_noop', errors);
  assertCondition(noopResult && noopResult.snapshot === null, 'noop_snapshot_not_null', errors);
  assertCondition(noopResult && noopResult.runtimeTouched === false, 'noop_runtime_touched', errors);
  assertCondition(noopResult && noopResult.saveTouched === false, 'noop_save_touched', errors);
  assertCondition(noopResult && noopResult.uiReplaced === false, 'noop_ui_replaced', errors);
  assertCondition(noopResult && noopResult.eventActivated === false, 'noop_event_activated', errors);

  const unregisterResult = ExposureStub.unregisterShadowBridgeGuardedEntryGlobal(mockWindow);
  assertCondition(unregisterResult.ok === true, 'unregister_result_not_ok', errors);
  assertCondition(unregisterResult.unregistered === true, 'owned_global_not_unregistered', errors);
  assertCondition(!mockWindow.ShadowBridgeGuardedEntry, 'owned_global_still_present_after_unregister', errors);

  const foreignWindow = { ShadowBridgeGuardedEntry: { foreign: true } };
  const foreignUnregisterResult = ExposureStub.unregisterShadowBridgeGuardedEntryGlobal(foreignWindow);
  assertCondition(foreignUnregisterResult.ok === false, 'foreign_unregister_should_block', errors);
  assertCondition(foreignUnregisterResult.reason === 'global_not_owned_by_stub', 'foreign_unregister_wrong_reason', errors);
  assertCondition(foreignWindow.ShadowBridgeGuardedEntry && foreignWindow.ShadowBridgeGuardedEntry.foreign === true, 'foreign_global_was_removed', errors);

  return createResult({
    ok: errors.length === 0,
    safeToProceed: errors.length === 0,
    registered: registerResult.registered === true,
    unregistered: unregisterResult.unregistered === true,
    noopResultOk: Boolean(noopResult && noopResult.ok === true && noopResult.safeToProceed === true && noopResult.noop === true),
    allowedFieldsOnly: visibleKeys.length === allowedKeys.length && visibleKeys.every((key) => allowedKeys.indexOf(key) >= 0),
    foreignGlobalPreserved: Boolean(foreignWindow.ShadowBridgeGuardedEntry && foreignWindow.ShadowBridgeGuardedEntry.foreign === true),
    runtimeTouched: Boolean(noopResult && noopResult.runtimeTouched),
    saveTouched: Boolean(noopResult && noopResult.saveTouched),
    uiReplaced: Boolean(noopResult && noopResult.uiReplaced),
    eventActivated: Boolean(noopResult && noopResult.eventActivated),
    visibleKeys,
    errors
  });
}

try {
  const result = runManualBrowserExposureSmoke();
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    safeToProceed: false,
    abortReason: error && error.message ? error.message : String(error)
  }, null, 2));
  process.exitCode = 1;
}

