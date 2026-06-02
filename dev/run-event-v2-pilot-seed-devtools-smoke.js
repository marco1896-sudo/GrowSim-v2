#!/usr/bin/env node
/* eslint-env node */
'use strict';

const assert = require('assert');
const {
  PILOT_EVENT_ID,
  isEventV2PilotDevToolsEnabled,
  seedIndoorDryRootballPilotEvent,
  resetEventV2PilotState,
  installEventV2PilotDevTools
} = require('../src/events/v2/dev/EventV2PilotSeedDevTools.js');

function createBaseState() {
  return {
    status: { stress: 0, risk: 1, water: 44 },
    events: {
      machineState: 'cooldown',
      history: [{ eventId: 'legacy_v1_history', optionId: 'legacy_choice' }]
    }
  };
}

function createMockWindow(search, hostname) {
  return {
    location: {
      search: String(search || ''),
      hostname: String(hostname || '')
    },
    renderAll: () => {},
    schedulePersistState: () => {}
  };
}

function main() {
  assert.strictEqual(
    isEventV2PilotDevToolsEnabled({ hostname: 'localhost', search: '' }),
    true,
    'localhost should enable dev tools'
  );
  assert.strictEqual(
    isEventV2PilotDevToolsEnabled({ hostname: '127.0.0.1', search: '' }),
    true,
    '127.0.0.1 should enable dev tools'
  );
  assert.strictEqual(
    isEventV2PilotDevToolsEnabled({ hostname: 'example.com', search: '' }),
    false,
    'non-dev host without flag should not enable dev tools'
  );
  assert.strictEqual(
    isEventV2PilotDevToolsEnabled({ hostname: 'example.com', search: '?devEventV2=1' }),
    true,
    'query flag should enable dev tools'
  );

  const state = createBaseState();
  const legacyHistoryBefore = JSON.stringify(state.events.history);
  const seedResult = seedIndoorDryRootballPilotEvent(state, {
    now: 1700000000000,
    instanceId: 'evt_v2_seed_smoke_001',
    clearHistory: true
  });
  assert.strictEqual(seedResult.ok, true, 'seed should succeed');
  assert.strictEqual(seedResult.eventId, PILOT_EVENT_ID, 'seed should target pilot event');
  assert.strictEqual(Array.isArray(state.eventV2.openEvents), true, 'eventV2.openEvents should exist');
  assert.strictEqual(state.eventV2.openEvents.length, 1, 'seed should create exactly one open event');
  assert.strictEqual(state.eventV2.openEvents[0].eventId, PILOT_EVENT_ID, 'open event id should match pilot');
  assert.deepStrictEqual(
    (state.eventV2.openEvents[0].options || []).slice().sort(),
    ['inspect', 'overreact', 'stabilize'].sort(),
    'seed options should include stabilize/inspect/overreact'
  );
  assert.strictEqual(state.status.stress >= 2, true, 'seed should raise stress floor to at least 2');
  assert.strictEqual(state.status.risk >= 2, true, 'seed should raise risk floor to at least 2');

  const resetKeepHistory = resetEventV2PilotState(state, { clearHistory: false, resetStatus: false, now: 1700000001111 });
  assert.strictEqual(resetKeepHistory.ok, true, 'reset should succeed');
  assert.strictEqual(state.eventV2.openEvents.length, 0, 'reset should clear open events');
  assert.strictEqual(Array.isArray(state.eventV2.history), true, 'history should still be an array after reset');
  assert.strictEqual(JSON.stringify(state.events.history), legacyHistoryBefore, 'reset should not mutate V1 legacy history');

  const missingEventV2State = { status: { stress: 1, risk: 1 }, events: { history: [{ eventId: 'legacy' }] } };
  const missingEventV2Seed = seedIndoorDryRootballPilotEvent(missingEventV2State, { now: 1700000002222 });
  assert.strictEqual(missingEventV2Seed.ok, true, 'seed should not crash when eventV2 is missing');
  assert.strictEqual(missingEventV2State.eventV2.openEvents.length, 1, 'missing eventV2 should be initialized during seed');

  const devWindow = createMockWindow('?devEventV2=1', 'example.com');
  const nonDevWindow = createMockWindow('', 'example.com');
  const appState = createBaseState();

  const installDisabled = installEventV2PilotDevTools(nonDevWindow, () => appState, null, {});
  assert.strictEqual(installDisabled.enabled, false, 'install should stay disabled outside dev conditions');
  assert.strictEqual(typeof nonDevWindow.__seedEventV2PilotIndoorDryRootball, 'undefined', 'non-dev install should not register seed function');

  const installEnabled = installEventV2PilotDevTools(devWindow, () => appState, null, {});
  assert.strictEqual(installEnabled.ok, true, 'dev install should succeed');
  assert.strictEqual(typeof devWindow.__seedEventV2PilotIndoorDryRootball, 'function', 'dev install should register seed function');
  assert.strictEqual(typeof devWindow.__seedEventV2PilotSharedPanicWateringMisread, 'function', 'dev install should register shared pilot seed function');
  assert.strictEqual(typeof devWindow.__resetEventV2Pilot, 'function', 'dev install should register reset function');
  assert.strictEqual(typeof devWindow.__getEventV2PilotState, 'function', 'dev install should register snapshot function');

  const callSeedResult = devWindow.__seedEventV2PilotIndoorDryRootball({ instanceId: 'evt_v2_seed_smoke_002' });
  assert.strictEqual(callSeedResult.ok, true, 'global seed function should succeed');
  assert.strictEqual(callSeedResult.stateMutated, true, 'global seed function should mutate app state in place');

  const snapshot = devWindow.__getEventV2PilotState();
  assert.strictEqual(snapshot.ok, true, 'snapshot should succeed');
  assert.strictEqual(snapshot.eventId, PILOT_EVENT_ID, 'snapshot should report pilot event id');
  assert.strictEqual(Array.isArray(snapshot.openEvents), true, 'snapshot should expose open events array');

  const callResetResult = devWindow.__resetEventV2Pilot({ clearHistory: true, resetStatus: true });
  assert.strictEqual(callResetResult.ok, true, 'global reset should succeed');
  assert.strictEqual(appState.eventV2.openEvents.length, 0, 'global reset should clear open events');
  assert.strictEqual(appState.eventV2.history.length, 0, 'global reset with clearHistory should clear history');

  const summary = {
    ok: true,
    mode: 'event_v2_pilot_seed_devtools_smoke',
    eventId: PILOT_EVENT_ID,
    devConditions: {
      localhost: true,
      devQueryFlag: true,
      nonDevBlocked: true
    },
    seed: {
      openEvents: state.eventV2.openEvents.length,
      initializedFromMissingEventV2: missingEventV2Seed.ok
    },
    reset: {
      clearedOpenEvents: true,
      preservedLegacyV1History: JSON.stringify(state.events.history) === legacyHistoryBefore
    },
    globals: {
      registeredInDev: true,
      blockedOutsideDev: true
    }
  };

  console.log(JSON.stringify(summary, null, 2));
}

main();
