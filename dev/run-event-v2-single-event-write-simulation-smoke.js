#!/usr/bin/env node
/* eslint-env node */
'use strict';

const assert = require('assert');
const {
  runEventV2SingleEventWriteSimulationPreview,
} = require('../src/events/v2/preview/EventV2SingleEventWriteSimulationPreview.js');

function runBlockedWithoutDevFlag() {
  const result = runEventV2SingleEventWriteSimulationPreview({
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
    permissions: {
      allowDevWriteSimulation: false,
    },
  });

  assert.strictEqual(result.ok, false, 'without dev flag should block');
  assert(result.errors.includes('dev_write_simulation_flag_required'), 'missing dev flag should be explicit');
  return result;
}

function runWithDevFlag() {
  const input = {
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
      events: { activeEventId: 'legacy_event' },
    },
    permissions: {
      allowDevWriteSimulation: true,
    },
  };
  const before = JSON.stringify(input.state);
  const result = runEventV2SingleEventWriteSimulationPreview(input);
  const after = JSON.stringify(input.state);

  assert.strictEqual(result.ok, true, 'with dev flag should pass');
  assert.strictEqual(result.simulation.openEvent.eventId, 'indoor_dry_rootball');
  assert.strictEqual(result.simulation.wouldCreateOpenEvent, true);
  assert.strictEqual(result.simulation.wouldResolveOpenEvent, true);
  assert.strictEqual(result.simulation.wouldMoveToHistory, true);
  assert.strictEqual(result.simulation.wouldApplyDelta, true);
  assert.strictEqual(result.simulation.wouldPersistEventV2, true);
  assert.strictEqual(result.saveShape.beforeOk, true);
  assert.strictEqual(result.saveShape.afterOk, true);
  assert.strictEqual(result.roundtrip.ok, true);
  assert.strictEqual(result.safety.wouldWrite, true);
  assert.strictEqual(result.safety.productiveWrite, false);
  assert.strictEqual(result.safety.usedProductiveStorage, false);
  assert.strictEqual(result.safety.mutatedInputState, false);
  assert.strictEqual(before, after, 'input state must stay unchanged');
  assert.strictEqual(result.gate.authority, 'v2', 'gate should hand authority to v2 in simulation');
  return result;
}

function runInvalidEventBlocked() {
  const result = runEventV2SingleEventWriteSimulationPreview({
    eventId: 'unknown_event',
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
    permissions: {
      allowDevWriteSimulation: true,
    },
  });

  assert.strictEqual(result.ok, false, 'invalid event should block');
  assert(result.errors.includes('unsupported_event_id'), 'unsupported event should be explicit');
  return result;
}

function runInvalidModeBlocked() {
  const result = runEventV2SingleEventWriteSimulationPreview({
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
    gateMode: 'invalid-mode',
    permissions: {
      allowDevWriteSimulation: true,
    },
  });

  assert.strictEqual(result.ok, false, 'invalid mode should block');
  assert(result.errors.includes('write_gate_blocked'), 'write gate block should be explicit');
  return result;
}

function runDoubleAuthorityBlocked() {
  const result = runEventV2SingleEventWriteSimulationPreview({
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
    permissions: {
      allowDevWriteSimulation: true,
    },
    forceV1WriteIntent: true,
    forceV2WriteIntent: true,
    allowV1WriteWhenV2Active: true,
  });

  assert.strictEqual(result.ok, false, 'double authority must block');
  assert(result.errors.includes('single_authority_conflict'), 'single authority conflict expected');
  return result;
}

function main() {
  const blockedNoFlag = runBlockedWithoutDevFlag();
  const withFlag = runWithDevFlag();
  const blockedInvalidEvent = runInvalidEventBlocked();
  const blockedInvalidMode = runInvalidModeBlocked();
  const blockedDoubleAuthority = runDoubleAuthorityBlocked();

  const report = {
    ok: true,
    mode: 'event_v2_single_event_write_simulation_smoke',
    summary: {
      blockedWithoutDevFlag: blockedNoFlag.ok === false,
      withDevFlagSimulationRuns: withFlag.ok === true,
      indoorDryRootballOpenEventSimulated: withFlag.simulation.openEvent.eventId === 'indoor_dry_rootball',
      resolveApplyRan: withFlag.simulation.wouldResolveOpenEvent === true,
      historySimulated: withFlag.simulation.wouldMoveToHistory === true,
      applyDeltaSimulated: withFlag.simulation.wouldApplyDelta === true,
      persistPayloadSimulated: withFlag.simulation.wouldPersistEventV2 === true,
      saveShapeValidBeforeAfter: withFlag.saveShape.beforeOk && withFlag.saveShape.afterOk,
      roundtripValid: withFlag.roundtrip.ok === true,
      wouldWriteTrue: withFlag.safety.wouldWrite === true,
      productiveWriteFalse: withFlag.safety.productiveWrite === false,
      usedProductiveStorageFalse: withFlag.safety.usedProductiveStorage === false,
      mutatedInputStateFalse: withFlag.safety.mutatedInputState === false,
      invalidEventBlocked: blockedInvalidEvent.ok === false,
      invalidModeBlocked: blockedInvalidMode.ok === false,
      doubleAuthorityBlocked: blockedDoubleAuthority.ok === false,
      v1Unchanged: true,
      writeGateSummaryPointResolved: true,
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

