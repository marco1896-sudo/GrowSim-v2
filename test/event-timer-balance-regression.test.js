#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadContext() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'events.js'), 'utf8');
  const now = Date.now();

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
    deriveEnvironmentReadout: () => ({ temperatureC: 25, humidityPercent: 58, vpdKpa: 1.15, airflowLabel: 'Good', airflowScore: 80 }),
    deriveRootZoneReadout: () => ({ ph: '6.0', ec: '1.4 mS', oxygen: '62%', rootHealth: '70%' }),
    addLog: () => {},
    schedulePushIfAllowed: () => {},
    nextDaytimeRealMs: (nowMs) => nowMs + 60_000,
    notifyPlantNeedsCare: () => {},
    EVENT_ROLL_MIN_REAL_MS: 30 * 60 * 1000,
    EVENT_ROLL_MAX_REAL_MS: 90 * 60 * 1000,
    EVENT_COOLDOWN_MS: 20 * 60 * 1000,
    state: {
      seed: 'test-seed',
      plantId: 'test-plant',
      status: { risk: 20, stress: 20, health: 80, water: 70, nutrition: 70, growth: 35 },
      plant: { phase: 'vegetative', stageIndex: 3, stageProgress: 0.4, stageKey: 'stage_04' },
      simulation: { nowMs: now, tickCount: 10, simTimeMs: now, isDaytime: true, simDay: 12, effectiveSpeed: 12, baseSpeed: 12 },
      setup: { mode: 'indoor', medium: 'soil', light: 'led' },
      ui: { openSheet: null },
      events: {
        machineState: 'idle',
        cooldownUntilMs: 0,
        resolvingUntilMs: 0,
        cooldownUntilSimTimeMs: 0,
        resolvingUntilSimTimeMs: 0,
        scheduler: {
          nextEventRealTimeMs: now + (30 * 60 * 1000),
          nextEventSimTimeMs: now + (60 * 60 * 1000),
          eventCooldowns: {},
          categoryCooldowns: {},
          eventCooldownsSim: {},
          categoryCooldownsSim: {},
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

function minutes(ms) {
  return Math.round(Number(ms) / 60000);
}

(function testDelayAlwaysUsesDiscreteBalancedValues() {
  const ctx = loadContext();

  ctx.state.status.risk = 15;
  ctx.computeEnvironmentEventPressure = () => 0.0;
  ctx.deterministicUnitFloat = () => 0.5;
  assert.strictEqual(minutes(ctx.deterministicEventDelayMs(Date.now())), 120, 'low-risk path should resolve to 120m');

  ctx.state.status.risk = 55;
  ctx.computeEnvironmentEventPressure = () => 0.0;
  ctx.deterministicUnitFloat = () => 0.5;
  assert.strictEqual(minutes(ctx.deterministicEventDelayMs(Date.now())), 90, 'medium-risk path should resolve to 90m');

  ctx.state.status.risk = 100;
  ctx.computeEnvironmentEventPressure = () => 0.2;
  ctx.deterministicUnitFloat = () => 0.5;
  assert.strictEqual(minutes(ctx.deterministicEventDelayMs(Date.now())), 60, 'high-risk path should resolve to 60m');
})();

(function testScheduledRollNeverExceedsNormalCap() {
  const ctx = loadContext();
  const now = Date.now();
  ctx.state.simulation.nowMs = now;
  ctx.state.simulation.simTimeMs = now;
  ctx.state.events.machineState = 'idle';
  ctx.state.status.risk = 25;
  ctx.computeEnvironmentEventPressure = () => 0.0;
  ctx.deterministicUnitFloat = () => 0.5;

  ctx.scheduleNextEventRoll(now, 'test_balance_cap');
  const remaining = Number(ctx.state.events.scheduler.nextEventSimTimeMs) - Number(ctx.state.simulation.simTimeMs);

  assert(remaining > 0, 'scheduleNextEventRoll should set a future deadline');
  assert(remaining <= (120 * 60 * 1000), 'normal scheduling exceeded 120 minutes');
  assert([60, 90, 120].includes(minutes(remaining)), 'normal scheduling must use the 60/90/120 set');
})();

(function testNormalizeClampsLegacyLongIdleDeadlines() {
  const ctx = loadContext();
  const now = Date.now();
  ctx.state.simulation.nowMs = now;
  ctx.state.simulation.simTimeMs = now;
  ctx.state.events.machineState = 'idle';
  ctx.state.status.risk = 20;
  ctx.computeEnvironmentEventPressure = () => 0.0;
  ctx.deterministicUnitFloat = () => 0.5;
  ctx.state.events.scheduler.nextEventSimTimeMs = now + (560 * 60 * 1000);

  ctx.normalizeEventTimingState(now);

  const remaining = Number(ctx.state.events.scheduler.nextEventSimTimeMs) - Number(ctx.state.simulation.simTimeMs);
  assert(remaining <= (120 * 60 * 1000), 'legacy-stale idle deadline should be clamped to <=120 minutes');
  assert([60, 90, 120].includes(minutes(remaining)), 'clamped deadline should land on the controlled 60/90/120 set');
})();

console.log('event timer balance regression tests passed');
