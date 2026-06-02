#!/usr/bin/env node
'use strict';

const assert = require('assert');
const Bridge = require('../src/events/EventSystemRuntimeBridge.js');
const SaveShape = require('../src/events/v2/preview/EventV2SaveShapePreview.js');

const PILOT_EVENT_ID = 'indoor_dry_rootball';
const PILOT_OPTION_ID = 'stabilize';

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function createState(instanceId, statusOverrides) {
  return {
    status: {
      health: 85,
      stress: 20,
      risk: 30,
      water: 60,
      nutrition: 55,
      growth: 25,
      ...(statusOverrides || {}),
    },
    simulation: {
      nowMs: 1779785000000,
      simTimeMs: 123456,
    },
    events: {
      machineState: 'activeEvent',
      activeEventId: 'legacy_v1_read_only_event',
      activeEventTitle: 'Legacy V1 Read Only Event',
      activeEventText: 'Old V1 data should remain readable.',
      activeOptions: [{ id: 'legacy_choice', label: 'Legacy choice' }],
      history: [
        { eventId: 'legacy_v1_history_entry', optionId: 'legacy_choice' },
      ],
      scheduler: {},
    },
    eventV2: {
      schemaVersion: 1,
      mode: 'active',
      openEvents: [
        {
          eventId: PILOT_EVENT_ID,
          instanceId,
          eventVersion: 3,
          createdAt: 1779785000000,
          stage: 'vegetative',
          category: 'care',
          severity: 'warning',
          source: 'event-center-v2-apply-delta-pilot-smoke',
          options: ['inspect', 'stabilize', 'overreact'],
          status: 'active',
          previewPayload: {
            title: 'Indoor dry rootball',
            description: 'The rootball is drying unevenly and needs a measured response.',
          },
        },
      ],
      history: [],
      meta: {
        lastGeneratedAt: 1779785000000,
        lastResolvedAt: null,
        lastAuditAt: null,
        lastError: null,
        counters: {
          generated: 1,
          resolved: 0,
          rejected: 0,
          expired: 0,
        },
      },
    },
  };
}

function assertWithinStatusBounds(status) {
  ['health', 'stress', 'risk', 'water', 'nutrition', 'growth'].forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(status, key)) {
      assert(Number.isFinite(Number(status[key])), `${key} should remain numeric`);
      assert(Number(status[key]) >= 0, `${key} should not fall below 0`);
      assert(Number(status[key]) <= 100, `${key} should not exceed 100`);
    }
  });
}

function runStabilizeApplySmoke() {
  const state = createState('evt_v2_apply_delta_pilot_stabilize_001');
  const beforeStatus = cloneJson(state.status);
  const beforeV1HistoryLength = state.events.history.length;

  const resolved = Bridge.resolveEventCenterV2PilotEvent(state, PILOT_OPTION_ID, {
    now: state.simulation.nowMs + 1000,
  });

  assert.strictEqual(resolved.ok, true, 'stabilize should resolve through V2 pilot');
  assert.strictEqual(resolved.eventId, PILOT_EVENT_ID, 'resolved event id should match pilot event');
  assert.strictEqual(resolved.selectedOption, PILOT_OPTION_ID, 'resolved option should be stabilize');
  assert.strictEqual(resolved.v1Wrote, false, 'V1 must not write in parallel');
  assert.strictEqual(state.events.history.length, beforeV1HistoryLength, 'V1 history must not grow');
  assert.strictEqual(state.eventV2.openEvents.length, 0, 'openEvents should be empty after resolve');
  assert.strictEqual(state.eventV2.history.length, 1, 'history should contain one resolved entry');

  const historyEntry = state.eventV2.history[0];
  assert(historyEntry.applyPreview, 'applyPreview should be retained in history');
  assert(historyEntry.appliedDelta, 'appliedDelta should be documented in history');
  assert.strictEqual(historyEntry.appliedDelta.applied, true, 'stabilize should apply the pilot delta');
  assert.strictEqual(historyEntry.appliedDelta.eventId, PILOT_EVENT_ID, 'appliedDelta event id should match');
  assert.strictEqual(historyEntry.appliedDelta.selectedOption, PILOT_OPTION_ID, 'appliedDelta option should match');
  assert(Array.isArray(historyEntry.appliedDelta.deltas), 'appliedDelta.deltas should be an array');
  assert(historyEntry.appliedDelta.deltas.length >= 1, 'at least one allowed delta should be applied');
  assert.strictEqual(resolved.applyDeltaAppliedToStatus, true, 'result should report status delta applied');
  assert.strictEqual(resolved.productiveWrite, false, 'pilot must not report productive storage write');
  assert.strictEqual(resolved.usedProductiveStorage, false, 'pilot must not use productive storage');

  const changedAllowedStatus = ['stress', 'risk', 'water'].some((key) => state.status[key] !== beforeStatus[key]);
  assert.strictEqual(changedAllowedStatus, true, 'at least one allowed status value should change');
  assertWithinStatusBounds(state.status);

  const shape = SaveShape.validateEventV2SaveShape(state.eventV2);
  assert.strictEqual(shape.ok, true, `eventV2 shape should remain valid: ${shape.errors.join(', ')}`);

  const reloaded = cloneJson(state);
  assert.deepStrictEqual(reloaded.status, state.status, 'reload-like clone should preserve changed status');
  assert.strictEqual(reloaded.eventV2.history.length, 1, 'reload-like clone should preserve one history entry');
  assert.strictEqual(reloaded.eventV2.history[0].appliedDelta.applied, true, 'reload-like clone should preserve appliedDelta marker');

  const duplicateBeforeStatus = cloneJson(reloaded.status);
  const duplicate = Bridge.resolveEventCenterV2PilotEvent(reloaded, PILOT_OPTION_ID, {
    now: state.simulation.nowMs + 2000,
  });
  assert.strictEqual(duplicate.ok, false, 'duplicate resolve after reload should be blocked because open event is gone');
  assert.deepStrictEqual(reloaded.status, duplicateBeforeStatus, 'duplicate resolve must not apply delta again');
  assert.strictEqual(reloaded.eventV2.history.length, 1, 'duplicate resolve must not create another history entry');

  return {
    resolved,
    beforeStatus,
    afterStatus: cloneJson(state.status),
    appliedDelta: cloneJson(historyEntry.appliedDelta),
    saveShapeOk: shape.ok,
  };
}

