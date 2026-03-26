#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadSimContext() {
  const simSource = fs.readFileSync(path.join(__dirname, '..', 'sim.js'), 'utf8');

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
    isDaytimeAtSimTime: () => true,
    notifyPlantNeedsCare: () => {},
    runEventStateMachine: () => {},
    resetBoostDaily: () => {},
    updateVisibleOverlays: () => {},
    syncCanonicalStateShape: () => {},
    evaluateNotificationTriggers: () => {},
    renderSheets: () => {},
    renderHud: () => {},
    renderEventSheet: () => {},
    renderAnalysisPanel: () => {},
    renderDeathOverlay: () => {},
    schedulePersistState: () => {},
    addLog: () => {},
    getCanonicalMeta: () => ({ rescue: {} }),
    getStageTimeline: () => [{ phase: 'seedling' }],
    stageAssetKeyForIndex: () => 'stage_01',
    applyActiveActionEffects: () => {},
    advanceGrowthTick: () => {},
    isPlantDead: () => false,
    syncDeathState: () => false,
    wasCriticalHealth: false,
    shouldProtectOfflineNightDeath: () => false,
    applyOfflineNightSurvivalClamp: () => {},
    FREEZE_SIM_ON_DEATH: true,
    MAX_ELAPSED_PER_TICK_MS: 5000,
    MAX_OFFLINE_SIM_MS: 8 * 60 * 60 * 1000,
    REAL_RUN_DURATION_MS: 7 * 24 * 60 * 60 * 1000,
    TOTAL_LIFECYCLE_SIM_MS: 88 * 24 * 60 * 60 * 1000,
    SIM_DAY_MS: 24 * 60 * 60 * 1000,
    TOTAL_LIFECYCLE_SIM_DAYS: 88,
    SIM_DAY_START_HOUR: 6,
    SIM_NIGHT_START_HOUR: 22,
    STAGE_DEFS: [{ simDayStart: 0, phase: 'seedling' }, { simDayStart: 10, phase: 'vegetative' }],
    DEFAULT_STAGE_TIMELINE: [{ simDayStart: 0, phase: 'seedling', label: 'seedling' }, { simDayStart: 10, phase: 'vegetative', label: 'veg' }],
    PHASE_LABEL_DE: { seedling: 'Keimling' },
    STAGE_ASSET_FALLBACK: { stage_01: 'plant_growth_sprite.png#frame_001' },
    state: {
      simulation: {
        nowMs: 0,
        lastTickRealTimeMs: 0,
        startRealTimeMs: 0,
        simEpochMs: 0,
        simTimeMs: 0,
        growthImpulse: 0,
        isDaytime: true,
        tickCount: 0
      },
      ui: { openSheet: null, lastRenderRealMs: 0 },
      plant: { phase: 'seedling', isDead: false, stageIndex: 0, stageProgress: 0, stageKey: 'stage_01', lastValidStageKey: 'stage_01' },
      status: { health: 85, stress: 15, risk: 20, water: 70, nutrition: 65, growth: 0 },
      events: { machineState: 'idle', scheduler: { nextEventRealTimeMs: 0 } },
      boost: { dayStamp: '2026-01-01', boostUsedToday: 0 },
      debug: { enabled: false, showInternalTicks: false },
      history: { telemetry: [] } // Added history with telemetry
    }
  };

  vm.createContext(context);
  vm.runInContext(simSource, context, { filename: 'sim.js' });
  return context;
}

(function testModelRangesAcrossScenarios() {
  const ctx = loadSimContext();

  const scenarios = [
    { name: 'seedling', stageIndex: 0, status: { water: 68, nutrition: 62, stress: 16, risk: 18, growth: 10 } },
    { name: 'vegetative', stageIndex: 4, status: { water: 58, nutrition: 60, stress: 32, risk: 30, growth: 42 } },
    { name: 'flowering', stageIndex: 8, status: { water: 52, nutrition: 64, stress: 36, risk: 38, growth: 74 } },
    { name: 'stressed', stageIndex: 5, status: { water: 85, nutrition: 80, stress: 78, risk: 82, growth: 50 } },
    { name: 'overwatered', stageIndex: 3, status: { water: 95, nutrition: 58, stress: 52, risk: 56, growth: 34 } },
    { name: 'nutrient_imbalance', stageIndex: 6, status: { water: 50, nutrition: 24, stress: 49, risk: 44, growth: 60 } },
    { name: 'extreme_env', stageIndex: 7, status: { water: 96, nutrition: 90, stress: 92, risk: 94, growth: 67 } }
  ];

  for (const s of scenarios) {
    ctx.state.plant.stageIndex = s.stageIndex;
    ctx.state.status = { ...ctx.state.status, ...s.status };

    const env = ctx.buildEnvironmentModelFromState(ctx.state.status, ctx.state.simulation, ctx.state.plant);
    const root = ctx.buildRootZoneModelFromState(ctx.state.status, env, ctx.state.plant);

    assert.ok(env.temperatureC >= 17 && env.temperatureC <= 36, `${s.name}: temperature out of model bounds`);
    assert.ok(env.humidityPercent >= 30 && env.humidityPercent <= 84, `${s.name}: humidity out of model bounds`);
    assert.ok(env.vpdKpa >= 0.35 && env.vpdKpa <= 2.6, `${s.name}: vpd out of model bounds`);
    assert.ok(root.ph >= 5.3 && root.ph <= 6.7, `${s.name}: pH out of model bounds`);
    assert.ok(root.ec >= 0.5 && root.ec <= 2.4, `${s.name}: EC out of model bounds`);
  }
})();

