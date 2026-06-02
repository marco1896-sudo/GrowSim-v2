#!/usr/bin/env node
/* eslint-env node */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const Bridge = require('../src/events/EventSystemRuntimeBridge.js');

function createLegacyState() {
  return {
    events: {
      machineState: 'activeEvent',
      activeEventId: 'legacy_water_event',
      activeEventTitle: 'Legacy Water Event',
      activeEventText: 'Legacy event remains readable',
      activeOptions: [{ id: 'legacy_option', label: 'Legacy option' }],
      history: [{ eventId: 'legacy_old_event' }],
      scheduler: { nextEventSimTimeMs: 1000 },
    },
    history: { events: [{ eventId: 'legacy_history_event' }] },
    simulation: { nowMs: 1760000000000, simTimeMs: 1760000000000 },
    status: { stress: 25, risk: 21, health: 78 },
  };
}

function runBrowserGlobalLoadCheck() {
  const source = fs.readFileSync(path.join(ROOT, 'src/events/EventSystemRuntimeBridge.js'), 'utf8');
  const sandbox = {
    window: {},
    console,
    Object,
    Array,
    Number,
    String,
    Boolean,
    Math,
    JSON,
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'EventSystemRuntimeBridge.js' });
  assert(sandbox.window.GrowSimEventSystemRuntimeBridge, 'bridge should register browser global');
  assert.strictEqual(
    typeof sandbox.window.GrowSimEventSystemRuntimeBridge.consultBrowserRuntimeBridge,
    'function',
    'browser bridge should expose runtime consultation'
  );
  return sandbox.window.GrowSimEventSystemRuntimeBridge;
}

function runDefensiveInit() {
  const state = createLegacyState();
  const beforeLegacyEvents = JSON.stringify(state.events);
  const result = Bridge.ensureEventV2StateInPlace(state, {
    eventSystemMode: 'v2-active-with-v1-legacy-read',
    mode: 'active',
  });
  assert.strictEqual(result.ok, true, 'eventV2 init should pass');
  assert.strictEqual(result.initialized, true, 'missing eventV2 should initialize');
  assert.strictEqual(state.eventV2.schemaVersion, 1, 'schema version should be 1');
  assert.strictEqual(state.eventV2.mode, 'active', 'shape mode should stay save-shape compatible');
  assert.strictEqual(state.eventV2.meta.eventSystemMode, 'v2-active-with-v1-legacy-read', 'runtime mode should live in meta');
  assert.strictEqual(JSON.stringify(state.events), beforeLegacyEvents, 'legacy V1 data should remain untouched');
  return { state, result };
}

function runExistingShapePreserved() {
  const state = createLegacyState();
  state.eventV2 = {
    schemaVersion: 1,
    mode: 'dry-run',
    openEvents: [],
    history: [],
    meta: { counters: { generated: 7 }, customMeta: 'keep-me' },
    customTopLevel: 'keep-me-too',
  };
  const result = Bridge.ensureEventV2StateInPlace(state, {
    eventSystemMode: 'v2-active-with-v1-legacy-read',
  });
  assert.strictEqual(result.ok, true, 'existing eventV2 should normalize safely');
  assert.strictEqual(result.initialized, false, 'existing eventV2 should not be reported as initialized');
  assert.strictEqual(state.eventV2.mode, 'dry-run', 'existing valid mode should not be overwritten');
  assert.strictEqual(state.eventV2.customTopLevel, 'keep-me-too', 'unknown top-level fields should remain');
  assert.strictEqual(state.eventV2.meta.customMeta, 'keep-me', 'unknown meta fields should remain');
  return { state, result };
}

function runBridgeConsultation() {
  const state = createLegacyState();
  const result = Bridge.consultBrowserRuntimeBridge(state, {
    eventSystemMode: 'v2-active-with-v1-legacy-read',
    now: 1760000000000,
    eventId: 'indoor_dry_rootball',
  });
  assert.strictEqual(result.ok, true, 'bridge consultation should pass');
  assert.strictEqual(result.activeEventSystem, 'v2', 'V2 should be preferred authority');
  assert.strictEqual(result.legacyV1ReadFallback, true, 'V1 legacy read should remain');
  assert.strictEqual(result.v1CanCreateEvents, false, 'V1 create should be disabled');
  assert.strictEqual(result.v1CanResolveEvents, false, 'V1 resolve should be disabled');
  assert.strictEqual(result.v1CanWriteEvents, false, 'V1 write should be disabled');
  assert.strictEqual(result.v2CanCreateEvents, true, 'V2 create should be allowed in bridge path');
  assert.strictEqual(result.shouldBlockLegacyCreate, true, 'legacy create should be blocked by pilot');
  assert.strictEqual(result.shouldBlockLegacyResolve, true, 'legacy resolve should be blocked by pilot');
  assert.strictEqual(result.usedProductiveStorage, false, 'no productive storage allowed');
  return { state, result };
}

