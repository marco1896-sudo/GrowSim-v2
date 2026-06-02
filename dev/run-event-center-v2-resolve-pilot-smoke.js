#!/usr/bin/env node
'use strict';

const assert = require('assert');
const Bridge = require('../src/events/EventSystemRuntimeBridge.js');
const SaveShape = require('../src/events/v2/preview/EventV2SaveShapePreview.js');

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function createLegacyStateWithoutEventV2() {
  return {
    status: {
      health: 85,
      stress: 20,
      risk: 30,
    },
    simulation: {
      nowMs: 1779785000000,
      simTimeMs: 123456,
    },
    events: {
      machineState: 'activeEvent',
      activeEventId: 'legacy_root_warning',
      activeEventTitle: 'Legacy Root Warning',
      activeEventText: 'Old V1 data should remain readable.',
      activeOptions: [{ id: 'legacy_choice', label: 'Legacy choice' }],
      history: [
        { eventId: 'legacy_old_event', optionId: 'legacy_choice' },
      ],
      scheduler: {},
    },
  };
}

function assertNoRawI18nKeys(viewModel) {
  const values = [
    viewModel.title,
    viewModel.description,
    ...(Array.isArray(viewModel.options) ? viewModel.options.map((option) => option.label) : []),
  ].map((value) => String(value || ''));
  values.forEach((value) => {
    assert(!/^[a-z]+(\.[a-z0-9_${}]+)+$/i.test(value), `raw i18n-like key leaked: ${value}`);
    assert(!value.includes('${'), `template i18n key leaked: ${value}`);
  });
}