(function testVpdAndRootStressAffectDriftDirection() {
  const ctx = loadSimContext();

  ctx.state.plant.stageIndex = 7; // flowering-ish

  const base = { water: 60, nutrition: 60, stress: 30, risk: 28, health: 82, growth: 55 };
  const worse = { water: 60, nutrition: 90, stress: 72, risk: 78, health: 82, growth: 55 };

  ctx.state.status = { ...ctx.state.status, ...base };
  const waterBeforeBase = ctx.state.status.water;
  const stressBeforeBase = ctx.state.status.stress;
  ctx.applyStatusDrift(60 * 1000);
  const baseWaterDrop = waterBeforeBase - ctx.state.status.water;
  const baseStressGain = ctx.state.status.stress - stressBeforeBase;

  ctx.state.status = { ...ctx.state.status, ...worse };
  const waterBeforeWorse = ctx.state.status.water;
  const stressBeforeWorse = ctx.state.status.stress;
  ctx.applyStatusDrift(60 * 1000);
  const worseWaterDrop = waterBeforeWorse - ctx.state.status.water;
  const worseStressGain = ctx.state.status.stress - stressBeforeWorse;

  assert.ok(worseWaterDrop > baseWaterDrop, 'higher climate stress should increase water drain');
  assert.ok(worseStressGain > baseStressGain, 'higher env/root stress should increase stress gain');
})();

(function testGrowthImpulseRespondsToEcoEfficiency() {
  const ctx = loadSimContext();

  ctx.state.plant.stageIndex = 6;
  ctx.state.status = { ...ctx.state.status, water: 62, nutrition: 64, stress: 24, risk: 22, health: 86, growth: 50 };
  ctx.applyStatusDrift(60 * 1000);
  const healthyImpulse = ctx.state.simulation.growthImpulse;

  ctx.state.status = { ...ctx.state.status, water: 94, nutrition: 92, stress: 84, risk: 88, health: 50, growth: 50 };
  ctx.applyStatusDrift(60 * 1000);
  const degradedImpulse = ctx.state.simulation.growthImpulse;

  assert.ok(healthyImpulse > degradedImpulse, 'eco efficiency should reduce growth impulse under bad conditions');
})();

(function testRelativeHumidityRespondsToTemperatureAtFixedMoistureMass() {
  const ctx = loadSimContext();

  ctx.state.environmentControls = ctx.getEnvironmentControlDefaults();
  ctx.state.climate = {};
  ctx.state.setup = { mode: 'indoor', light: 'medium' };
  ctx.ensureClimateState(ctx.state, ctx.state.status, ctx.state.simulation, ctx.state.plant);

  const fixedAbsoluteHumidity = ctx.absoluteHumidityFromRelativeHumidity(24, 60);
  ctx.state.climate.tent.temperatureC = 24;
  ctx.state.climate.tent.absoluteHumidityGm3 = fixedAbsoluteHumidity;
  let readout = ctx.buildEnvironmentReadoutFromState(ctx.state, ctx.state.status, ctx.state.simulation, ctx.state.plant);
  const rhAt24 = readout.humidityPercent;

  ctx.state.climate.tent.temperatureC = 28;
  ctx.state.climate.tent.absoluteHumidityGm3 = fixedAbsoluteHumidity;
  readout = ctx.buildEnvironmentReadoutFromState(ctx.state, ctx.state.status, ctx.state.simulation, ctx.state.plant);
  const rhAt28 = readout.humidityPercent;

  assert.ok(rhAt28 < rhAt24, 'relative humidity should drop when temperature rises at fixed moisture mass');
})();

