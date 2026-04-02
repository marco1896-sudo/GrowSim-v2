#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadContext() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'events.js'), 'utf8');

  const context = {
    console,
    Date,
    Math,
    setTimeout,
    clearTimeout,
    window: {},
    clamp: (v, min, max) => Math.max(min, Math.min(max, Number(v) || 0)),
    clampInt: (v, min, max) => Math.max(min, Math.min(max, Math.trunc(Number(v) || 0))),
    round2: (v) => Math.round((Number(v) || 0) * 100) / 100,
    deterministicUnitFloat: () => 0.5,
    simDayFloat: () => 12,
    simHour: () => 12,
    deriveEnvironmentReadout: () => ({ temperatureC: 25, humidityPercent: 58, vpdKpa: 1.15, airflowLabel: 'Good' }),
    deriveRootZoneReadout: () => ({ ph: '6.0', ec: '1.4 mS', oxygen: '62%', rootHealth: '70%' }),
    addLog: () => {},
    schedulePushIfAllowed: () => {},
    nextDaytimeRealMs: (nowMs) => nowMs + 60_000,
    notifyPlantNeedsCare: () => {},
    EVENT_ROLL_MIN_REAL_MS: 120_000,
    EVENT_ROLL_MAX_REAL_MS: 240_000,
    EVENT_COOLDOWN_MS: 120_000,
    state: {
      status: { risk: 30, stress: 30, health: 80, water: 70, nutrition: 70, growth: 35 },
      plant: { phase: 'vegetative', stageIndex: 3, stageProgress: 0.4, stageKey: 'stage_04' },
      simulation: { tickCount: 10, simTimeMs: Date.now(), isDaytime: true, simDay: 12 },
      setup: { mode: 'indoor', medium: 'soil', light: 'led' },
      ui: { openSheet: null },
      events: {
        machineState: 'idle',
        scheduler: {
          nextEventRealTimeMs: 0,
          eventCooldowns: {},
          categoryCooldowns: {},
          lastEventCategory: null,
          lastEventId: null
        },
        catalog: [],
        history: []
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'events.js' });
  return context;
}

(function testMissedRollDoesNotActivateEvent() {
  const ctx = loadContext();
  let activated = false;

  ctx.deterministicUnitFloat = () => 0.99;
  ctx.state.events.scheduler.nextEventRealTimeMs = 1;
  ctx.state.events.scheduler.nextEventSimTimeMs = 1;
  ctx.activateEvent = () => {
    activated = true;
    return true;
  };

  ctx.runEventStateMachine(1_000);

  assert.strictEqual(activated, false, 'event must not activate when roll misses threshold');
  assert.ok(
    Number(ctx.state.events.scheduler.nextEventRealTimeMs) > 1_000,
    'next event roll should be rescheduled after roll miss'
  );
  assert.ok(
    Number(ctx.state.events.scheduler.nextEventSimTimeMs) > 0,
    'next event sim deadline should be written after roll miss'
  );
})();

(function testSuccessfulRollCanActivateEvent() {
  const ctx = loadContext();
  ctx.deterministicUnitFloat = () => 0.01;
  ctx.state.events.scheduler.nextEventRealTimeMs = 1;
  ctx.state.events.scheduler.nextEventSimTimeMs = 1;
  ctx.state.events.catalog = [{
    id: 'test_event',
    title: 'Test Event',
    description: 'A deterministic event for regression coverage.',
    options: [{
      id: 'ack',
      label: 'OK',
      effects: {}
    }]
  }];

  ctx.runEventStateMachine(1_000);

  assert.strictEqual(ctx.state.events.machineState, 'activeEvent', 'event machine should enter the active event state when roll passes threshold');
  assert.strictEqual(ctx.state.events.activeEventId, 'test_event', 'event machine should activate the eligible event after a successful roll');
})();

console.log('event roll threshold regression tests passed');
