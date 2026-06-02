#!/usr/bin/env node
/* eslint-env node */
'use strict';

const assert = require('assert');
const {
  EVENT_V2_SAVE_SCHEMA_VERSION,
  createEmptyEventV2SaveShape,
  previewEventV2SaveShape,
  validateOpenEventEntry,
  validateHistoryEntry,
} = require('../src/events/v2/preview/EventV2SaveShapePreview.js');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createValidOpenEvent() {
  return {
    eventId: 'indoor_dry_rootball',
    instanceId: 'evt2_indoor_dry_rootball_001',
    eventVersion: 3,
    createdAt: 3600000,
    stage: 'vegetative',
    category: 'care',
    severity: 'warning',
    source: 'event_v2_preview_smoke',
    options: ['inspect', 'stabilize', 'overreact'],
    status: 'preview',
    previewPayload: {
      noWrite: true,
    },
  };
}

function createValidHistoryEntry() {
  return {
    eventId: 'indoor_dry_rootball',
    instanceId: 'evt2_indoor_dry_rootball_001',
    resolvedAt: 4200000,
    selectedOption: 'stabilize',
    result: 'apply_preview_created_no_write',
    applyPreview: {
      mutationTargets: ['status.stress', 'status.risk'],
      persisted: false,
    },
    writeMode: 'no-write',
    schemaVersion: EVENT_V2_SAVE_SCHEMA_VERSION,
    source: 'event_v2_resolve_apply_contract',
  };
}

function assertNoWrite(result) {
  assert.strictEqual(result.wouldWrite, false, 'wouldWrite must stay false');
  assert.strictEqual(result.canMutateState, false, 'canMutateState must stay false');
  assert.strictEqual(result.canMutateSave, false, 'canMutateSave must stay false');
  assert.strictEqual(result.noWriteDefault, true, 'noWriteDefault must stay true');
  assert.strictEqual(result.diagnostics.stateMutations, 0, 'stateMutations must be 0');
  assert.strictEqual(result.diagnostics.saveWrites, 0, 'saveWrites must be 0');
  assert.strictEqual(result.diagnostics.localStorageWrites, 0, 'localStorageWrites must be 0');
  assert.strictEqual(result.diagnostics.indexedDbWrites, 0, 'indexedDbWrites must be 0');
}

function runEmptyState() {
  const state = {};
  const before = clone(state);
  const result = previewEventV2SaveShape(state);

  assert.strictEqual(result.ok, true, 'empty state should produce safe default shape');
  assert.strictEqual(result.wouldInitialize, true, 'missing eventV2 should be initialization preview');
  assert.strictEqual(result.shape.mode, 'no-write', 'shape mode should default to no-write');
  assert.deepStrictEqual(state, before, 'empty state must not mutate');
  assertNoWrite(result);
  return result;
}

function runMissingEventV2() {
  const state = { events: { activeEventId: 'legacy_event' } };
  const before = clone(state);
  const result = previewEventV2SaveShape(state);

  assert.strictEqual(result.ok, true, 'missing eventV2 should be accepted as dry-run proposal');
  assert.strictEqual(result.wouldInitialize, true, 'missing eventV2 should report wouldInitialize');
  assert.deepStrictEqual(state, before, 'state with missing eventV2 must not mutate');
  assertNoWrite(result);
  return result;
}

function runValidExistingShape() {
  const state = {
    eventV2: createEmptyEventV2SaveShape({
      mode: 'no-write',
      openEvents: [createValidOpenEvent()],
      history: [createValidHistoryEntry()],
    }),
  };
  const before = clone(state);
  const result = previewEventV2SaveShape(state);

  assert.strictEqual(result.ok, true, 'valid shape should pass');
  assert.strictEqual(result.wouldInitialize, false, 'existing eventV2 should not initialize');
  assert.strictEqual(result.entryResults.openEvents[0].ok, true, 'valid open event should pass');
  assert.strictEqual(result.entryResults.history[0].ok, true, 'valid history should pass');
  assert.deepStrictEqual(state, before, 'valid state must not mutate');
  assertNoWrite(result);
  return result;
}

function runInvalidSchemaVersion() {
  const state = { eventV2: createEmptyEventV2SaveShape({ mode: 'no-write' }) };
  state.eventV2.schemaVersion = 99;
  const before = clone(state);
  const result = previewEventV2SaveShape(state);

  assert.strictEqual(result.ok, false, 'unknown schema version should fail');
  assert.strictEqual(result.unknownVersion, true, 'unknownVersion should be marked');
  assert(result.errors.includes('unknown_schema_version'), 'unknown_schema_version expected');
  assert.deepStrictEqual(state, before, 'invalid schema state must not mutate');
  assertNoWrite(result);
  return result;
}

