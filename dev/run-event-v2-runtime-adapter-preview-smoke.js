#!/usr/bin/env node
/* eslint-env node */
'use strict';

const assert = require('assert');
const {
  createEventV2RuntimePreviewContext,
  runEventV2RuntimeResolvePreview,
  validateEventV2RuntimePreviewResult,
  runEventV2RuntimeAdapterPreview,
} = require('../src/events/v2/preview/EventV2RuntimeAdapterPreview.js');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertNoWrite(result) {
  assert.strictEqual(result.wouldWrite, false, 'wouldWrite must remain false');
  assert.strictEqual(result.usedProductiveStorage, false, 'usedProductiveStorage must remain false');
}

function runHappyPath() {
  const input = {
    eventId: 'indoor_dry_rootball',
    selectedOption: 'stabilize',
    state: {
      eventV2: {
        schemaVersion: 1,
        mode: 'dry-run',
        openEvents: [],
        history: [],
        meta: {},
      },
    },
  };
  const before = clone(input.state);
  const context = createEventV2RuntimePreviewContext(input);
  const result = runEventV2RuntimeAdapterPreview(input);
  const validation = validateEventV2RuntimePreviewResult(result);

  assert.strictEqual(context.mode, 'dev-only-runtime-preview', 'context mode mismatch');
  assert.strictEqual(result.ok, true, 'happy path should pass');
  assert.strictEqual(result.gate.ok, true, 'gate should pass');
  assert.strictEqual(result.gate.gateMode, 'v2-dry-run', 'gate mode should be v2-dry-run');
  assert.strictEqual(result.gate.v2CanWrite, false, 'v2 cannot write in dry-run');
  assert.strictEqual(result.gate.v2CanDryRun, true, 'v2 dry-run should be enabled');
  assert.strictEqual(result.resolveApply.ok, true, 'resolve apply should pass');
  assert.strictEqual(result.saveShape.before.ok, true, 'save shape before should pass');
  assert.strictEqual(result.saveShape.after.ok, true, 'save shape after should pass');
  assert.strictEqual(result.roundtrip.ok, true, 'roundtrip should pass');
  assert.strictEqual(result.mutatedInputState, false, 'input state must not mutate');
  assert.strictEqual(validation.ok, true, 'result shape should validate');
  assert.deepStrictEqual(input.state, before, 'input state should remain unchanged');
  assertNoWrite(result);
  return result;
}

function runInvalidModeBlocked() {
  const result = runEventV2RuntimeResolvePreview({
    eventId: 'indoor_dry_rootball',
    selectedOption: 'stabilize',
    state: {
      eventV2: {
        schemaVersion: 1,
        mode: 'dry-run',
        openEvents: [],
        history: [],
        meta: {},
      },
    },
    gateMode: 'invalid-mode',
  });

  assert.strictEqual(result.ok, false, 'invalid gate mode should fail');
  assert.strictEqual(result.gate.ok, false, 'gate should be blocked');
  assert.strictEqual(result.gate.authority, 'blocked', 'authority should be blocked');
  assertNoWrite(result);
  return result;
}

function runActiveWithoutAllowBlocked() {
  const result = runEventV2RuntimeResolvePreview({
    eventId: 'indoor_dry_rootball',
    selectedOption: 'stabilize',
    state: {
      eventV2: {
        schemaVersion: 1,
        mode: 'active',
        openEvents: [],
        history: [],
        meta: {},
      },
    },
  });

  assert.strictEqual(result.ok, false, 'v2-active without allow should fail');
  assert.strictEqual(result.gate.ok, false, 'gate should block active without allow');
  assert(result.gate.errors.includes('v2_active_not_explicitly_allowed'), 'active must require explicit allow');
  assertNoWrite(result);
  return result;
}

function main() {
  const happy = runHappyPath();
  const invalidMode = runInvalidModeBlocked();
  const activeBlocked = runActiveWithoutAllowBlocked();

  const report = {
    ok: true,
    mode: 'event_v2_runtime_adapter_preview_smoke',
    summary: {
      contextCreated: happy.mode === 'dev-only-runtime-preview',
      saveShapeValid: happy.saveShape.before.ok && happy.saveShape.after.ok,
      gateBeforeResolve: Boolean(happy.gate && happy.resolveApply),
      dryRunNoWrite: happy.gate.gateMode === 'v2-dry-run' && happy.gate.v2CanWrite === false,
      resolveApplyForIndoorDryRootball: happy.resolveApply.eventId === 'indoor_dry_rootball',
      applyPreviewCreated: happy.resolveApply.reason === 'apply_preview_created_no_write',
      roundtripValid: happy.roundtrip.ok,
      invalidModeBlocked: invalidMode.gate.ok === false,
      activeWithoutAllowBlocked: activeBlocked.gate.ok === false,
      usedProductiveStorage: happy.usedProductiveStorage,
      mutatedInputState: happy.mutatedInputState,
      finalStructureStable: happy.resultValidation && happy.resultValidation.ok === true,
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

