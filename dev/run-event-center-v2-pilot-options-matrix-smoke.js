#!/usr/bin/env node
/* eslint-env node */
'use strict';

const assert = require('assert');
const Bridge = require('../src/events/EventSystemRuntimeBridge.js');
const OutcomePolicy = require('../src/events/v2/runtime/EventV2OutcomePolicy.js');
const SeedTools = require('../src/events/v2/dev/EventV2PilotSeedDevTools.js');

const CASES = Object.freeze([
  {
    eventId: 'indoor_dry_rootball',
    optionId: 'stabilize',
    expectedMode: 'apply_delta',
    expectedReason: 'stabilizing_action',
    expectedStatusMutation: true,
  },
  {
    eventId: 'indoor_dry_rootball',
    optionId: 'inspect',
    expectedMode: 'no_delta',
    expectedReason: 'diagnostic_only',
    expectedStatusMutation: false,
  },
  {
    eventId: 'indoor_dry_rootball',
    optionId: 'overreact',
    expectedMode: 'guardrail_only',
    expectedReason: 'guardrail_only',
    expectedStatusMutation: false,
  },
  {
    eventId: 'shared_panic_watering_misread',
    optionId: 'check_weight_before_watering',
    expectedMode: 'no_delta',
    expectedReason: 'diagnostic_weight_check',
    expectedStatusMutation: false,
  },
  {
    eventId: 'shared_panic_watering_misread',
    optionId: 'inspect_rootzone_then_wait',
    expectedMode: 'no_delta',
    expectedReason: 'diagnostic_rootzone_check',
    expectedStatusMutation: false,
  },
  {
    eventId: 'shared_panic_watering_misread',
    optionId: 'water_on_panic_signal',
    expectedMode: 'guardrail_only',
    expectedReason: 'panic_reaction_guardrail',
    expectedStatusMutation: false,
  },
]);

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function createBaseState() {
  return {
    simulation: { nowMs: Date.now(), simTimeMs: 5000 },
    status: { health: 85, stress: 20, risk: 30, water: 60, nutrition: 55, growth: 25 },
    events: { history: [{ eventId: 'legacy_v1_history', optionId: 'legacy_choice' }] },
    ui: { openSheet: null },
  };
}

function seedCaseState(state, testCase, now, instanceId) {
  const reset = SeedTools.resetEventV2PilotState(state, {
    clearHistory: true,
    resetStatus: true,
    now,
  });
  assert.strictEqual(reset.ok, true, 'reset must succeed');

  if (testCase.eventId === 'indoor_dry_rootball') {
    const seed = SeedTools.seedIndoorDryRootballPilotEvent(state, { now, instanceId, clearHistory: true });
    assert.strictEqual(seed.ok, true, 'indoor seed must succeed');
    return seed;
  }

  const seed = SeedTools.seedSharedPanicWateringPilotEvent(state, { now, instanceId, clearHistory: true });
  assert.strictEqual(seed.ok, true, 'shared seed must succeed');
  return seed;
}

function readStatusSnapshot(state) {
  const status = state && state.status ? state.status : {};
  return {
    stress: Number(status.stress),
    risk: Number(status.risk),
    water: Number(status.water),
  };
}