function runInvalidMode() {
  const state = { eventV2: createEmptyEventV2SaveShape() };
  state.eventV2.mode = 'write-now';
  const before = clone(state);
  const result = previewEventV2SaveShape(state);

  assert.strictEqual(result.ok, false, 'invalid mode should fail');
  assert(result.errors.includes('invalid_mode'), 'invalid_mode expected');
  assert.deepStrictEqual(state, before, 'invalid mode state must not mutate');
  assertNoWrite(result);
  return result;
}

function runInvalidOpenEvent() {
  const entryResult = validateOpenEventEntry({ eventId: 'missing_everything_else' }, 0);
  assert.strictEqual(entryResult.ok, false, 'invalid open event should fail');
  assert(entryResult.errors.includes('open_event_missing_instance_id'), 'open event missing instance id expected');

  const state = { eventV2: createEmptyEventV2SaveShape({ openEvents: [{ eventId: 'missing_everything_else' }] }) };
  const before = clone(state);
  const result = previewEventV2SaveShape(state);

  assert.strictEqual(result.ok, false, 'shape with invalid open event should fail');
  assert(result.errors.includes('open_event_missing_options'), 'open event missing options expected');
  assert.deepStrictEqual(state, before, 'invalid open event state must not mutate');
  assertNoWrite(result);
  return result;
}

function runInvalidHistoryEntry() {
  const entryResult = validateHistoryEntry({ eventId: 'missing_everything_else' }, 0);
  assert.strictEqual(entryResult.ok, false, 'invalid history should fail');
  assert(entryResult.errors.includes('history_missing_instance_id'), 'history missing instance id expected');

  const state = { eventV2: createEmptyEventV2SaveShape({ history: [{ eventId: 'missing_everything_else' }] }) };
  const before = clone(state);
  const result = previewEventV2SaveShape(state);

  assert.strictEqual(result.ok, false, 'shape with invalid history should fail');
  assert(result.errors.includes('history_missing_apply_preview'), 'history missing apply preview expected');
  assert.deepStrictEqual(state, before, 'invalid history state must not mutate');
  assertNoWrite(result);
  return result;
}

function runValidEntryValidators() {
  const openEvent = validateOpenEventEntry(createValidOpenEvent(), 0);
  const history = validateHistoryEntry(createValidHistoryEntry(), 0);

  assert.strictEqual(openEvent.ok, true, 'valid open event entry should pass');
  assert.strictEqual(history.ok, true, 'valid history entry should pass');

  return { openEvent, history };
}

function main() {
  const results = {
    emptyState: runEmptyState(),
    missingEventV2: runMissingEventV2(),
    validExistingShape: runValidExistingShape(),
    invalidSchemaVersion: runInvalidSchemaVersion(),
    invalidMode: runInvalidMode(),
    invalidOpenEvent: runInvalidOpenEvent(),
    invalidHistoryEntry: runInvalidHistoryEntry(),
    validEntryValidators: runValidEntryValidators(),
  };

  const report = {
    ok: true,
    mode: 'event_v2_save_shape_dry_run_smoke',
    schemaVersion: EVENT_V2_SAVE_SCHEMA_VERSION,
    summary: {
      emptyStateSafe: results.emptyState.ok,
      missingEventV2DryRunOnly: results.missingEventV2.wouldInitialize && !results.missingEventV2.wouldWrite,
      validShapeAccepted: results.validExistingShape.ok,
      invalidSchemaRejected: !results.invalidSchemaVersion.ok,
      invalidModeRejected: !results.invalidMode.ok,
      invalidOpenEventRejected: !results.invalidOpenEvent.ok,
      invalidHistoryRejected: !results.invalidHistoryEntry.ok,
      validOpenEventAccepted: results.validEntryValidators.openEvent.ok,
      validHistoryAccepted: results.validEntryValidators.history.ok,
      noWriteDefault: Object.values(results)
        .filter((result) => result && result.diagnostics)
        .every((result) => result.noWriteDefault === true && result.wouldWrite === false),
      saveWrites: Object.values(results)
        .filter((result) => result && result.diagnostics)
        .reduce((sum, result) => sum + Number(result.diagnostics.saveWrites || 0), 0),
    },
  };

  console.log(JSON.stringify(report, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}

