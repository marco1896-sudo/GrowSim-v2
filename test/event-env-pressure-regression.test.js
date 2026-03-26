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
    deterministicUnitFloat: () => 0.5,
    simDayFloat: () => 24,
    clamp: (v, min, max) => Math.max(min, Math.min(max, Number(v) || 0)),
    round2: (v) => Math.round((Number(v) || 0) * 100) / 100,
    state: {
      status: { risk: 30, stress: 30, health: 80 },
      simulation: { tickCount: 100, simDay: 24 },
      events: {
        scheduler: { nextEventRealTimeMs: 0 },
        history: []
      }
    },
    EVENT_ROLL_MIN_REAL_MS: 120000,
    deriveEnvironmentReadout: null,
    deriveRootZoneReadout: null
  };

  context.deriveEnvironmentReadout = () => ({
    temperatureC: 25,
    humidityPercent: 58,
    vpdKpa: 1.15,
    airflowLabel: 'Good'
  });

  context.deriveRootZoneReadout = () => ({
    ph: '6.0',
    ec: '1.5 mS',
    oxygen: '62%'
  });

  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'events.js' });
  return context;
}

(function testThresholdIncreasesWithPressure() {
  const ctx = loadContext();

  // low pressure baseline
  ctx.deriveEnvironmentReadout = () => ({ temperatureC: 24.8, humidityPercent: 60, vpdKpa: 1.1, airflowLabel: 'Good' });
  ctx.deriveRootZoneReadout = () => ({ ph: '6.0', ec: '1.4 mS', oxygen: '65%' });
  const low = ctx.eventThreshold();

  // high pressure
  ctx.deriveEnvironmentReadout = () => ({ temperatureC: 33, humidityPercent: 35, vpdKpa: 2.2, airflowLabel: 'Schwach' });
  ctx.deriveRootZoneReadout = () => ({ ph: '5.1', ec: '2.5 mS', oxygen: '28%' });
  const high = ctx.eventThreshold();

  assert.ok(high > low, 'event threshold should increase when env/root pressure worsens');
})();

(function testPositiveWeightDropsUnderHighPressure() {
  const ctx = loadContext();
  const item = { category: 'positive', weight: 1 };

  ctx.deriveEnvironmentReadout = () => ({ temperatureC: 24.5, humidityPercent: 60, vpdKpa: 1.1, airflowLabel: 'Good' });
  ctx.deriveRootZoneReadout = () => ({ ph: '6.0', ec: '1.4 mS', oxygen: '66%' });
  const wLow = ctx.computeEventDynamicWeight(item);

  ctx.deriveEnvironmentReadout = () => ({ temperatureC: 34, humidityPercent: 34, vpdKpa: 2.3, airflowLabel: 'Schwach' });
  ctx.deriveRootZoneReadout = () => ({ ph: '5.2', ec: '2.4 mS', oxygen: '30%' });
  const wHigh = ctx.computeEventDynamicWeight(item);

  assert.ok(wHigh < wLow, 'positive weight should drop under high pressure');
})();

(function testDiseaseWeightRisesWithPressure() {
  const ctx = loadContext();
  const item = { category: 'disease', weight: 1 };

  ctx.state.status.risk = 65;
  ctx.state.status.stress = 60;

  ctx.deriveEnvironmentReadout = () => ({ temperatureC: 24.8, humidityPercent: 59, vpdKpa: 1.15, airflowLabel: 'Good' });
  ctx.deriveRootZoneReadout = () => ({ ph: '6.0', ec: '1.5 mS', oxygen: '64%' });
  const wLow = ctx.computeEventDynamicWeight(item);

  ctx.deriveEnvironmentReadout = () => ({ temperatureC: 33, humidityPercent: 36, vpdKpa: 2.15, airflowLabel: 'Schwach' });
  ctx.deriveRootZoneReadout = () => ({ ph: '5.2', ec: '2.4 mS', oxygen: '32%' });
  const wHigh = ctx.computeEventDynamicWeight(item);

  assert.ok(wHigh > wLow, 'disease weight should rise with higher env/root pressure');
})();

console.log('event env-pressure regression tests passed');