function runCase(testCase, index) {
  const now = Date.now() + (index * 1000);
  const instanceId = `evt_v2_matrix_${testCase.eventId}_${testCase.optionId}_${index}`;
  const state = createBaseState();
  state.simulation.nowMs = now;
  const v1HistoryBefore = Array.isArray(state.events.history) ? state.events.history.length : 0;

  const policy = OutcomePolicy.resolveEventV2OutcomePolicy(testCase.eventId, testCase.optionId);
  assert.strictEqual(policy.ok, true, `policy must resolve for ${testCase.eventId}/${testCase.optionId}`);
  assert.strictEqual(policy.policy.mode, testCase.expectedMode, 'policy mode must match');
  assert.strictEqual(policy.policy.reason, testCase.expectedReason, 'policy reason must match');

  seedCaseState(state, testCase, now, instanceId);
  assert.strictEqual(Array.isArray(state.eventV2.openEvents), true, 'openEvents must exist after seed');
  assert.strictEqual(state.eventV2.openEvents.length, 1, 'exactly one open event expected after seed');
  assert.strictEqual(state.eventV2.openEvents[0].eventId, testCase.eventId, 'seeded event id must match case');

  const beforeStatus = readStatusSnapshot(state);
  const resolveResult = Bridge.resolveEventCenterV2PilotEvent(state, testCase.optionId, {
    now: now + 1,
    source: 'event-v2-pilot-options-matrix-smoke',
  });
  assert.strictEqual(resolveResult.ok, true, `resolve must succeed for ${testCase.eventId}/${testCase.optionId}`);
  assert.strictEqual(resolveResult.eventId, testCase.eventId, 'resolved event id must match case');
  assert.strictEqual(resolveResult.selectedOption, testCase.optionId, 'resolved option id must match case');

  assert.strictEqual(state.eventV2.openEvents.length, 0, 'openEvents must be empty after resolve');
  assert.strictEqual(Array.isArray(state.eventV2.history), true, 'history must exist');
  assert.strictEqual(state.eventV2.history.length, 1, 'history must contain exactly one entry');

  const entry = state.eventV2.history[0];
  assert.strictEqual(entry.eventId, testCase.eventId, 'history event id must match');
  assert.strictEqual(entry.selectedOption, testCase.optionId, 'history option id must match');
  assert.strictEqual(Boolean(entry.applyPreview && typeof entry.applyPreview === 'object'), true, 'applyPreview must exist');
  assert.strictEqual(Boolean(entry.appliedDelta && typeof entry.appliedDelta === 'object'), true, 'appliedDelta must exist');
  assert.strictEqual(String(entry.appliedDelta.reason || ''), testCase.expectedReason, 'appliedDelta reason must match');
  assert.strictEqual(Boolean(entry.appliedDelta.applied), testCase.expectedStatusMutation, 'applied flag must match expected mutation mode');

  const afterStatus = readStatusSnapshot(state);
  const statusMutated = (
    beforeStatus.stress !== afterStatus.stress
    || beforeStatus.risk !== afterStatus.risk
    || beforeStatus.water !== afterStatus.water
  );
  assert.strictEqual(statusMutated, testCase.expectedStatusMutation, 'status mutation expectation must match');

  const v1HistoryAfterResolve = Array.isArray(state.events.history) ? state.events.history.length : 0;
  assert.strictEqual(v1HistoryAfterResolve, v1HistoryBefore, 'V1 history must not change');

  const reloadedState = cloneJson(state);
  const reloadEntryCount = Array.isArray(reloadedState.eventV2.history) ? reloadedState.eventV2.history.length : 0;
  assert.strictEqual(reloadEntryCount, 1, 'reload must keep exactly one history entry');
  assert.strictEqual(reloadedState.eventV2.history[0].instanceId, entry.instanceId, 'reload must keep same resolved entry');
  assert.strictEqual(readStatusSnapshot(reloadedState).stress, afterStatus.stress, 'reload must keep stress');
  assert.strictEqual(readStatusSnapshot(reloadedState).risk, afterStatus.risk, 'reload must keep risk');
  assert.strictEqual(readStatusSnapshot(reloadedState).water, afterStatus.water, 'reload must keep water');

  return {
    ok: true,
    eventId: testCase.eventId,
    optionId: testCase.optionId,
    expectedMode: testCase.expectedMode,
    expectedReason: testCase.expectedReason,
    expectedStatusMutation: testCase.expectedStatusMutation,
    actualStatusMutation: statusMutated,
    reloadIdempotent: true,
    v1ParallelWriteBlocked: v1HistoryAfterResolve === v1HistoryBefore,
  };
}

function main() {
  const results = [];
  for (let index = 0; index < CASES.length; index += 1) {
    results.push(runCase(CASES[index], index + 1));
  }

  const passedCases = results.filter((entry) => entry.ok).length;
  const failedCases = results.length - passedCases;

  const summary = {
    ok: failedCases === 0,
    mode: 'event_center_v2_pilot_options_matrix_smoke',
    caseCount: results.length,
    passedCases,
    failedCases,
    events: Array.from(new Set(results.map((entry) => entry.eventId))),
    outcomeModes: Array.from(new Set(results.map((entry) => entry.expectedMode))).sort(),
    noUnexpectedStatusMutation: results.every((entry) => entry.actualStatusMutation === entry.expectedStatusMutation),
    reloadIdempotent: results.every((entry) => entry.reloadIdempotent === true),
    v1ParallelWriteBlocked: results.every((entry) => entry.v1ParallelWriteBlocked === true),
    cases: results,
  };

  console.log(JSON.stringify(summary, null, 2));
}

main();
