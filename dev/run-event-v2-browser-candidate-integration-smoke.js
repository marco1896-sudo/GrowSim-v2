'use strict';

const GuardedEntryCandidate = require('../src/events/v2/shadow-bridge/ShadowBridgeBrowserGuardedEntryCandidate.js');
const ExposureCandidate = require('../src/events/v2/shadow-bridge/ShadowBridgeBrowserExposureCandidate.js');

function runIntegrationSmoke() {
  const targetWindow = {};
  const guardedEntry = GuardedEntryCandidate.createShadowBridgeBrowserGuardedEntryCandidate({
    metadata: { source: 'phase-45-integration-smoke' }
  });

  const registration = ExposureCandidate.registerShadowBridgeBrowserExposureCandidate(targetWindow, guardedEntry, {
    enabled: true,
    allowGlobalRegistration: true,
    registeredAt: 'phase-45-integration-smoke'
  });

  const globalObject = targetWindow.ShadowBridgeGuardedEntry;
  const noopResult = globalObject && typeof globalObject.runShadowBridgeGuardedEntry === 'function'
    ? globalObject.runShadowBridgeGuardedEntry(null, { enabled: false })
    : null;
  const unregister = ExposureCandidate.unregisterShadowBridgeBrowserExposureCandidate(targetWindow);

  const errors = [];
  if (!registration || registration.ok !== true || registration.registered !== true) {
    errors.push('registration_failed');
  }
  if (!noopResult || noopResult.ok !== true || noopResult.safeToProceed !== true || noopResult.noop !== true) {
    errors.push('noop_result_failed');
  }
  if (!noopResult || noopResult.runtimeTouched !== false || noopResult.saveTouched !== false || noopResult.uiReplaced !== false || noopResult.eventActivated !== false) {
    errors.push('protection_flags_failed');
  }
  if (!unregister || unregister.ok !== true || unregister.unregistered !== true || targetWindow.ShadowBridgeGuardedEntry) {
    errors.push('unregister_failed');
  }

  return {
    ok: errors.length === 0,
    safeToProceed: errors.length === 0,
    registered: Boolean(registration && registration.registered),
    noopResultOk: Boolean(noopResult && noopResult.ok && noopResult.safeToProceed && noopResult.noop),
    unregistered: Boolean(unregister && unregister.unregistered),
    runtimeTouched: Boolean(noopResult && noopResult.runtimeTouched),
    saveTouched: Boolean(noopResult && noopResult.saveTouched),
    uiReplaced: Boolean(noopResult && noopResult.uiReplaced),
    eventActivated: Boolean(noopResult && noopResult.eventActivated),
    errors
  };
}

try {
  const result = runIntegrationSmoke();
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

