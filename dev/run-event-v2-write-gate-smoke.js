#!/usr/bin/env node
/* eslint-env node */
'use strict';

const assert = require('assert');
const {
  createEmptyEventV2SaveShape,
} = require('../src/events/v2/preview/EventV2SaveShapePreview.js');
const {
  evaluateEventV2WriteAuthority,
  runEventV2WriteGatePreview,
} = require('../src/events/v2/preview/EventV2WriteGatePreview.js');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertNoWrite(result) {
  assert.strictEqual(result.wouldWrite, false, 'wouldWrite must stay false');
  assert.strictEqual(result.usedProductiveStorage, false, 'usedProductiveStorage must stay false');
}

function createStateWithMode(mode) {
  return {
    events: {
      activeEventId: 'legacy_active_event',
      history: [{ eventId: 'legacy_history_entry' }],
    },
    eventV2: createEmptyEventV2SaveShape({
      mode,
    }),
  };
}

function testMissingEventV2FallsBackToV1() {
  const state = {
    events: {
      activeEventId: 'legacy_active_event',
    },
  };
  const before = clone(state);
  const result = evaluateEventV2WriteAuthority({ state });

  assert.strictEqual(result.ok, true, 'missing eventV2 should stay operable');
  assert.strictEqual(result.gateMode, 'v1-only', 'missing eventV2 should use v1-only');
  assert.strictEqual(result.authority, 'v1', 'authority should remain v1');
  assert.strictEqual(result.v1CanWrite, true, 'v1 should be able to write');
  assert.strictEqual(result.v2CanWrite, false, 'v2 should not write');
  assert.strictEqual(result.singleAuthority, true, 'single authority should hold');
  assert.deepStrictEqual(state, before, 'state must not mutate');
  assertNoWrite(result);
  return result;
}

function testNoWriteModeKeepsV1Authority() {
  const state = createStateWithMode('no-write');
  const before = clone(state);
  const result = evaluateEventV2WriteAuthority({ state });

  assert.strictEqual(result.ok, true, 'no-write mode should pass');
  assert.strictEqual(result.gateMode, 'v1-only', 'no-write maps to v1-only');
  assert.strictEqual(result.authority, 'v1', 'authority should remain v1');
  assert.strictEqual(result.v2CanWrite, false, 'v2 must not write');
  assert.deepStrictEqual(state, before, 'state must not mutate');
  assertNoWrite(result);
  return result;
}

function testDryRunModeAllowsDryRunOnly() {
  const state = createStateWithMode('dry-run');
  const result = evaluateEventV2WriteAuthority({ state });

  assert.strictEqual(result.ok, true, 'dry-run mode should pass');
  assert.strictEqual(result.gateMode, 'v2-dry-run', 'dry-run maps to v2-dry-run');
  assert.strictEqual(result.authority, 'v1', 'authority should remain v1');
  assert.strictEqual(result.v1CanWrite, true, 'v1 should remain write authority');
  assert.strictEqual(result.v2CanWrite, false, 'v2 should not write in dry-run');
  assert.strictEqual(result.v2CanDryRun, true, 'v2 dry-run should be enabled');
  assert.strictEqual(result.singleAuthority, true, 'single authority should hold');
  assertNoWrite(result);
  return result;
}

function testActiveWithoutExplicitAllowIsBlocked() {
  const state = createStateWithMode('active');
  const result = evaluateEventV2WriteAuthority({ state });

  assert.strictEqual(result.ok, false, 'active without explicit allow should block');
  assert.strictEqual(result.authority, 'blocked', 'authority should block');
  assert.strictEqual(result.gateMode, 'blocked', 'gateMode should be blocked');
  assert(result.errors.includes('v2_active_not_explicitly_allowed'), 'active must require explicit allow');
  assertNoWrite(result);
  return result;
}

function testActiveWithExplicitAllowIsSingleAuthority() {
  const state = createStateWithMode('active');
  const result = evaluateEventV2WriteAuthority({
    state,
    allowV2ActiveWriteAuthority: true,
  });

  assert.strictEqual(result.ok, true, 'active with explicit allow should pass');
  assert.strictEqual(result.gateMode, 'v2-active', 'gateMode should stay v2-active');
  assert.strictEqual(result.authority, 'v2', 'authority should move to v2');
  assert.strictEqual(result.v1CanWrite, false, 'v1 should be off for single authority');
  assert.strictEqual(result.v2CanWrite, true, 'v2 can write theoretically');
  assert.strictEqual(result.singleAuthority, true, 'single authority should hold');
  assertNoWrite(result);
  return result;
}

