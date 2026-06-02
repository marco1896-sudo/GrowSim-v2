#!/usr/bin/env node
/* eslint-env node */
'use strict';

const assert = require('assert');
const {
  DEFAULT_CUTOVER_MODE,
  evaluateEventSystemRuntimeBridge,
  runEventSystemV2CutoverBridge,
} = require('../src/events/EventSystemRuntimeBridge.js');

function createLegacySaveState() {
  return {
    events: {
      machineState: 'activeEvent',
      activeEventId: 'legacy_water_event',
      activeEventTitle: 'Legacy Water Event',
      activeEventText: 'Old save event text',
      activeOptions: [{ id: 'legacy_choice', label: 'Legacy choice' }],
      history: [],
      scheduler: { nextEventSimTimeMs: 0 },
    },
    history: { events: [] },
    status: { stress: 25, risk: 21, health: 78 },
    simulation: { simTimeMs: 1760000000000 },
  };
}

function runAuthorityEvaluation() {
  const result = evaluateEventSystemRuntimeBridge({
    eventSystemMode: DEFAULT_CUTOVER_MODE,
    state: createLegacySaveState(),
    permissions: {
      allowV2ActiveWriteAuthority: true,
    },
  });

  assert.strictEqual(result.ok, true, 'bridge authority should be valid');
  assert.strictEqual(result.mode, 'v2-active-with-v1-legacy-read', 'expected cutover mode');
  assert.strictEqual(result.activeEventSystem, 'v2', 'V2 should be active authority');
  assert.strictEqual(result.legacyV1ReadFallback, true, 'V1 legacy read fallback should remain');
  assert.strictEqual(result.v1CanCreateEvents, false, 'V1 must not create events');
  assert.strictEqual(result.v1CanResolveEvents, false, 'V1 must not resolve events');
  assert.strictEqual(result.v1CanWriteEvents, false, 'V1 must not write events');
  assert.strictEqual(result.v2CanCreateEvents, true, 'V2 should create events in bridge');
  assert.strictEqual(result.v2CanResolveEvents, true, 'V2 should resolve events in bridge');
  assert.strictEqual(result.v2CanWriteEvents, true, 'V2 should be single bridge authority');
  return result;
}

function runCreateResolve() {
  const oldSave = createLegacySaveState();
  const before = JSON.stringify(oldSave);
  const result = runEventSystemV2CutoverBridge({
    eventSystemMode: DEFAULT_CUTOVER_MODE,
    eventId: 'indoor_dry_rootball',
    selectedOption: 'stabilize',
    state: oldSave,
    permissions: {
      allowV2ActiveWriteAuthority: true,
    },
  });

  assert.strictEqual(result.ok, true, 'V2 bridge create/resolve should pass');
  assert.strictEqual(result.createdOpenEvent.eventId, 'indoor_dry_rootball', 'should create target V2 event');
  assert.strictEqual(result.resolvedHistoryEntry.eventId, 'indoor_dry_rootball', 'should resolve target V2 event');
  assert.strictEqual(Array.isArray(result.state.eventV2.openEvents), true, 'eventV2.openEvents should exist');
  assert.strictEqual(result.state.eventV2.openEvents.length, 0, 'resolved flow should leave no open event');
  assert.strictEqual(Array.isArray(result.state.eventV2.history), true, 'eventV2.history should exist');
  assert.strictEqual(result.state.eventV2.history.length >= 1, true, 'eventV2.history should contain resolved event');
  assert.strictEqual(result.state.eventV2.history[0].instanceId, result.createdOpenEvent.instanceId, 'history should preserve instance');
  assert.strictEqual(result.saveShape.ok, true, 'eventV2 save shape should validate');
  assert.strictEqual(result.eventCenterPreview.ok, true, 'Event Center preview should read V2 event');
  assert.strictEqual(result.eventCenterPreview.hasRawI18nKey, false, 'preview should not expose raw i18n key');
  assert.strictEqual(result.safety.productiveWrite, false, 'productive write must remain false in smoke');
  assert.strictEqual(result.safety.usedProductiveStorage, false, 'productive storage must remain false');
  assert.strictEqual(result.safety.mutatedInputState, false, 'input state must not mutate');
  assert.strictEqual(JSON.stringify(oldSave), before, 'old save object must remain unchanged');
  return result;
}

function runOldSaveWithoutEventV2() {
  const result = runEventSystemV2CutoverBridge({
    eventSystemMode: DEFAULT_CUTOVER_MODE,
    state: createLegacySaveState(),
    permissions: {
      allowV2ActiveWriteAuthority: true,
    },
  });
  assert.strictEqual(result.ok, true, 'old save without eventV2 should not crash');
  assert.strictEqual(result.state.eventV2.schemaVersion, 1, 'eventV2 should be initialized in bridge state');
  return result;
}

function runDoubleAuthorityBlocked() {
  const result = runEventSystemV2CutoverBridge({
    eventSystemMode: DEFAULT_CUTOVER_MODE,
    state: createLegacySaveState(),
    forceV1WriteIntent: true,
    permissions: {
      allowV2ActiveWriteAuthority: true,
    },
  });
  assert.strictEqual(result.ok, false, 'double authority must block');
  assert.strictEqual(result.activeEventSystem, 'blocked', 'authority should be blocked');
  return result;
}

function runV2ActiveWithoutAllowBlocked() {
  const result = runEventSystemV2CutoverBridge({
    eventSystemMode: DEFAULT_CUTOVER_MODE,
    state: createLegacySaveState(),
    permissions: {
      allowV2ActiveWriteAuthority: false,
    },
  });
  assert.strictEqual(result.ok, false, 'V2 active without explicit allow must block');
  return result;
}

function main() {
  const authority = runAuthorityEvaluation();
  const createResolve = runCreateResolve();
  const oldSave = runOldSaveWithoutEventV2();
  const doubleAuthority = runDoubleAuthorityBlocked();
  const activeWithoutAllow = runV2ActiveWithoutAllowBlocked();

  const report = {
    ok: true,
    mode: 'event_system_v2_cutover_smoke',
    summary: {
      eventSystemMode: authority.mode,
      v2IsAuthority: authority.activeEventSystem === 'v2',
      legacyV1ReadFallback: authority.legacyV1ReadFallback === true,
      v1CannotCreateEvents: authority.v1CanCreateEvents === false,
      v1CannotResolveEvents: authority.v1CanResolveEvents === false,
      v1CannotWriteEvents: authority.v1CanWriteEvents === false,
      v2CanCreateOneEvent: Boolean(createResolve.createdOpenEvent),
      v2CanResolveOneEvent: Boolean(createResolve.resolvedHistoryEntry),
      eventV2OpenEventsUsed: Array.isArray(createResolve.state.eventV2.openEvents),
      eventV2HistoryUsed: Array.isArray(createResolve.state.eventV2.history) && createResolve.state.eventV2.history.length >= 1,
      writeGateBlocksDoubleAuthority: doubleAuthority.ok === false,
      oldSaveWithoutEventV2Safe: oldSave.ok === true,
      oldV1EventDataSafe: oldSave.legacyV1ReadFallback === true,
      eventCenterPreviewReadable: createResolve.eventCenterPreview.ok === true,
      noProductiveStorage: createResolve.safety.usedProductiveStorage === false,
      noRawI18nKeys: createResolve.eventCenterPreview.hasRawI18nKey === false,
      activeRequiresExplicitAllow: activeWithoutAllow.ok === false,
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