function runSmoke() {
  const state = createLegacyStateWithoutEventV2();
  const originalV1HistoryLength = state.events.history.length;

  const init = Bridge.ensureEventV2StateInPlace(state, {
    eventSystemMode: 'v2-active-with-v1-legacy-read',
    mode: 'active',
  });
  assert.strictEqual(init.ok, true, 'state without eventV2 should initialize defensively');
  assert(state.eventV2, 'eventV2 should exist after defensive init');
  assert.strictEqual(state.events.activeEventId, 'legacy_root_warning', 'legacy V1 event data should remain intact');

  const prepared = Bridge.prepareEventCenterV2PilotOpenEvent(state, {
    now: state.simulation.nowMs,
    instanceId: 'evt_v2_event_center_pilot_indoor_dry_rootball_smoke',
  });
  assert.strictEqual(prepared.ok, true, 'pilot event should be prepared');
  assert.strictEqual(prepared.openEvent.eventId, 'indoor_dry_rootball', 'pilot event id should match');
  assert.strictEqual(state.eventV2.openEvents.length, 1, 'pilot open event should be stored in eventV2.openEvents');

  const viewModel = Bridge.buildEventCenterV2PilotViewModel(state);
  assert.strictEqual(viewModel.ok, true, 'event center adapter should read V2 pilot event');
  assert.strictEqual(viewModel.hasPilotEvent, true, 'view model should expose pilot event');
  assert.strictEqual(viewModel.eventId, 'indoor_dry_rootball', 'view model event id should match');
  assert.deepStrictEqual(
    viewModel.options.map((option) => option.id).sort(),
    ['inspect', 'overreact', 'stabilize'].sort(),
    'pilot options should be recognized'
  );
  assertNoRawI18nKeys(viewModel);

  const resolved = Bridge.resolveEventCenterV2PilotEvent(state, 'stabilize', {
    now: state.simulation.nowMs + 1000,
  });
  assert.strictEqual(resolved.ok, true, 'stabilize should resolve through V2 pilot');
  assert.strictEqual(resolved.v2Resolved, true, 'result should be marked as V2 resolved');
  assert.strictEqual(resolved.v1Wrote, false, 'V1 must not write in parallel');
  assert.strictEqual(state.events.history.length, originalV1HistoryLength, 'legacy V1 history must not grow');
  assert.strictEqual(state.eventV2.openEvents.length, 0, 'open event should be removed after resolve');
  assert.strictEqual(state.eventV2.history.length, 1, 'history should contain resolved V2 event');
  assert.strictEqual(state.eventV2.history[0].eventId, 'indoor_dry_rootball', 'history event id should match');
  assert.strictEqual(state.eventV2.history[0].selectedOption, 'stabilize', 'history option should match');
  assert(
    state.eventV2.history[0].applyPreview
      && Array.isArray(state.eventV2.history[0].applyPreview.mutationPreview)
      && state.eventV2.history[0].applyPreview.mutationPreview.length > 0,
    'apply preview/delta should be present'
  );
  assert.strictEqual(resolved.applyDeltaAppliedToStatus, true, 'stabilize pilot should apply the minimal status delta');
  assert.strictEqual(resolved.applyDeltaStoredAsPilotPreview, false, 'stabilize pilot should not be preview-only anymore');
  assert(
    state.eventV2.history[0].appliedDelta
      && state.eventV2.history[0].appliedDelta.applied === true
      && Array.isArray(state.eventV2.history[0].appliedDelta.deltas)
      && state.eventV2.history[0].appliedDelta.deltas.length > 0,
    'applied delta should be documented in history'
  );

  const authority = Bridge.consultBrowserRuntimeBridge(state, {
    eventSystemMode: 'v2-active-with-v1-legacy-read',
    eventId: 'indoor_dry_rootball',
  });
  assert.strictEqual(authority.activeEventSystem, 'v2', 'bridge authority should remain V2');
  assert.strictEqual(authority.v1CanWriteEvents, false, 'V1 write should remain disabled');
  assert.strictEqual(authority.v2CanWriteEvents, true, 'V2 should be sole write authority in bridge path');

  const reloaded = cloneJson(state);
  const shapeAfterReload = SaveShape.validateEventV2SaveShape(reloaded.eventV2);
  assert.strictEqual(shapeAfterReload.ok, true, `save/reload-like shape should remain valid: ${shapeAfterReload.errors.join(', ')}`);
  assert.strictEqual(reloaded.eventV2.openEvents.length, 0, 'reloaded openEvents should remain resolved');
  assert.strictEqual(reloaded.eventV2.history[0].instanceId, 'evt_v2_event_center_pilot_indoor_dry_rootball_smoke', 'reloaded history instance id should remain intact');

  const invalidState = createLegacyStateWithoutEventV2();
  Bridge.prepareEventCenterV2PilotOpenEvent(invalidState);
  const invalid = Bridge.resolveEventCenterV2PilotEvent(invalidState, 'not_a_real_option');
  assert.strictEqual(invalid.ok, false, 'invalid option should be blocked');
  assert(invalid.errors.some((entry) => String(entry).includes('unsupported_option')), 'invalid option should report unsupported option');
  assert.strictEqual(invalidState.eventV2.openEvents.length, 1, 'invalid option must not remove open event');
  assert.strictEqual(invalidState.events.activeEventId, 'legacy_root_warning', 'legacy V1 event should not crash or be removed');

  const summary = {
    ok: true,
    pilotEvent: 'indoor_dry_rootball',
    options: viewModel.options.map((option) => option.id),
    resolvedOption: resolved.selectedOption,
    openEventsAfterResolve: state.eventV2.openEvents.length,
    historyAfterResolve: state.eventV2.history.length,
    applyPreviewDeltaCount: state.eventV2.history[0].applyPreview.mutationPreview.length,
    appliedDeltaCount: state.eventV2.history[0].appliedDelta.deltas.length,
    v1Wrote: resolved.v1Wrote,
    v1HistoryPreserved: state.events.history.length === originalV1HistoryLength,
    saveReloadShapeOk: shapeAfterReload.ok,
    invalidOptionBlocked: invalid.ok === false,
    usedProductiveStorage: false,
  };

  console.log(JSON.stringify(summary, null, 2));
}

runSmoke();
