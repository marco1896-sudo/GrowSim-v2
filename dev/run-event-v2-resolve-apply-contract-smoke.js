#!/usr/bin/env node
/* eslint-env node */
'use strict';

const assert = require('assert');
const {
  SUPPORTED_EVENT_ID,
  SUPPORTED_EVENT_VERSION,
  evaluateResolveApplyContract,
} = require('../src/events/v2/preview/EventV2ResolveApplyContract.js');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createState() {
  return {
    status: {
      stress: 22,
      risk: 18,
      health: 76,
    },
    simulation: {
      simTimeMs: 3600000,
    },
    events: {
      activeEventId: 'legacy_event_should_not_change',
      history: [{ eventId: 'legacy_history_entry' }],
    },
  };
}

function assertNoWrite(result) {
  assert.strictEqual(result.canMutateState, false, 'canMutateState must stay false');
  assert.strictEqual(result.canMutateSave, false, 'canMutateSave must stay false');
  assert.strictEqual(result.canApplyNow, false, 'canApplyNow must stay false');
  assert.strictEqual(result.noWriteDefault, true, 'noWriteDefault must stay true');
  assert.strictEqual(result.diagnostics.stateMutations, 0, 'stateMutations must be 0');
  assert.strictEqual(result.diagnostics.saveWrites, 0, 'saveWrites must be 0');
  assert.strictEqual(result.diagnostics.localStorageWrites, 0, 'localStorageWrites must be 0');
  assert.strictEqual(result.diagnostics.indexedDbWrites, 0, 'indexedDbWrites must be 0');
}

function runValidResolve() {
  const state = createState();
  const before = clone(state);
  const result = evaluateResolveApplyContract({
    eventId: SUPPORTED_EVENT_ID,
    optionId: 'stabilize',
    eventVersion: SUPPORTED_EVENT_VERSION,
    currentState: state,
  });

  assert.strictEqual(result.ok, true, 'valid resolve should pass');
  assert.strictEqual(result.accepted, true, 'valid resolve should be accepted');
  assert.strictEqual(result.reason, 'apply_preview_created_no_write');
  assertNoWrite(result);
  assert.deepStrictEqual(state, before, 'original state must not mutate');
  assert.strictEqual(result.stateAfterPreview.status.stress, 21, 'stress preview should decrease by 1');
  assert.strictEqual(result.stateAfterPreview.status.risk, 17, 'risk preview should decrease by 1');
  assert.strictEqual(result.stateAfterPreview.status.health, 76, 'health should stay unchanged');
  assert.strictEqual(result.historyPreview.persisted, false, 'history preview must not persist');
  assert.deepStrictEqual(result.historyPreview.mutationTargets, ['status.stress', 'status.risk']);
  return result;
}

function runInvalidEventId() {
  const result = evaluateResolveApplyContract({
    eventId: 'unknown_event',
    optionId: 'stabilize',
    eventVersion: SUPPORTED_EVENT_VERSION,
    currentState: createState(),
  });

  assert.strictEqual(result.ok, false, 'invalid event should fail');
  assert.strictEqual(result.accepted, false, 'invalid event must be rejected');
  assert(result.errors.includes('unsupported_event_id'), 'unsupported_event_id expected');
  assertNoWrite(result);
  return result;
}

function runInvalidOption() {
  const result = evaluateResolveApplyContract({
    eventId: SUPPORTED_EVENT_ID,
    optionId: 'flood_pot_fast',
    eventVersion: SUPPORTED_EVENT_VERSION,
    currentState: createState(),
  });

  assert.strictEqual(result.ok, false, 'invalid option should fail');
  assert.strictEqual(result.accepted, false, 'invalid option must be rejected');
  assert(result.errors.includes('unsupported_option_id'), 'unsupported_option_id expected');
  assertNoWrite(result);
  return result;
}

function runMissingState() {
  const result = evaluateResolveApplyContract({
    eventId: SUPPORTED_EVENT_ID,
    optionId: 'inspect',
    eventVersion: SUPPORTED_EVENT_VERSION,
  });

  assert.strictEqual(result.ok, true, 'missing state should still create a safe preview');
  assert.strictEqual(result.accepted, true, 'missing state should not block no-write preview');
  assert.strictEqual(result.stateAfterPreview.status.risk, 0, 'missing risk defaults to clamped 0 after -1 delta');
  assertNoWrite(result);
  return result;
}

function runWriteModeRejected() {
  const state = createState();
  const before = clone(state);
  const result = evaluateResolveApplyContract({
    eventId: SUPPORTED_EVENT_ID,
    optionId: 'stabilize',
    eventVersion: SUPPORTED_EVENT_VERSION,
    currentState: state,
    requestedWriteMode: 'dev_write',
  });

  assert.strictEqual(result.ok, false, 'write mode should be rejected in this phase');
  assert(result.errors.includes('write_mode_not_enabled'), 'write_mode_not_enabled expected');
  assert.deepStrictEqual(state, before, 'write rejection must not mutate original state');
  assertNoWrite(result);
  return result;
}

function main() {
  const results = {
    validResolve: runValidResolve(),
    invalidEventId: runInvalidEventId(),
    invalidOption: runInvalidOption(),
    missingState: runMissingState(),
    writeModeRejected: runWriteModeRejected(),
  };

  const report = {
    ok: true,
    mode: 'event_v2_resolve_apply_contract_smoke',
    summary: {
      validResolveAccepted: results.validResolve.accepted,
      invalidEventRejected: !results.invalidEventId.accepted,
      invalidOptionRejected: !results.invalidOption.accepted,
      missingStateSafe: results.missingState.ok,
      writeModeRejected: !results.writeModeRejected.accepted,
      noWriteDefault: Object.values(results).every((result) => result.noWriteDefault === true),
      stateMutations: Object.values(results).reduce((sum, result) => sum + Number(result.diagnostics.stateMutations || 0), 0),
      saveWrites: Object.values(results).reduce((sum, result) => sum + Number(result.diagnostics.saveWrites || 0), 0),
    },
    checkedEventId: SUPPORTED_EVENT_ID,
    checkedEventVersion: SUPPORTED_EVENT_VERSION,
  };

  console.log(JSON.stringify(report, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