function runPilotCreatePreview() {
  const state = createLegacyState();
  const result = Bridge.runEventSystemV2CutoverBridge({
    eventSystemMode: 'v2-active-with-v1-legacy-read',
    eventId: 'indoor_dry_rootball',
    selectedOption: 'stabilize',
    state,
    permissions: { allowV2ActiveWriteAuthority: true },
  });
  assert.strictEqual(result.ok, true, 'pilot should prepare V2 event data');
  assert.strictEqual(result.createdOpenEvent.eventId, 'indoor_dry_rootball', 'expected V2 event should be prepared');
  assert.strictEqual(result.eventCenterPreview.ok, true, 'Event Center preview should be readable');
  assert.strictEqual(result.eventCenterPreview.hasRawI18nKey, false, 'no raw i18n key should be exposed');
  assert.strictEqual(result.safety.usedProductiveStorage, false, 'no direct storage usage');
  return result;
}

function runDoubleAuthorityBlocked() {
  const result = Bridge.runEventSystemV2CutoverBridge({
    eventSystemMode: 'v2-active-with-v1-legacy-read',
    state: createLegacyState(),
    forceV1WriteIntent: true,
    permissions: { allowV2ActiveWriteAuthority: true },
  });
  assert.strictEqual(result.ok, false, 'double authority should block');
  return result;
}

function runStaticIntegrationChecks() {
  const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  const simJs = fs.readFileSync(path.join(ROOT, 'sim.js'), 'utf8');
  const storageJs = fs.readFileSync(path.join(ROOT, 'storage.js'), 'utf8');
  const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

  assert(appJs.includes('consultEventSystemRuntimeBridgePilot'), 'app.js should consult bridge pilot');
  assert(simJs.includes('runEventSystemBridgePilotForSimulation'), 'sim.js should consult bridge pilot');
  assert(storageJs.includes('ensureEventV2BrowserPilotState'), 'storage.js should defensively init eventV2');
  assert(indexHtml.includes('src/events/EventSystemRuntimeBridge.js'), 'index.html should load bridge before app');
  assert(!appJs.includes('GrowSimEventSystemRuntimeBridge.localStorage'), 'app bridge pilot must not call bridge storage');
  assert(!simJs.includes('GrowSimEventSystemRuntimeBridge.localStorage'), 'sim bridge pilot must not call bridge storage');

  return {
    appConsultsBridge: true,
    simConsultsBridge: true,
    storageInitializesEventV2: true,
    indexLoadsBridge: true,
    noDirectStorageWriteAdded: true,
  };
}

function main() {
  runBrowserGlobalLoadCheck();
  runDefensiveInit();
  runExistingShapePreserved();
  const consultation = runBridgeConsultation();
  const preview = runPilotCreatePreview();
  const doubleAuthority = runDoubleAuthorityBlocked();
  const staticChecks = runStaticIntegrationChecks();

  const report = {
    ok: true,
    mode: 'event_system_v2_browser_runtime_bridge_pilot_smoke',
    summary: {
      oldStateWithoutEventV2Safe: true,
      eventV2DefensivelyInitialized: true,
      existingEventV2NotOverwritten: true,
      v1LegacyDataPreserved: true,
      activeEventSystem: consultation.result.activeEventSystem,
      v1CreateDisabled: consultation.result.v1CanCreateEvents === false,
      v1ResolveDisabled: consultation.result.v1CanResolveEvents === false,
      v1WriteDisabled: consultation.result.v1CanWriteEvents === false,
      v2PreparedEventData: Boolean(preview.createdOpenEvent),
      doubleAuthorityBlocked: doubleAuthority.ok === false,
      noDirectProductiveStorage: preview.safety.usedProductiveStorage === false,
      eventCenterPreviewReadable: preview.eventCenterPreview.ok === true,
      oldV1EventDataSafe: consultation.state.events.activeEventId === 'legacy_water_event',
      staticChecks,
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