function runPreviewOnlyOptionSmoke(optionId) {
  const state = createState(`evt_v2_apply_delta_pilot_${optionId}_001`);
  const beforeStatus = cloneJson(state.status);
  const resolved = Bridge.resolveEventCenterV2PilotEvent(state, optionId, {
    now: state.simulation.nowMs + 1000,
  });

  assert.strictEqual(resolved.ok, true, `${optionId} should still resolve as pilot preview`);
  assert.strictEqual(resolved.applyDeltaAppliedToStatus, false, `${optionId} must not apply a real status delta`);
  assert.deepStrictEqual(state.status, beforeStatus, `${optionId} must leave status unchanged`);
  assert.strictEqual(state.eventV2.history.length, 1, `${optionId} should still create a V2 history entry`);
  assert.strictEqual(state.eventV2.history[0].appliedDelta.applied, false, `${optionId} should record non-applied delta marker`);
  assert.strictEqual(resolved.usedProductiveStorage, false, `${optionId} must not use productive storage`);
}

function runInvalidOptionSmoke() {
  const state = createState('evt_v2_apply_delta_pilot_invalid_001');
  const beforeStatus = cloneJson(state.status);
  const invalid = Bridge.resolveEventCenterV2PilotEvent(state, 'not_a_real_option', {
    now: state.simulation.nowMs + 1000,
  });
  assert.strictEqual(invalid.ok, false, 'invalid option should be blocked');
  assert.deepStrictEqual(state.status, beforeStatus, 'invalid option must not mutate status');
  assert.strictEqual(state.eventV2.openEvents.length, 1, 'invalid option must keep open event');
  assert.strictEqual(state.eventV2.history.length, 0, 'invalid option must not create history');
}

function runClampSmoke() {
  const state = createState('evt_v2_apply_delta_pilot_clamp_001', {
    stress: 0,
    risk: 0,
    water: 100,
  });
  const resolved = Bridge.resolveEventCenterV2PilotEvent(state, PILOT_OPTION_ID, {
    now: state.simulation.nowMs + 1000,
  });
  assert.strictEqual(resolved.ok, true, 'stabilize should resolve at bounds');
  assertWithinStatusBounds(state.status);
}

function runSmoke() {
  const stabilize = runStabilizeApplySmoke();
  runPreviewOnlyOptionSmoke('inspect');
  runPreviewOnlyOptionSmoke('overreact');
  runInvalidOptionSmoke();
  runClampSmoke();

  const summary = {
    ok: true,
    mode: 'event_center_v2_apply_delta_pilot_smoke',
    eventId: PILOT_EVENT_ID,
    productiveWrite: false,
    usedProductiveStorage: false,
    v1DidNotWriteParallel: stabilize.resolved.v1Wrote === false,
    openEventsAfterResolve: 0,
    historyContainsAppliedDelta: stabilize.appliedDelta.applied === true,
    appliedDeltaTargets: stabilize.appliedDelta.deltas.map((delta) => delta.target),
    beforeStatus: stabilize.beforeStatus,
    afterStatus: stabilize.afterStatus,
    saveShapeOk: stabilize.saveShapeOk,
    previewOnlyOptionsChecked: ['inspect', 'overreact'],
    invalidOptionBlocked: true,
    reloadDoesNotDoubleApply: true,
  };

  console.log(JSON.stringify(summary, null, 2));
}

runSmoke();