(function testRoomExchangePullsTentTowardAmbientIncrementally() {
  const ctx = loadSimContext();

  ctx.state.environmentControls = ctx.getEnvironmentControlDefaults();
  ctx.state.environmentControls.fan.minPercent = 85;
  ctx.state.environmentControls.fan.maxPercent = 100;
  ctx.state.environmentControls.airflowPercent = 85;
  ctx.state.environmentControls.targets.day.temperatureC = 24;
  ctx.state.environmentControls.targets.day.humidityPercent = 55;
  ctx.state.environmentControls.temperatureC = 24;
  ctx.state.environmentControls.humidityPercent = 55;
  ctx.state.climate = {};
  ctx.state.setup = { mode: 'indoor', light: 'medium' };

  ctx.ensureClimateState(ctx.state, ctx.state.status, ctx.state.simulation, ctx.state.plant);
  ctx.state.climate.tent.temperatureC = 30;
  ctx.state.climate.tent.absoluteHumidityGm3 = ctx.absoluteHumidityFromRelativeHumidity(30, 68);
  ctx.state.climate.room.current.temperatureC = 22;
  ctx.state.climate.room.current.absoluteHumidityGm3 = ctx.absoluteHumidityFromRelativeHumidity(22, 48);

  const beforeTemp = ctx.state.climate.tent.temperatureC;
  const beforeAbsHumidity = ctx.state.climate.tent.absoluteHumidityGm3;

  ctx.updateClimateState(10, ctx.state, ctx.state.status, ctx.state.simulation, ctx.state.plant);

  assert.ok(ctx.state.climate.tent.temperatureC < beforeTemp, 'tent temperature should move toward room temperature');
  assert.ok(ctx.state.climate.tent.absoluteHumidityGm3 < beforeAbsHumidity, 'tent moisture should move toward room moisture');
  assert.ok(ctx.state.climate.tent.temperatureC > ctx.state.climate.room.current.temperatureC, 'tent temperature should not jump directly to room temperature');
})();

(function testDefaultIndoorClimateKeepsQuarterHourInertia() {
  const ctx = loadSimContext();

  ctx.state.environmentControls = ctx.getEnvironmentControlDefaults();
  ctx.state.climate = {};
  ctx.state.setup = { mode: 'indoor', light: 'medium' };
  ctx.state.simulation.isDaytime = true;
  ctx.ensureClimateState(ctx.state, ctx.state.status, ctx.state.simulation, ctx.state.plant);

  ctx.state.climate.tent.temperatureC = 25;
  ctx.state.climate.tent.absoluteHumidityGm3 = ctx.absoluteHumidityFromRelativeHumidity(25, 60);
  ctx.state.climate.tent.humidityPercent = 60;
  ctx.state.climate.tent.vpdKpa = ctx.round2(ctx.computeVpdKpa(25, 60));
  ctx.state.climate.room.current.temperatureC = ctx.state.climate.room.day.temperatureC;
  ctx.state.climate.room.current.absoluteHumidityGm3 = ctx.absoluteHumidityFromRelativeHumidity(
    ctx.state.climate.room.day.temperatureC,
    ctx.state.climate.room.day.humidityPercent
  );
  ctx.state.climate.runtime.activePeriod = 'day';
  ctx.state.climate.runtime.transitionFromPeriod = 'day';
  ctx.state.climate.runtime.targetBlend = 1;

  ctx.updateClimateState(15, ctx.state, ctx.state.status, ctx.state.simulation, ctx.state.plant);

  assert.ok(ctx.state.climate.tent.temperatureC > 24, 'default indoor tent should keep thermal inertia over 15 minutes');
  assert.ok(ctx.state.climate.tent.temperatureC < 25.5, 'default indoor tent should not heat unrealistically fast over 15 minutes');
  assert.ok(ctx.state.climate.tent.humidityPercent >= 55, 'default indoor tent should not dump humidity too aggressively over 15 minutes');
})();

