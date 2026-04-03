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
    notifyPlantNeedsCare: () => {},
    runEventStateMachine: () => {},
    resetBoostDaily: () => {},
    updateVisibleOverlays: () => {},
    syncCanonicalStateShape: () => {},
    evaluateNotificationTriggers: () => {},
    applyActiveActionEffects: () => {},
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
    PHASE_LABEL_DE: { seedling: 'Keimling', vegetative: 'Vegetative', flowering: 'Bluete' },
    STAGE_ASSET_FALLBACK: { stage_01: 'plant_growth_sprite.png#frame_001' },
    state: {
      simulation: {
        nowMs: 0,
        lastTickRealTimeMs: 0,
        startRealTimeMs: 0,
        simEpochMs: 0,
        simTimeMs: 0,
        growthImpulse: 0,
        tempoOffsetDays: 0,
        stressExposure: 0,
        riskExposure: 0,
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
        progressOffsetSimMs: 0,
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

function advanceGrowthOnly(ctx, totalHours, stepMinutes = 20) {
  const stepMs = stepMinutes * 60 * 1000;
  const loops = Math.round((totalHours * 60) / stepMinutes);
  for (let index = 0; index < loops; index += 1) {
    const nextSimTimeMs = Number(ctx.state.simulation.simTimeMs || 0) + stepMs;
    ctx.state.simulation.simTimeMs = nextSimTimeMs;
    ctx.state.simulation.nowMs = nextSimTimeMs;
    const hour = new Date(nextSimTimeMs).getHours();
    ctx.state.simulation.isDaytime = hour >= 6 && hour < 22;
    ctx.advanceGrowthTick(stepMs, { suppressDeath: true });
  }
}

(function testGrowthMultiplierOrderingAndRange() {
  const ctx = loadSimContext();
  setSimClock(ctx, '2026-03-01T12:00:00');

  ctx.state.status = { health: 92, stress: 8, risk: 6, water: 74, nutrition: 70, growth: 0 };
  const perfect = ctx.computeGrowthSpeedMultiplier(ctx.state);

  ctx.state.status = { health: 76, stress: 30, risk: 20, water: 54, nutrition: 52, growth: 0 };
  const normal = ctx.computeGrowthSpeedMultiplier(ctx.state);

  ctx.state.status = { health: 68, stress: 46, risk: 30, water: 40, nutrition: 42, growth: 0 };
  const mediocre = ctx.computeGrowthSpeedMultiplier(ctx.state);

  ctx.state.status = { health: 40, stress: 80, risk: 62, water: 12, nutrition: 18, growth: 0 };
  const poor = ctx.computeGrowthSpeedMultiplier(ctx.state);

  assert.ok(perfect > normal && normal > mediocre && mediocre > poor, 'growth multiplier should order perfect > normal > mediocre > poor');
  assert.ok(perfect >= 1.18 && perfect <= 1.4, `perfect run multiplier should be rewarded, got ${perfect}`);
  assert.ok(normal >= 0.92 && normal <= 1.12, `normal run multiplier should stay near baseline, got ${normal}`);
  assert.ok(mediocre >= 0.5 && mediocre <= 0.85, `mediocre run multiplier should slow growth noticeably, got ${mediocre}`);
  assert.ok(poor >= 0.1 && poor <= 0.45, `poor run multiplier should nearly stall growth, got ${poor}`);
})();

(function testGrowthProgressFollowsConditionQuality() {
  const perfectCtx = loadSimContext();
  const normalCtx = loadSimContext();
  const mediocreCtx = loadSimContext();
  const poorCtx = loadSimContext();
  setSimClock(perfectCtx, '2026-03-01T08:00:00');
  setSimClock(normalCtx, '2026-03-01T08:00:00');
  setSimClock(mediocreCtx, '2026-03-01T08:00:00');
  setSimClock(poorCtx, '2026-03-01T08:00:00');

  perfectCtx.state.status = { health: 92, stress: 8, risk: 6, water: 74, nutrition: 70, growth: 0 };
  normalCtx.state.status = { health: 76, stress: 30, risk: 20, water: 54, nutrition: 52, growth: 0 };
  mediocreCtx.state.status = { health: 68, stress: 46, risk: 30, water: 40, nutrition: 42, growth: 0 };
  poorCtx.state.status = { health: 40, stress: 80, risk: 62, water: 12, nutrition: 18, growth: 0 };

  advanceGrowthOnly(perfectCtx, 12);
  advanceGrowthOnly(normalCtx, 12);
  advanceGrowthOnly(mediocreCtx, 12);
  advanceGrowthOnly(poorCtx, 12);

  assert.ok(perfectCtx.state.status.growth > normalCtx.state.status.growth, 'perfect run should progress faster than normal');
  assert.ok(normalCtx.state.status.growth > mediocreCtx.state.status.growth, 'normal run should progress faster than mediocre');
  assert.ok(mediocreCtx.state.status.growth > poorCtx.state.status.growth, 'mediocre run should progress faster than poor');
  assert.ok((perfectCtx.state.status.growth - normalCtx.state.status.growth) > 0.05, 'perfect run should create a visible growth lead');
  assert.ok((normalCtx.state.status.growth - poorCtx.state.status.growth) > 0.2, 'poor run should feel close to stalled relative to normal');
})();

(function testRecoveryImprovesGrowthSpeedAgain() {
  const ctx = loadSimContext();
  setSimClock(ctx, '2026-03-01T09:00:00');
  ctx.state.status = { health: 62, stress: 56, risk: 34, water: 32, nutrition: 36, growth: 0 };

  advanceGrowthOnly(ctx, 4);
  const growthAfterBadWindow = ctx.state.status.growth;
  const impulseDuringBadWindow = ctx.state.simulation.growthImpulse;

  ctx.state.status = { health: 84, stress: 18, risk: 16, water: 76, nutrition: 70, growth: growthAfterBadWindow };
  advanceGrowthOnly(ctx, 4);

  const growthAfterRecovery = ctx.state.status.growth;
  const recoveryDelta = growthAfterRecovery - growthAfterBadWindow;
  assert.ok(recoveryDelta > 0.12, `good recovery window should visibly accelerate growth again, got ${recoveryDelta}`);
  assert.ok(ctx.state.simulation.growthImpulse > impulseDuringBadWindow, 'growth impulse should improve when the plant recovers');
})();

(function testOfflineGrowthMatchesChunkedProgression() {
  const offlineCtx = loadSimContext();
  const manualCtx = loadSimContext();
  const startMs = setSimClock(offlineCtx, '2026-03-01T10:00:00');
  setSimClock(manualCtx, '2026-03-01T10:00:00');

  offlineCtx.state.status = { health: 82, stress: 22, risk: 14, water: 62, nutrition: 58, growth: 0 };
  manualCtx.state.status = { health: 82, stress: 22, risk: 14, water: 62, nutrition: 58, growth: 0 };

  offlineCtx.applyStatusDrift = () => {};
  offlineCtx.applyActiveActionEffects = () => {};
  manualCtx.applyStatusDrift = () => {};
  manualCtx.applyActiveActionEffects = () => {};

  offlineCtx.syncSimulationFromElapsedTime(startMs + (6 * 60 * 60 * 1000));
  for (let index = 0; index < 18; index += 1) {
    manualCtx.advanceSimulationTime(Number(manualCtx.state.simulation.nowMs || startMs) + (20 * 60 * 1000), {
      suppressEvents: true,
      suppressLogs: true,
      offlineCatchUp: true
    });
  }

  assert.ok(Math.abs(offlineCtx.state.status.growth - manualCtx.state.status.growth) < 0.05, 'offline growth should match chunked manual processing closely');
})();

console.log('growth speed phase 3 tests passed');
