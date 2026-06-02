#!/usr/bin/env node
'use strict';

const assert = require('assert');
const Bridge = require('../src/events/EventSystemRuntimeBridge.js');
const SaveShape = require('../src/events/v2/preview/EventV2SaveShapePreview.js');

const PILOT_EVENT_ID = 'indoor_dry_rootball';
const OVERREACT_OPTION_ID = 'overreact';

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function createState(instanceId) {
  return {
    status: {
      health: 85,
      stress: 20,
      risk: 30,
      water: 60,
      nutrition: 55,
      growth: 25
    },
    simulation: {
      nowMs: 1779785000000,
      simTimeMs: 123456
    },
    events: {
      machineState: 'activeEvent',
      activeEventId: 'legacy_v1_read_only_event',
      activeEventTitle: 'Legacy V1 Read Only Event',
      activeEventText: 'Old V1 data should remain readable.',
      activeOptions: [{ id: 'legacy_choice', label: 'Legacy choice' }],
      history: [{ eventId: 'legacy_v1_history_entry', optionId: 'legacy_choice' }],
      scheduler: {}
    },
    eventV2: {
      schemaVersion: 1,
      mode: 'active',
      openEvents: [{
        eventId: PILOT_EVENT_ID,
        instanceId,
        eventVersion: 3,
        createdAt: 1779785000000,
        stage: 'vegetative',
        category: 'care',
        severity: 'warning',
        source: 'event-center-v2-overreact-guardrail-smoke',
        options: ['inspect', 'stabilize', 'overreact'],
        status: 'active',
        previewPayload: {
          title: 'Trockener Wurzelballen',
          description: 'Der Wurzelballen trocknet ungleichmaessig aus.'
        }
      }],
      history: [],
      meta: {
        lastGeneratedAt: 1779785000000,
        lastResolvedAt: null,
        lastAuditAt: null,
        lastError: null,
        counters: { generated: 1, resolved: 0, rejected: 0, expired: 0 }
      }
    }
  };
}

function runSmoke() {
  const state = createState('evt_v2_overreact_guardrail_001');
  const beforeStatus = cloneJson(state.status);
  const beforeV1HistoryLength = state.events.history.length;

  const resolved = Bridge.resolveEventCenterV2PilotEvent(state, OVERREACT_OPTION_ID, {
    now: state.simulation.nowMs + 1000
  });

  assert.strictEqual(resolved.ok, true, 'overreact should resolve through V2');
  assert.strictEqual(state.eventV2.openEvents.length, 0, 'openEvents should be empty after overreact resolve');
  assert.strictEqual(state.eventV2.history.length, 1, 'overreact should create one history entry');

  const historyEntry = state.eventV2.history[0];
  assert.strictEqual(historyEntry.eventId, PILOT_EVENT_ID, 'history event id should match pilot event');
  assert.strictEqual(historyEntry.selectedOption, OVERREACT_OPTION_ID, 'selected option should be overreact');
  assert(historyEntry.applyPreview, 'applyPreview should remain stored');
  assert(historyEntry.appliedDelta, 'appliedDelta should be stored');
  assert.strictEqual(historyEntry.appliedDelta.applied, false, 'overreact must not apply real status delta yet');
  assert.strictEqual(historyEntry.appliedDelta.reason, 'guardrail_only', 'overreact should document guardrail_only reason');
  assert.deepStrictEqual(historyEntry.appliedDelta.deltas, [], 'overreact appliedDelta.deltas should be empty');
  assert.strictEqual(
    String(historyEntry.appliedDelta.warning || '').includes('stressen'),
    true,
    'overreact should include guardrail learning warning'
  );

  assert.deepStrictEqual(state.status, beforeStatus, 'overreact should not mutate status values');
  assert.strictEqual(state.events.history.length, beforeV1HistoryLength, 'V1 must not write in parallel');
  assert.strictEqual(resolved.applyDeltaAppliedToStatus, false, 'result should report no status delta applied');
  assert.strictEqual(resolved.applyDeltaStoredAsPilotPreview, true, 'result should mark overreact as guardrail-only');

  const shape = SaveShape.validateEventV2SaveShape(state.eventV2);
  assert.strictEqual(shape.ok, true, `eventV2 shape should remain valid: ${shape.errors.join(', ')}`);

  const reloadState = cloneJson(state);
  assert.strictEqual(reloadState.eventV2.openEvents.length, 0, 'reload clone should keep openEvents empty');
  assert.strictEqual(reloadState.eventV2.history.length, 1, 'reload clone should keep exactly one history entry');
  assert.strictEqual(reloadState.eventV2.history[0].selectedOption, OVERREACT_OPTION_ID, 'reload clone should keep overreact history');
  assert.deepStrictEqual(reloadState.status, beforeStatus, 'reload clone should keep unchanged status');

  const duplicate = Bridge.resolveEventCenterV2PilotEvent(reloadState, OVERREACT_OPTION_ID, {
    now: state.simulation.nowMs + 2000
  });
  assert.strictEqual(duplicate.ok, false, 'duplicate overreact resolve should be blocked after open event removal');
  assert.strictEqual(reloadState.eventV2.history.length, 1, 'duplicate overreact resolve must not duplicate history');

  const summary = {
    ok: true,
    mode: 'event_center_v2_overreact_guardrail_smoke',
    eventId: PILOT_EVENT_ID,
    selectedOption: OVERREACT_OPTION_ID,
    openEventsAfterResolve: state.eventV2.openEvents.length,
    historyCountAfterResolve: state.eventV2.history.length,
    overreactNoDeltaReason: historyEntry.appliedDelta.reason,
    warningPresent: Boolean(historyEntry.appliedDelta.warning),
    applyPreviewStored: Boolean(historyEntry.applyPreview),
    appliedDeltaStored: Boolean(historyEntry.appliedDelta),
    statusUnchanged: JSON.stringify(state.status) === JSON.stringify(beforeStatus),
    v1DidNotWriteParallel: state.events.history.length === beforeV1HistoryLength,
    reloadIdempotent: reloadState.eventV2.history.length === 1
  };

  console.log(JSON.stringify(summary, null, 2));
}

runSmoke();

