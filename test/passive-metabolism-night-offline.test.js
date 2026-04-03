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
    clamp: (v, min, max) => Math.max(min, Math.min(max, v)),
    clampInt: (v, min, max) => Math.max(min, Math.min(max, Math.trunc(v))),
    round2: (v) => Math.round(v * 100) / 100,
    notifyPlantNeedsCare: () => {},
    runEventStateMachine: () => {},
    resetBoostDaily: () => {},
    updateVisibleOverlays: () => {},
    syncCanonicalStateShape: () => {},
    evaluateNotificationTriggers: () => {},
    applyActiveActionEffects: () => {},
    advanceGrowthTick: () => {},
    renderSheets: () => {},
    renderHud: () => {},
    renderEventSheet: () => {},
    renderAnalysisPanel: () => {},
    renderDeathOverlay: () => {},
    schedulePersistState: () => {},
    addLog: () => {},
    getCanonicalMeta: () => ({ rescue: {} }),
    getStageTimeline: () => [{ phase: 'seedling' }, { phase: 'vegetative' }, { phase: 'flowering' }],
    stageAssetKeyForIndex: (index) => `stage_${String(index + 1).padStart(2, '0')}`,
    syncDeathState: () => false,
    wasCriticalHealth: false,
    FREEZE_SIM_ON_DEATH: true,
    MAX_ELAPSED_PER_TICK_MS: 5000,
    MAX_OFFLINE_SIM_MS: 8 * 60 * 60 * 1000,
    SIM_DAY_START_HOUR: 6,
    SIM_NIGHT_START_HOUR: 22,
    REAL_RUN_DURATION_MS: 7 * 24 * 60 * 60 * 1000,
    TOTAL_LIFECYCLE_SIM_MS: 88 * 24 * 60 * 60 * 1000,
    SIM_DAY_MS: 24 * 60 * 60 * 1000,
    TOTAL_LIFECYCLE_SIM_DAYS: 88,
    STAGE_DEFS: [
      { simDayStart: 0, phase: 'seedling', minHealth: 30, maxStress: 85 },
      { simDayStart: 10, phase: 'vegetative', minHealth: 40, maxStress: 75 },
      { simDayStart: 40, phase: 'flowering', minHealth: 50, maxStress: 65 }
    ],
    DEFAULT_STAGE_TIMELINE: [
      { simDayStart: 0, phase: 'seedling', label: 'seedling' },
      { simDayStart: 10, phase: 'vegetative', label: 'veg' },
      { simDayStart: 40, phase: 'flowering', label: 'flower' }
    ],
    PHASE_LABEL_DE: { seedling: 'Keimling', vegetative: 'Vegetative', flowering: 'Blüte' },
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
        tickCount: 0,
        fairnessGraceUntilRealMs: 0,
        baseSpeed: 12
      },
      ui: { openSheet: null, lastRenderRealMs: 0, deathOverlayOpen: false, deathOverlayAcknowledged: false },
      plant: {
        phase: 'vegetative',
        isDead: false,
        stageIndex: 1,
        stageProgress: 0.2,
        stageKey: 'stage_02',
        lastValidStageKey: 'stage_02',
        averageHealth: 85,
        averageStress: 15,
        observedSimMs: 0,
        lifecycle: { qualityTier: 'normal', qualityScore: 75, qualityLocked: false }
      },
      status: { health: 85, stress: 15, risk: 20, water: 70, nutrition: 65, growth: 0 },
      setup: { mode: 'indoor', light: 'medium', medium: 'soil', potSize: 'medium', genetics: 'hybrid' },
      history: { telemetry: [] },
      environmentControls: {
        temperatureC: 25,
        humidityPercent: 60,
        airflowPercent: 65,
        ph: 6.0,
        ec: 1.4,
        targets: {
          day: { temperatureC: 25, humidityPercent: 60, vpdKpa: 1.27 },
          night: { temperatureC: 21, humidityPercent: 55, vpdKpa: 1.12 }
        },
        fan: { minPercent: 65, maxPercent: 100 },
        buffers: { temperatureC: 0.7, humidityPercent: 4, vpdKpa: 0.12 },
        ramp: { percentPerMinute: 18 },
        transitionMinutes: 45
      },
      events: { machineState: 'idle', scheduler: { nextEventRealTimeMs: 0 } },
      boost: { dayStamp: '2026-01-01', boostUsedToday: 0, boostEndsAtMs: 0 },
      actions: { activeEffects: [], cooldowns: {}, lastResult: { ok: true } },
      debug: { enabled: false, showInternalTicks: false }
    }
  };

  context.isPlantDead = () => context.state.plant.phase === 'dead' || context.state.plant.isDead || context.state.status.health <= 0;
  vm.createContext(context);
  vm.runInContext(simSource, context, { filename: 'sim.js' });
  return context;
}