(function testNonIndoorModesIgnoreIndoorTentRuntimeDrift() {
  const ctx = loadSimContext();

  ctx.state.environmentControls = ctx.getEnvironmentControlDefaults();
  ctx.state.setup = { mode: 'outdoor', light: 'medium' };
  ctx.state.climate = {
    tent: {
      volumeM3: 1.28,
      temperatureC: 18,
      absoluteHumidityGm3: ctx.absoluteHumidityFromRelativeHumidity(18, 40),
      humidityPercent: 40,
      vpdKpa: ctx.round2(ctx.computeVpdKpa(18, 40)),
      airflowScore: 15,
      airflowLabel: 'Schwach',
      exchangePerMinute: 0.07,
      transpirationGph: 4
    },
    devices: {
      light: { enabled: true, targetPercent: 80, outputPercent: 80 },
      exhaust: { enabled: true, targetPercent: 100, outputPercent: 100 },
      circulation: { enabled: true, targetPercent: 100, outputPercent: 100 },
      heater: { enabled: true, targetPercent: 100, outputPercent: 100 },
      humidifier: { enabled: true, targetPercent: 100, outputPercent: 100 },
      dehumidifier: { enabled: true, targetPercent: 100, outputPercent: 100 }
    },
    room: {
      day: { temperatureC: 23, humidityPercent: 52 },
      night: { temperatureC: 20, humidityPercent: 58 },
      current: {
        temperatureC: 18,
        absoluteHumidityGm3: ctx.absoluteHumidityFromRelativeHumidity(18, 40)
      }
    },
    runtime: {
      activePeriod: 'day',
      transitionFromPeriod: 'day',
      targetBlend: 1,
      lastPeriodSwitchSimMs: 0,
      controlDemand: {}
    }
  };

  ctx.updateClimateState(30, ctx.state, ctx.state.status, ctx.state.simulation, ctx.state.plant);
  const readout = ctx.buildEnvironmentReadoutFromState(ctx.state, ctx.state.status, ctx.state.simulation, ctx.state.plant);

  assert.strictEqual(readout.temperatureC, ctx.state.environmentControls.temperatureC, 'non-indoor readout should follow legacy temperature controls');
  assert.strictEqual(readout.humidityPercent, ctx.state.environmentControls.humidityPercent, 'non-indoor readout should follow legacy humidity controls');
  assert.strictEqual(readout.airflowScore, ctx.state.environmentControls.airflowPercent, 'non-indoor readout should follow legacy airflow controls');
  assert.strictEqual(ctx.state.climate.tent.exchangePerMinute, 0, 'non-indoor mode should not keep indoor room-exchange drift active');
  assert.strictEqual(ctx.state.climate.tent.transpirationGph, 0, 'non-indoor mode should not keep indoor transpiration runtime active');
  assert.strictEqual(ctx.state.climate.devices.exhaust.outputPercent, 0, 'non-indoor mode should not keep indoor exhaust runtime active');
})();

(function testRaisedDayTemperatureTargetBuildsTrustWithinAnHour() {
  const ctx = loadSimContext();

  ctx.state.environmentControls = ctx.getEnvironmentControlDefaults();
  ctx.state.climate = {};
  ctx.state.setup = { mode: 'indoor', light: 'medium' };
  ctx.state.simulation.isDaytime = true;
  ctx.ensureClimateState(ctx.state, ctx.state.status, ctx.state.simulation, ctx.state.plant);

  ctx.state.climate.tent.temperatureC = 25;
  ctx.state.climate.tent.absoluteHumidityGm3 = ctx.absoluteHumidityFromRelativeHumidity(25, 60);
  ctx.state.climate.tent.humidityPercent = 60;
  ctx.state.climate.tent.vpdKpa = ctx.round2(ctx.computeVpdKpa(25, 60));
  ctx.state.climate.room.current.temperatureC = ctx.state.climate.room.day.temperatureC;
  ctx.state.climate.room.current.absoluteHumidityGm3 = ctx.absoluteHumidityFromRelativeHumidity(
    ctx.state.climate.room.day.temperatureC,
    ctx.state.climate.room.day.humidityPercent
  );
  ctx.state.climate.runtime.activePeriod = 'day';
  ctx.state.climate.runtime.transitionFromPeriod = 'day';
  ctx.state.climate.runtime.targetBlend = 1;

  ctx.state.environmentControls.targets.day.temperatureC = 29;
  ctx.updateClimateState(60, ctx.state, ctx.state.status, ctx.state.simulation, ctx.state.plant);

  assert.ok(ctx.state.climate.tent.temperatureC > 25.15, 'raised day temperature target should move the tent meaningfully upward within an hour');
  assert.ok(ctx.state.climate.devices.heater.outputPercent > 0, 'heater should participate when indoor tent sits below target');
})();

