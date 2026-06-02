'use strict';

const BridgeCandidate = require('../src/events/v2/shadow-bridge/ShadowBridgeBrowserBridgeCandidate.js');
const GuardedEntryCandidate = require('../src/events/v2/shadow-bridge/ShadowBridgeBrowserGuardedEntryCandidate.js');
const ExposureCandidate = require('../src/events/v2/shadow-bridge/ShadowBridgeBrowserExposureCandidate.js');

function runBundleFlow() {
  const targetWindow = {};
  const registration = BridgeCandidate.registerShadowBridgeBrowserBridgeCandidate(targetWindow, {
    enabled: true,
    allowGlobalRegistration: true
  });
  const noopResult = targetWindow.ShadowBridgeGuardedEntry.runShadowBridgeGuardedEntry(null, { enabled: false });
  const unregister = BridgeCandidate.unregisterShadowBridgeBrowserBridgeCandidate(targetWindow);
  return {
    ok: registration.ok === true && registration.registered === true && noopResult.ok === true && unregister.unregistered === true,
    registered: Boolean(registration.registered),
    noopResultOk: Boolean(noopResult.ok && noopResult.safeToProceed && noopResult.noop),
    unregistered: Boolean(unregister.unregistered),
    scriptCountEstimate: 1,
    registrationLayerCount: 1,
    runtimeTouched: Boolean(noopResult.runtimeTouched),
    saveTouched: Boolean(noopResult.saveTouched),
    uiReplaced: Boolean(noopResult.uiReplaced),
    eventActivated: Boolean(noopResult.eventActivated)
  };
}

function runPairFlow() {
  const targetWindow = {};
  const guardedEntry = GuardedEntryCandidate.createShadowBridgeBrowserGuardedEntryCandidate({});
  const registration = ExposureCandidate.registerShadowBridgeBrowserExposureCandidate(targetWindow, guardedEntry, {
    enabled: true,
    allowGlobalRegistration: true
  });
  const noopResult = targetWindow.ShadowBridgeGuardedEntry.runShadowBridgeGuardedEntry(null, { enabled: false });
  const unregister = ExposureCandidate.unregisterShadowBridgeBrowserExposureCandidate(targetWindow);
  return {
    ok: registration.ok === true && registration.registered === true && noopResult.ok === true && unregister.unregistered === true,
    registered: Boolean(registration.registered),
    noopResultOk: Boolean(noopResult.ok && noopResult.safeToProceed && noopResult.noop),
    unregistered: Boolean(unregister.unregistered),
    scriptCountEstimate: 2,
    registrationLayerCount: 2,
    runtimeTouched: Boolean(noopResult.runtimeTouched),
    saveTouched: Boolean(noopResult.saveTouched),
    uiReplaced: Boolean(noopResult.uiReplaced),
    eventActivated: Boolean(noopResult.eventActivated)
  };
}

const bundle = runBundleFlow();
const pair = runPairFlow();
const result = {
  ok: bundle.ok === true && pair.ok === true,
  safeToProceed: bundle.ok === true && pair.ok === true,
  bundle,
  pair,
  conclusion: 'bundle_reduces_loading_dependency_complexity',
  runtimeTouched: bundle.runtimeTouched || pair.runtimeTouched,
  saveTouched: bundle.saveTouched || pair.saveTouched,
  uiReplaced: bundle.uiReplaced || pair.uiReplaced,
  eventActivated: bundle.eventActivated || pair.eventActivated
};

console.log(JSON.stringify(result, null, 2));

if (!result.ok) {
  process.exitCode = 1;
}

