'use strict';

const NOOP_HOOK_PATCH_PROPOSAL = Object.freeze({
  phase: 57,
  status: 'proposal_only',
  file: 'app.js',
  location: 'At the first line inside function runEventStateMachine(nowMs), before const eventEngine = window.GrowSimEventEngine;',
  helperName: 'runEventV2ShadowBridgeBrowserNoopPreflight',
  callLine: 'runEventV2ShadowBridgeBrowserNoopPreflight();',
  usesLiveState: false,
  usesReturnValueForGameplay: false,
  registersGuardedEntry: 'explicit_only_if_api_present',
  snapshotAllowed: false,
  rollback: Object.freeze([
    'Remove runEventV2ShadowBridgeBrowserNoopPreflight(); from runEventStateMachine(nowMs).',
    'Remove helper function runEventV2ShadowBridgeBrowserNoopPreflight().',
    'Re-run loading safety, browser registration smoke, combined report, guarded entry tests.'
  ]),
  patchSketch: String.raw`function runEventStateMachine(nowMs) {
  runEventV2ShadowBridgeBrowserNoopPreflight();
  const eventEngine = window.GrowSimEventEngine;
  if (eventEngine && typeof eventEngine.routeTick === 'function') {
    return eventEngine.routeTick(nowMs, state).result;
  }
  return callCanonicalEventsRuntime('runEventStateMachine', nowMs);
}

function runEventV2ShadowBridgeBrowserNoopPreflight() {
  try {
    const api = window.ShadowBridgeBrowserBridgeCandidate;
    if (!api || typeof api.registerShadowBridgeBrowserBridgeCandidate !== 'function') {
      return;
    }
    api.registerShadowBridgeBrowserBridgeCandidate(window, {
      enabled: true,
      allowGlobalRegistration: true
    });
    const bridge = window.ShadowBridgeGuardedEntry;
    if (!bridge || typeof bridge.runShadowBridgeGuardedEntry !== 'function') {
      return;
    }
    bridge.runShadowBridgeGuardedEntry(null, { enabled: false });
  } catch (error) {
    return;
  }
}`
});

function getShadowBridgeNoopHookPatchProposal() {
  return NOOP_HOOK_PATCH_PROPOSAL;
}

module.exports = {
  NOOP_HOOK_PATCH_PROPOSAL,
  getShadowBridgeNoopHookPatchProposal
};