(function testHumidityTargetChangeDoesNotInstantlySnapActualTentRh() {
  const ctx = loadSimContext();

  ctx.state.environmentControls = ctx.getEnvironmentControlDefaults();
  ctx.state.climate = {};
  ctx.state.setup = { mode: 'indoor', light: 'medium' };
  ctx.state.simulation.isDaytime = true;
  ctx.ensureClimateState(ctx.state, ctx.state.status, ctx.state.simulation, ctx.state.plant);

  ctx.state.climate.tent.temperatureC = 25;
  ctx.state.climate.tent.absoluteHumidityGm3 = ctx.absoluteHumidityFromRelativeHumidity(25, 69);
  ctx.state.climate.tent.humidityPercent = 69;
  ctx.state.climate.tent.vpdKpa = ctx.round2(ctx.computeVpdKpa(25, 69));
  ctx.state.climate.room.current.temperatureC = ctx.state.climate.room.day.temperatureC;
  ctx.state.climate.room.current.absoluteHumidityGm3 = ctx.absoluteHumidityFromRelativeHumidity(
    ctx.state.climate.room.day.temperatureC,
    ctx.state.climate.room.day.humidityPercent
  );
  ctx.state.climate.runtime.activePeriod = 'day';
  ctx.state.climate.runtime.transitionFromPeriod = 'day';
  ctx.state.climate.runtime.targetBlend = 1;

  const before = ctx.buildEnvironmentReadoutFromState(ctx.state, ctx.state.status, ctx.state.simulation, ctx.state.plant);
  ctx.state.environmentControls.targets.day.humidityPercent = 62;
  ctx.normalizeEnvironmentControls(ctx.state);
  const immediate = ctx.buildEnvironmentReadoutFromState(ctx.state, ctx.state.status, ctx.state.simulation, ctx.state.plant);

  assert.strictEqual(before.humidityPercent, 69, 'test setup should start from the actual tent RH');
  assert.strictEqual(immediate.humidityPercent, 69, 'changing RH target must not instantly snap actual tent RH');

  ctx.updateClimateState(15, ctx.state, ctx.state.status, ctx.state.simulation, ctx.state.plant);
  const after = ctx.buildEnvironmentReadoutFromState(ctx.state, ctx.state.status, ctx.state.simulation, ctx.state.plant);
  assert.ok(after.humidityPercent < immediate.humidityPercent, 'actual tent RH should start moving gradually after the target change');
  assert.ok(after.humidityPercent > 62, 'actual tent RH should not instantly converge to the new target');
})();

(function testTemperatureTargetChangeDoesNotInstantlySnapActualTentTemp() {
  const ctx = loadSimContext();

  ctx.state.environmentControls = ctx.getEnvironmentControlDefaults();
  ctx.state.climate = {};
  ctx.state.setup = { mode: 'indoor', light: 'medium' };
  ctx.state.simulation.isDaytime = true;
  ctx.ensureClimateState(ctx.state, ctx.state.status, ctx.state.simulation, ctx.state.plant);

  ctx.state.climate.tent.temperatureC = 24.4;
  ctx.state.climate.tent.absoluteHumidityGm3 = ctx.absoluteHumidityFromRelativeHumidity(24.4, 60);
  ctx.state.climate.tent.humidityPercent = 60;
  ctx.state.climate.tent.vpdKpa = ctx.round2(ctx.computeVpdKpa(24.4, 60));
  ctx.state.climate.room.current.temperatureC = ctx.state.climate.room.day.temperatureC;
  ctx.state.climate.room.current.absoluteHumidityGm3 = ctx.absoluteHumidityFromRelativeHumidity(
    ctx.state.climate.room.day.temperatureC,
    ctx.state.climate.room.day.humidityPercent
  );
  ctx.state.climate.runtime.activePeriod = 'day';
  ctx.state.climate.runtime.transitionFromPeriod = 'day';
  ctx.state.climate.runtime.targetBlend = 1;

  const before = ctx.buildEnvironmentReadoutFromState(ctx.state, ctx.state.status, ctx.state.simulation, ctx.state.plant);
  ctx.state.environmentControls.targets.day.temperatureC = 29;
  ctx.normalizeEnvironmentControls(ctx.state);
  const immediate = ctx.buildEnvironmentReadoutFromState(ctx.state, ctx.state.status, ctx.state.simulation, ctx.state.plant);

  assert.strictEqual(immediate.temperatureC, before.temperatureC, 'changing temperature target must not instantly snap actual tent temperature');

  ctx.updateClimateState(30, ctx.state, ctx.state.status, ctx.state.simulation, ctx.state.plant);
  const after = ctx.buildEnvironmentReadoutFromState(ctx.state, ctx.state.status, ctx.state.simulation, ctx.state.plant);
  assert.ok(after.temperatureC > immediate.temperatureC, 'actual tent temperature should rise gradually after a higher target is set');
  assert.ok(after.temperatureC < 29, 'actual tent temperature should not instantly converge to the new target');
})();

console.log('environment-core regression tests passed');