function setSimClock(ctx, isoString) {
  const timeMs = new Date(isoString).getTime();
  ctx.state.simulation.nowMs = timeMs;
  ctx.state.simulation.startRealTimeMs = timeMs;
  ctx.state.simulation.lastTickRealTimeMs = timeMs;
  ctx.state.simulation.simEpochMs = timeMs;
  ctx.state.simulation.simTimeMs = timeMs;
  ctx.state.simulation.isDaytime = new Date(timeMs).getHours() >= 6 && new Date(timeMs).getHours() < 22;
  return timeMs;
}

(function testStableNightRemainsManageable() {
  const ctx = loadSimContext();
  const startMs = setSimClock(ctx, '2026-03-01T22:00:00');
  ctx.state.status = { health: 88, stress: 14, risk: 18, water: 72, nutrition: 66, growth: 0 };
  ctx.applyActiveActionEffects = () => {};
  ctx.advanceGrowthTick = () => {};

  ctx.syncSimulationFromElapsedTime(startMs + (8 * 60 * 60 * 1000));

  assert.ok(ctx.state.status.water <= 66 && ctx.state.status.water >= 45, `stable night water should be moderate, got ${ctx.state.status.water}`);
  assert.ok(ctx.state.status.nutrition <= 64 && ctx.state.status.nutrition >= 56, `stable night nutrition should only drift lightly, got ${ctx.state.status.nutrition}`);
  assert.ok((72 - ctx.state.status.water) > (66 - ctx.state.status.nutrition), 'water should fall faster than nutrition in a stable night');
  assert.ok(ctx.state.status.stress < 30, `stable night stress should stay controlled, got ${ctx.state.status.stress}`);
  assert.ok(ctx.state.status.risk < 35, `stable night risk should stay controlled, got ${ctx.state.status.risk}`);
})();

(function testSuboptimalNightDegradesButDoesNotSpikeUnfairly() {
  const ctx = loadSimContext();
  const startMs = setSimClock(ctx, '2026-03-01T22:00:00');
  ctx.state.status = { health: 78, stress: 28, risk: 24, water: 58, nutrition: 55, growth: 0 };
  ctx.state.environmentControls.targets.night.temperatureC = 16;
  ctx.state.environmentControls.targets.night.humidityPercent = 38;
  ctx.state.environmentControls.targets.night.vpdKpa = 1.8;
  ctx.state.environmentControls.fan.minPercent = 35;
  ctx.state.environmentControls.airflowPercent = 35;
  ctx.applyActiveActionEffects = () => {};
  ctx.advanceGrowthTick = () => {};

  ctx.syncSimulationFromElapsedTime(startMs + (8 * 60 * 60 * 1000));

  assert.ok(ctx.state.status.water < 58, 'suboptimal night should reduce water noticeably');
  assert.ok(ctx.state.status.nutrition < 55, 'suboptimal night should reduce nutrition');
  assert.ok((58 - ctx.state.status.water) > (55 - ctx.state.status.nutrition), 'water should still fall faster than nutrition when suboptimal');
  assert.ok(ctx.state.status.stress < 55, `suboptimal night should worsen stress fairly, got ${ctx.state.status.stress}`);
  assert.ok(ctx.state.status.risk < 50, `suboptimal night should worsen risk fairly, got ${ctx.state.status.risk}`);
})();

(function testBadSetupCatchUpStillAvoidsSemanticOverkill() {
  const ctx = loadSimContext();
  const startMs = setSimClock(ctx, '2026-03-01T21:00:00');
  ctx.state.status = { health: 62, stress: 46, risk: 38, water: 34, nutrition: 42, growth: 0 };
  ctx.state.environmentControls.targets.day.temperatureC = 31;
  ctx.state.environmentControls.targets.day.humidityPercent = 38;
  ctx.state.environmentControls.targets.day.vpdKpa = 2.0;
  ctx.state.environmentControls.targets.night.temperatureC = 16;
  ctx.state.environmentControls.targets.night.humidityPercent = 32;
  ctx.state.environmentControls.targets.night.vpdKpa = 1.9;
  ctx.state.environmentControls.fan.minPercent = 28;
  ctx.state.environmentControls.airflowPercent = 28;
  ctx.applyActiveActionEffects = () => {};
  ctx.advanceGrowthTick = () => {};

  ctx.syncSimulationFromElapsedTime(startMs + (8 * 60 * 60 * 1000));

  assert.ok(ctx.state.status.water < 34, 'bad setup should clearly worsen water');
  assert.ok(ctx.state.status.nutrition < 42, 'bad setup should worsen nutrition');
  assert.ok(ctx.state.status.health > 0, 'bad setup should not die purely from catch-up semantics');
  assert.ok(ctx.state.status.risk < 100, 'bad setup should not hard-cap risk purely from catch-up semantics');
})();

console.log('passive metabolism night/offline tests passed');
