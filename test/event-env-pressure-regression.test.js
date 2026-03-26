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
    clampInt: (v, min, max) => Math.max(min, Math.min(max, Math.trunc(Number(v) || 0))),
    round2: (v) => Math.round((Number(v) || 0) * 100) / 100,
    STAGE_DEFS: new Array(12).fill(0).map((_, index) => ({ simDayStart: index * 7 })),
    state: {
      status: { risk: 30, stress: 30, health: 80 },
      simulation: { tickCount: 100, simDay: 24, isDaytime: true },
      plant: { stageIndex: 4, stageProgress: 0.35, phase: 'vegetative' },
      setup: { mode: 'indoor' },
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

(function testInstabilityScoreIsAvailableToClimateEvents() {
  const ctx = loadContext();

  ctx.deriveEnvironmentReadout = () => ({
    temperatureC: 25.2,
    humidityPercent: 57,
    vpdKpa: 1.18,
    airflowLabel: 'Mittel',
    instabilityScore: 33
  });

  const snapshot = ctx.buildEventConstraintSnapshot();
  assert.strictEqual(snapshot.environmentState.instabilityScore, 33, 'constraint snapshot should expose instability score from actual environment readout');
  assert.strictEqual(ctx.resolveTriggerField('env.instabilityScore'), 33, 'trigger resolver should expose instability score');

  assert.strictEqual(
    ctx.evaluateEventConstraints({
      category: 'environment',
      constraints: {
        environmentState: {
          minInstabilityScore: 30,
          maxInstabilityScore: 40
        }
      }
    }),
    true,
    'instability score constraints should pass when actual climate is inside range'
  );

  assert.strictEqual(
    ctx.evaluateEventConstraints({
      category: 'environment',
      constraints: {
        environmentState: {
          minInstabilityScore: 34
        }
      }
    }),
    false,
    'instability score constraints should fail when actual climate is below the required range'
  );
})();

(function testClimateEventCatalogUsesIndoorActualClimateFields() {
  const payload = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'events.v2.json'), 'utf8'));
  const climateEvents = payload.events.filter((eventDef) => String(eventDef.id || '').startsWith('v2_climate_'));
  assert.ok(climateEvents.length >= 10, 'expected the climate event catalog additions to be present');

  const gatherFields = (triggers) => {
    const rules = [];
    if (triggers && typeof triggers === 'object') {
      if (Array.isArray(triggers.all)) rules.push(...triggers.all);
      if (Array.isArray(triggers.any)) rules.push(...triggers.any);
    }
    return rules.map((rule) => String(rule.field || '')).filter(Boolean);
  };

  for (const eventDef of climateEvents) {
    const setupModes = eventDef && eventDef.triggers && eventDef.triggers.setup && Array.isArray(eventDef.triggers.setup.modeIn)
      ? eventDef.triggers.setup.modeIn.map(String)
      : [];
    assert.ok(setupModes.includes('indoor'), `${eventDef.id} should be gated to indoor mode`);

    const fields = gatherFields(eventDef.triggers);
    assert.ok(
      fields.every((field) => !field.startsWith('environmentControls.') && !field.startsWith('controller.') && !field.startsWith('target.')),
      `${eventDef.id} should not read controller target fields as live climate`
    );
    assert.ok(
      fields.some((field) => field.startsWith('env.') || field === 'simulation.isDaytime'),
      `${eventDef.id} should react to actual environment or day/night state`
    );
  }
})();

(function testApproachingRiskZoneWarningStaysInClearYellowZone() {
  const payload = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'events.v2.json'), 'utf8'));
  const eventDef = payload.events.find((eventItem) => eventItem.id === 'v2_climate_approaching_risk_zone');
  assert.ok(eventDef, 'approaching risk zone warning should exist in the catalog');

  const allRules = Array.isArray(eventDef.triggers && eventDef.triggers.all) ? eventDef.triggers.all : [];
  const anyRules = Array.isArray(eventDef.triggers && eventDef.triggers.any) ? eventDef.triggers.any : [];
  const byField = new Map(anyRules.map((rule) => [String(rule.field || ''), rule]));

  const instabilityGuard = allRules.find((rule) => String(rule.field || '') === 'env.instabilityScore');
  assert.ok(instabilityGuard, 'approaching risk warning should yield to the dedicated instability warning');
  assert.strictEqual(instabilityGuard.op, '<=');
  assert.ok(Number(instabilityGuard.value) <= 24, 'instability guard should stay below noisy fluctuation territory');

  assert.ok(Number(byField.get('env.temperatureC').value) >= 29, 'temperature threshold should be above near-normal indoor warmth');
  assert.ok(Number(byField.get('env.humidityPercent').value) >= 68 || Number(byField.get('env.humidityPercent').value) <= 45, 'humidity thresholds should sit in clearly noticeable yellow-zone territory');
  assert.ok(anyRules.some((rule) => String(rule.field || '') === 'env.vpdKpa' && Number(rule.value) >= 1.45), 'VPD threshold should sit above normal comfort range');
})();

(function testEventImageResolverChoosesBelievableClimateAssets() {
  const ctx = loadContext();
  const assetsApi = ctx.window.GrowSimEventAssets;
  assert.ok(assetsApi && typeof assetsApi.resolveEventImagePath === 'function', 'event asset resolver should be exported');

  const heatPath = assetsApi.resolveEventImagePath({
    id: 'v2_climate_heat_stress',
    category: 'environment',
    title: 'Hitzestress im Zelt',
    description: 'Das Klima ist tagsüber zu heiß geworden.',
    tags: ['heat', 'temp', 'stress', 'climate']
  });
  assert.ok(/heat-wave|hot_dry_day/i.test(heatPath), 'heat stress events should resolve to a heat-themed event asset');

  const idealPath = assetsApi.resolveEventImagePath({
    id: 'v2_climate_ideal_vpd_boost',
    category: 'positive',
    title: 'Perfektes Klimafenster',
    description: 'VPD und Klima passen sehr gut zusammen.',
    tags: ['ideal', 'perfect', 'climate', 'growth']
  });
  assert.ok(/perfect/i.test(idealPath), 'ideal climate events should resolve to a premium perfect-conditions asset');

  const moldPath = assetsApi.resolveEventImagePath({
    id: 'v2_climate_flower_humidity_risk',
    category: 'disease',
    title: 'Feuchte Taschen in der Blüte',
    description: 'Das erhöht das Risiko für Pilz- und Schimmelprobleme.',
    tags: ['humidity', 'mold', 'fungus', 'flower']
  });
  assert.ok(/mold|fungus|humidity/i.test(moldPath), 'humidity risk events should resolve to a humidity or mold-themed asset');
})();

console.log('event env-pressure regression tests passed');
