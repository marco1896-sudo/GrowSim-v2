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

console.log('environment-core regression tests passed');
