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

(function testShortLightDeviationBarelyMovesRisk() {
  const ctx = loadSimContext();
  setSimClock(ctx, '2026-03-01T14:00:00');
  ctx.state.status = { health: 86, stress: 18, risk: 16, water: 28, nutrition: 62, growth: 0 };

  const stressBefore = ctx.state.status.stress;
  const riskBefore = ctx.state.status.risk;

  ctx.applyStatusDrift(10 * 60 * 1000);

  assert.ok(Math.abs(ctx.state.status.stress - stressBefore) < 1.2, `short slight issue should keep stress nearly stable, got ${ctx.state.status.stress - stressBefore}`);
  assert.ok(ctx.state.status.risk - riskBefore < 0.45, `short slight issue should barely move risk, got ${ctx.state.status.risk - riskBefore}`);
})();

(function testSeveralHoursSuboptimalRaiseStressBeforeRisk() {
  const ctx = loadSimContext();
  setSimClock(ctx, '2026-03-01T12:00:00');
  ctx.state.status = { health: 80, stress: 22, risk: 18, water: 44, nutrition: 50, growth: 0 };
  ctx.state.environmentControls.temperatureC = 30;
  ctx.state.environmentControls.humidityPercent = 43;
  ctx.state.environmentControls.targets.day.temperatureC = 29;
  ctx.state.environmentControls.targets.day.humidityPercent = 44;
  ctx.state.environmentControls.targets.day.vpdKpa = 1.75;
  ctx.state.environmentControls.fan.minPercent = 40;
  ctx.state.environmentControls.airflowPercent = 40;
  ctx.state.environmentControls.ph = 5.2;
  ctx.state.environmentControls.ec = 2.35;

  const stressBefore = ctx.state.status.stress;
  const riskBefore = ctx.state.status.risk;

  for (let index = 0; index < 24; index += 1) {
    ctx.applyStatusDrift(20 * 60 * 1000);
  }

  assert.ok(ctx.state.status.stress - stressBefore > 4.5, `suboptimal multi-hour window should raise stress noticeably, got ${ctx.state.status.stress - stressBefore}`);
  assert.ok(ctx.state.status.risk - riskBefore > 0.4, `suboptimal multi-hour window should raise risk eventually, got ${ctx.state.status.risk - riskBefore}`);
  assert.ok((ctx.state.status.stress - stressBefore) > (ctx.state.status.risk - riskBefore), 'stress should still react faster than risk');
})();

(function testCriticalSetupDoesNotInstantlyPegRisk() {
  const ctx = loadSimContext();
  setSimClock(ctx, '2026-03-01T10:00:00');
  ctx.state.status = { health: 68, stress: 38, risk: 24, water: 18, nutrition: 28, growth: 0 };
  ctx.state.environmentControls.targets.day.temperatureC = 32;
  ctx.state.environmentControls.targets.day.humidityPercent = 35;
  ctx.state.environmentControls.targets.day.vpdKpa = 2.2;
  ctx.state.environmentControls.fan.minPercent = 25;
  ctx.state.environmentControls.airflowPercent = 25;

  for (let index = 0; index < 18; index += 1) {
    ctx.applyStatusDrift(20 * 60 * 1000);
  }

  assert.ok(ctx.state.status.stress > 56, `critical setup should push stress clearly high, got ${ctx.state.status.stress}`);
  assert.ok(ctx.state.status.risk > 32, `critical setup should raise risk significantly, got ${ctx.state.status.risk}`);
  assert.ok(ctx.state.status.risk < 80, `critical setup should not instantly peg risk to extremes, got ${ctx.state.status.risk}`);
})();

(function testRecoveryDropsStressFasterThanRisk() {
  const ctx = loadSimContext();
  setSimClock(ctx, '2026-03-02T09:00:00');
  ctx.state.status = { health: 78, stress: 54, risk: 40, water: 82, nutrition: 76, growth: 0 };
  ctx.state.simulation.stressExposure = 0.62;
  ctx.state.simulation.riskExposure = 0.38;

  const stressBefore = ctx.state.status.stress;
  const riskBefore = ctx.state.status.risk;

  for (let index = 0; index < 24; index += 1) {
    ctx.applyStatusDrift(20 * 60 * 1000);
  }

  const stressDrop = stressBefore - ctx.state.status.stress;
  const riskDrop = riskBefore - ctx.state.status.risk;
  assert.ok(stressDrop > 6, `recovery should reduce stress reliably, got ${stressDrop}`);
  assert.ok(riskDrop > 0.6, `recovery should reduce risk eventually, got ${riskDrop}`);
  assert.ok(stressDrop > riskDrop, 'stress should recover faster than risk');
})();

(function testOfflineCatchUpMatchesChunkedManualProcessingClosely() {
  const startIso = '2026-03-01T12:00:00';
  const totalMs = 6 * 60 * 60 * 1000;
  const ctxOffline = loadSimContext();
  const ctxManual = loadSimContext();
  const startMs = setSimClock(ctxOffline, startIso);
  setSimClock(ctxManual, startIso);

  const sharedStatus = { health: 78, stress: 24, risk: 18, water: 50, nutrition: 52, growth: 0 };
  ctxOffline.state.status = { ...sharedStatus };
  ctxManual.state.status = { ...sharedStatus };
  ctxOffline.state.environmentControls.targets.day.temperatureC = 29;
  ctxManual.state.environmentControls.targets.day.temperatureC = 29;
  ctxOffline.state.environmentControls.targets.day.humidityPercent = 45;
  ctxManual.state.environmentControls.targets.day.humidityPercent = 45;
  ctxOffline.state.environmentControls.targets.day.vpdKpa = 1.7;
  ctxManual.state.environmentControls.targets.day.vpdKpa = 1.7;
  ctxOffline.state.environmentControls.fan.minPercent = 40;
  ctxManual.state.environmentControls.fan.minPercent = 40;
  ctxOffline.state.environmentControls.airflowPercent = 40;
  ctxManual.state.environmentControls.airflowPercent = 40;

  ctxOffline.applyActiveActionEffects = () => {};
  ctxOffline.advanceGrowthTick = () => {};
  ctxManual.applyActiveActionEffects = () => {};
  ctxManual.advanceGrowthTick = () => {};

  ctxOffline.syncSimulationFromElapsedTime(startMs + totalMs);
  for (let index = 0; index < 18; index += 1) {
    ctxManual.advanceSimulationTime(20 * 60 * 1000, { suppressEvents: true, suppressLogs: true, offlineCatchUp: true });
  }

  assert.ok(Math.abs(ctxOffline.state.status.stress - ctxManual.state.status.stress) < 1.4, 'offline stress should stay close to manual chunking');
  assert.ok(Math.abs(ctxOffline.state.status.risk - ctxManual.state.status.risk) < 1.1, 'offline risk should stay close to manual chunking');
})();

console.log('stress risk phase 2 tests passed');