function testInvalidModeBlocked() {
  const state = createStateWithMode('no-write');
  state.eventV2.mode = 'surprise-mode';
  const result = evaluateEventV2WriteAuthority({ state });

  assert.strictEqual(result.ok, false, 'invalid mode should block');
  assert.strictEqual(result.authority, 'blocked');
  assert(result.errors.includes('event_v2_shape_invalid'), 'shape invalid expected');
  assert(result.errors.includes('invalid_mode'), 'invalid_mode expected');
  assertNoWrite(result);
  return result;
}

function testInvalidSchemaVersionBlocked() {
  const state = createStateWithMode('no-write');
  state.eventV2.schemaVersion = 999;
  const result = evaluateEventV2WriteAuthority({ state });

  assert.strictEqual(result.ok, false, 'invalid schema should block');
  assert.strictEqual(result.authority, 'blocked');
  assert(result.errors.includes('unknown_schema_version'), 'unknown_schema_version expected');
  assertNoWrite(result);
  return result;
}

function testDoubleWriteAuthorityBlocked() {
  const state = createStateWithMode('active');
  const result = evaluateEventV2WriteAuthority({
    state,
    allowV2ActiveWriteAuthority: true,
    forceV1WriteIntent: true,
    forceV2WriteIntent: true,
    allowV1WriteWhenV2Active: true,
  });

  assert.strictEqual(result.ok, false, 'double write authority should block');
  assert.strictEqual(result.authority, 'blocked');
  assert(result.errors.includes('single_authority_conflict'), 'single_authority_conflict expected');
  assert(result.errors.includes('double_write_authority_detected'), 'double_write_authority_detected expected');
  assertNoWrite(result);
  return result;
}

function testRunPreviewNoMutation() {
  const state = createStateWithMode('dry-run');
  const before = clone(state);
  const result = runEventV2WriteGatePreview({ state });

  assert.strictEqual(result.ok, true, 'preview run should pass');
  assert.strictEqual(result.stateMutated, false, 'preview run must not mutate state');
  assert.deepStrictEqual(state, before, 'input state must stay unchanged');
  assertNoWrite(result);
  return result;
}

function main() {
  const results = {
    missingEventV2: testMissingEventV2FallsBackToV1(),
    noWriteMode: testNoWriteModeKeepsV1Authority(),
    dryRunMode: testDryRunModeAllowsDryRunOnly(),
    activeBlocked: testActiveWithoutExplicitAllowIsBlocked(),
    activeAllowedSingle: testActiveWithExplicitAllowIsSingleAuthority(),
    invalidModeBlocked: testInvalidModeBlocked(),
    invalidSchemaBlocked: testInvalidSchemaVersionBlocked(),
    doubleWriteBlocked: testDoubleWriteAuthorityBlocked(),
    previewNoMutation: testRunPreviewNoMutation(),
  };

  const report = {
    ok: true,
    mode: 'event_v2_write_gate_smoke',
    summary: {
      missingEventV2FallsBackToV1: results.missingEventV2.ok && results.missingEventV2.authority === 'v1',
      noWriteKeepsV1: results.noWriteMode.authority === 'v1' && results.noWriteMode.v2CanWrite === false,
      dryRunNoWrite: results.dryRunMode.v2CanDryRun === true && results.dryRunMode.v2CanWrite === false,
      activeWithoutAllowBlocked: results.activeBlocked.ok === false,
      activeWithAllowSingleAuthority: results.activeAllowedSingle.singleAuthority === true,
      invalidModeBlocked: results.invalidModeBlocked.ok === false,
      invalidSchemaBlocked: results.invalidSchemaBlocked.ok === false,
      doubleWriteBlocked: results.doubleWriteBlocked.ok === false,
      previewNoMutation: results.previewNoMutation.stateMutated === false,
      noWriteDefault: Object.values(results).every((entry) => entry.wouldWrite === false),
      usedProductiveStorage: Object.values(results).some((entry) => entry.usedProductiveStorage === true),
      usedProductiveStorageFalse: Object.values(results).every((entry) => entry.usedProductiveStorage === false),
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
