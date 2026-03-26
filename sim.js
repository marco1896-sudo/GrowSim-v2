'use strict';

const FAIRNESS_REACTION_GRACE_MS = 2 * 60 * 1000;
const OFFLINE_STATUS_DECAY_MULTIPLIER = 0.72;
const WATER_STRESS_THRESHOLD = 30;
const WATER_CRITICAL_THRESHOLD = 12;
const NUTRITION_STRESS_THRESHOLD = 30;
const NUTRITION_CRITICAL_THRESHOLD = 14;

const ENV_STAGE_PROFILES = Object.freeze([
  Object.freeze({ minStage: 1, maxStage: 2, temp: [22, 28], humidity: [60, 78], vpd: [0.50, 1.10], ec: [0.7, 1.3], ph: [5.8, 6.3] }),
  Object.freeze({ minStage: 3, maxStage: 6, temp: [23, 29], humidity: [50, 70], vpd: [0.80, 1.40], ec: [1.0, 2.0], ph: [5.7, 6.2] }),
  Object.freeze({ minStage: 7, maxStage: 10, temp: [21, 28], humidity: [40, 58], vpd: [1.00, 1.65], ec: [1.2, 2.2], ph: [5.8, 6.3] }),
  Object.freeze({ minStage: 11, maxStage: 12, temp: [20, 26], humidity: [40, 56], vpd: [0.90, 1.55], ec: [0.8, 1.6], ph: [5.8, 6.4] })
]);

function getEnvStageProfile(stageIndexOneBased) {
  const stage = clampInt(Number(stageIndexOneBased) || 1, 1, 12);
  return ENV_STAGE_PROFILES.find((profile) => stage >= profile.minStage && stage <= profile.maxStage) || ENV_STAGE_PROFILES[1];
}

function getEnvironmentControlsForSimulation() {
  const controls = state && state.environmentControls && typeof state.environmentControls === 'object'
    ? state.environmentControls
    : {};
  const safeTemp = Number.isFinite(Number(controls.temperatureC)) ? Number(controls.temperatureC) : 25;
  const safeHumidity = Number.isFinite(Number(controls.humidityPercent)) ? Number(controls.humidityPercent) : 60;
  const safeAirflow = Number.isFinite(Number(controls.airflowPercent)) ? Number(controls.airflowPercent) : 70;
  const safePh = Number.isFinite(Number(controls.ph)) ? Number(controls.ph) : 6.0;
  const safeEc = Number.isFinite(Number(controls.ec)) ? Number(controls.ec) : 1.4;

  return {
    temperatureC: clamp(safeTemp, 16, 36),
    humidityPercent: clampInt(safeHumidity, 30, 90),
    airflowPercent: clampInt(safeAirflow, 0, 100),
    ph: clamp(safePh, 5.0, 7.0),
    ec: clamp(safeEc, 0.6, 2.8)
  };
}

function buildEnvironmentModelFromState(statusLike = state.status, simulationLike = state.simulation, plantLike = state.plant) {
  const water = clamp(Number(statusLike.water || 0), 0, 100);
  const stress = clamp(Number(statusLike.stress || 0), 0, 100);
  const risk = clamp(Number(statusLike.risk || 0), 0, 100);
  const stageIndexOneBased = clampInt(Number((plantLike && plantLike.stageIndex) || 0) + 1, 1, 12);
  const profile = getEnvStageProfile(stageIndexOneBased);
  const controls = getEnvironmentControlsForSimulation();
  const isDay = Boolean(simulationLike && simulationLike.isDaytime);

  const dayBase = isDay ? 24.4 : 20.7;
  const physicsTemp = clamp(dayBase + (stress * 0.048) + (risk * 0.018), 17, 36);
  const physicsHumidity = Math.round(clamp(41 + (water * 0.40) - (stress * 0.15), 30, 84));
  const temperatureC = clamp((physicsTemp * 0.40) + (controls.temperatureC * 0.60), 16, 36);
  const humidityPercent = Math.round(clamp((physicsHumidity * 0.42) + (controls.humidityPercent * 0.58), 30, 90));
  const vpdKpa = clamp(0.72 + ((temperatureC - 21) * 0.082) + ((60 - humidityPercent) * 0.012), 0.35, 2.6);
  const ppfd = isDay ? Math.round(clamp(560 + (Number(statusLike.growth || 0) * 2.2), 420, 980)) : 45;
  const airflowScore = clamp(Math.round((controls.airflowPercent * 0.82) + ((100 - risk - Math.round(stress * 0.34)) * 0.18)), 0, 100);
  const airflowLabel = airflowScore >= 70 ? 'Good' : airflowScore >= 40 ? 'Mittel' : 'Schwach';

  const tempDeviation = profile.temp ? Math.max(0, profile.temp[0] - temperatureC, temperatureC - profile.temp[1]) : 0;
  const humidityDeviation = profile.humidity ? Math.max(0, profile.humidity[0] - humidityPercent, humidityPercent - profile.humidity[1]) : 0;
  const vpdDeviation = profile.vpd ? Math.max(0, profile.vpd[0] - vpdKpa, vpdKpa - profile.vpd[1]) : 0;

  return {
    temperatureC,
    humidityPercent,
    vpdKpa,
    ppfd,
    airflowScore,
    airflowLabel,
    stageProfile: profile,
    stressFactor: {
      temp: clamp(tempDeviation / 7, 0, 1),
      humidity: clamp(humidityDeviation / 30, 0, 1),
      vpd: clamp(vpdDeviation / 0.95, 0, 1),
      airflow: clamp((45 - airflowScore) / 45, 0, 1)
    }
  };
}

function buildRootZoneModelFromState(statusLike = state.status, env = buildEnvironmentModelFromState(statusLike, state.simulation, state.plant), plantLike = state.plant) {
  const nutrition = clamp(Number(statusLike.nutrition || 0), 0, 100);
  const water = clamp(Number(statusLike.water || 0), 0, 100);
  const risk = clamp(Number(statusLike.risk || 0), 0, 100);
  const stageIndexOneBased = clampInt(Number((plantLike && plantLike.stageIndex) || 0) + 1, 1, 12);
  const profile = getEnvStageProfile(stageIndexOneBased);
  const controls = getEnvironmentControlsForSimulation();

  const computedPh = clamp(5.6 + ((nutrition - 50) * 0.008) - ((risk - 40) * 0.003), 5.3, 6.7);
  const computedEc = clamp(0.8 + (nutrition * 0.01), 0.5, 2.4);
  const phValue = clamp((controls.ph * 0.78) + (computedPh * 0.22), 5.0, 7.0);
  const ecValue = clamp((controls.ec * 0.84) + (computedEc * 0.16), 0.6, 2.8);
  const oxygenPercent = Math.round(clamp(92 - (water * 0.28) - (risk * 0.18), 30, 96));
  const rootHealthPercent = Math.round(clamp(55 + (nutrition * 0.32) - (risk * 0.25) - ((env.vpdKpa - 1.2) * 12), 10, 99));

  const phDeviation = profile.ph ? Math.max(0, profile.ph[0] - phValue, phValue - profile.ph[1]) : 0;
  const ecDeviation = profile.ec ? Math.max(0, profile.ec[0] - ecValue, ecValue - profile.ec[1]) : 0;

  return {
    ph: phValue,
    ec: ecValue,
    oxygenPercent,
    rootHealthPercent,
    stageProfile: profile,
    stressFactor: {
      ph: clamp(phDeviation / 1.0, 0, 1),
      ec: clamp(ecDeviation / 1.4, 0, 1),
      oxygen: clamp((50 - oxygenPercent) / 50, 0, 1)
    }
  };
}

const __gsGlobal = typeof globalThis !== 'undefined'
  ? globalThis
  : (typeof window !== 'undefined' ? window : this);

__gsGlobal.GrowSimEnvModel = __gsGlobal.GrowSimEnvModel || Object.freeze({
  getEnvStageProfile,
  buildEnvironmentModelFromState,
  buildRootZoneModelFromState
});

function tick() {
  const nowMs = Date.now();
  const prevOpenSheet = state.ui.openSheet;
  const prevTickRealTimeMs = Number(state.simulation.lastTickRealTimeMs) || nowMs;

  state.simulation.nowMs = nowMs;
  state.simulation.tickCount += 1;

  if (syncDeathState() && FREEZE_SIM_ON_DEATH) {
    state.simulation.lastTickRealTimeMs = nowMs;
    state.simulation.growthImpulse = 0;
    syncCanonicalStateShape();

    if (state.ui.openSheet !== prevOpenSheet) {
      renderSheets();
    }

    renderHud();
    renderEventSheet();
    renderAnalysisPanel();
    renderDeathOverlay();
    schedulePersistState();
    return;
  }

  const rawElapsed = nowMs - prevTickRealTimeMs;
  const elapsedRealMs = Number.isFinite(rawElapsed) && rawElapsed > 0
    ? clamp(rawElapsed, 0, MAX_ELAPSED_PER_TICK_MS)
    : 0;
  const effectiveNowMs = prevTickRealTimeMs + elapsedRealMs;
  applySimulationDelta(elapsedRealMs, effectiveNowMs, nowMs);

  if (state.ui.openSheet !== prevOpenSheet) {
    renderSheets();
  }

  renderHud();
  state.ui.lastRenderRealMs = nowMs;
  renderEventSheet();
  renderAnalysisPanel();
  renderDeathOverlay();
  schedulePersistState();
}

function resolveEffectiveSimulationNowMs(candidateNowMs, elapsedRealMs) {
  const rawCandidate = Number(candidateNowMs);
  if (Number.isFinite(rawCandidate)) {
    return rawCandidate;
  }

  const previousTickMs = Number(state.simulation.lastTickRealTimeMs);
  const safePreviousTickMs = Number.isFinite(previousTickMs) ? previousTickMs : Date.now();
  const safeElapsedRealMs = Number.isFinite(elapsedRealMs) && elapsedRealMs > 0 ? elapsedRealMs : 0;
  return safePreviousTickMs + safeElapsedRealMs;
}

function applySimulationDelta(elapsedRealMs, effectiveNowMs, wallNowMs = effectiveNowMs) {
  const options = arguments[3] && typeof arguments[3] === 'object' ? arguments[3] : {};
  const suppressEvents = Boolean(options.suppressEvents);
  const suppressDeath = Boolean(options.suppressDeath);
  const persistWallNowAsLastTick = Boolean(options.persistWallNowAsLastTick);
  const safeElapsedRealMs = Number.isFinite(elapsedRealMs) && elapsedRealMs > 0 ? elapsedRealMs : 0;
  const safeEffectiveNowMs = resolveEffectiveSimulationNowMs(effectiveNowMs, safeElapsedRealMs);
  const safeWallNowMs = Number.isFinite(Number(wallNowMs)) ? Number(wallNowMs) : safeEffectiveNowMs;

  const plantTime = getPlantTimeFromElapsed(safeEffectiveNowMs);
  const previousSimTimeMs = Number(state.simulation.simTimeMs) || Number(state.simulation.simEpochMs) || plantTime.simTimeMs;
  const elapsedSimMs = Math.max(0, plantTime.simTimeMs - previousSimTimeMs);
  const wasDaytimeBefore = isDaytimeAtSimTime(previousSimTimeMs);
  const nowDaytime = isDaytimeAtSimTime(plantTime.simTimeMs);

  state.simulation.simTimeMs = plantTime.simTimeMs;
  state.simulation.isDaytime = nowDaytime;
  state.simulation.lastTickRealTimeMs = persistWallNowAsLastTick ? safeWallNowMs : safeEffectiveNowMs;

  if (!wasDaytimeBefore && nowDaytime) {
    state.simulation.fairnessGraceUntilRealMs = Math.max(
      Number(state.simulation.fairnessGraceUntilRealMs) || 0,
      safeWallNowMs + FAIRNESS_REACTION_GRACE_MS
    );
    addLog('system', 'Tagphase erreicht: kurze Reaktionszeit aktiv', {
      graceUntilRealMs: state.simulation.fairnessGraceUntilRealMs
    });
  }

  applyStatusDrift(safeElapsedRealMs);
  const criticalNow = Number(state.status.health) < 20;
  if (criticalNow && !wasCriticalHealth) {
    notifyPlantNeedsCare('Deine Pflanze ist kritisch und braucht Pflege.');
  }
  wasCriticalHealth = criticalNow;
  applyActiveActionEffects(elapsedSimMs);
  const suppressDeathForLockedWindow = suppressDeath || isDeathSuppressedForFairness(safeWallNowMs);
  advanceGrowthTick(elapsedSimMs, { suppressDeath: suppressDeathForLockedWindow });
  applyFairnessSurvivalGuard(safeWallNowMs);
  if (!suppressEvents) {
    runEventStateMachine(safeEffectiveNowMs);
  }
  resetBoostDaily(safeWallNowMs);
  updateVisibleOverlays();
  syncCanonicalStateShape();
  evaluateNotificationTriggers(safeWallNowMs);
}

function isDeathSuppressedForFairness(nowMs) {
  if (!state.simulation.isDaytime) {
    return true;
  }
  const graceUntil = Number(state.simulation.fairnessGraceUntilRealMs) || 0;
  return Number.isFinite(graceUntil) && Number(nowMs) < graceUntil;
}

function applyFairnessSurvivalGuard(nowMs) {
  if (state.plant.phase === 'dead' || state.plant.isDead === true) {
    return;
  }
  if (!isDeathSuppressedForFairness(nowMs)) {
    return;
  }

  const wouldDie = Number(state.status.health) <= 0 || Number(state.status.risk) >= 100;
  if (!wouldDie) {
    return;
  }

  state.status.health = Math.max(1, Number(state.status.health) || 0);
  state.status.water = Math.max(3, Number(state.status.water) || 0);
  state.status.nutrition = Math.max(3, Number(state.status.nutrition) || 0);
  state.status.stress = Math.min(99, Number(state.status.stress) || 0);
  state.status.risk = Math.min(99, Number(state.status.risk) || 0);
  state.plant.isDead = false;
  if (state.plant.phase === 'dead') {
    state.plant.phase = getStageTimeline()[clampInt(Number(state.plant.stageIndex) || 0, 0, Math.max(0, getStageTimeline().length - 1))]?.phase || 'seedling';
  }
  state.ui.deathOverlayOpen = false;
  clampStatus();
}

function syncSimulationFromElapsedTime(nowMs) {
  const requestedNowMs = Number(nowMs);
  const safeNowMs = Number.isFinite(requestedNowMs) ? requestedNowMs : Date.now();
  state.simulation.nowMs = safeNowMs;

  try {
    if (syncDeathState() && FREEZE_SIM_ON_DEATH) {
      state.simulation.lastTickRealTimeMs = safeNowMs;
      state.simulation.growthImpulse = 0;
      syncCanonicalStateShape();
      return;
    }

    const previousTickMs = Number(state.simulation.lastTickRealTimeMs);
    const safePreviousTickMs = Number.isFinite(previousTickMs) ? previousTickMs : safeNowMs;
    const elapsedRealMs = Math.max(0, safeNowMs - safePreviousTickMs);
    const effectiveElapsedRealMs = Math.min(elapsedRealMs, MAX_OFFLINE_SIM_MS);
    const effectiveNowMs = safePreviousTickMs + effectiveElapsedRealMs;
    const discardedElapsedRealMs = Math.max(0, elapsedRealMs - effectiveElapsedRealMs);
    const wasDeadBeforeCatchUp = isPlantDead();
    const beforeStats = {
      health: round2(state.status.health),
      stress: round2(state.status.stress),
      risk: round2(state.status.risk),
      water: round2(state.status.water)
    };

    if (state.debug && state.debug.enabled) {
      console.debug('[offline]', {
        requestedNowMs: safeNowMs,
        previousTickMs: safePreviousTickMs,
        elapsedRealMs,
        effectiveElapsedRealMs,
        maxOfflineSimMs: MAX_OFFLINE_SIM_MS,
        discardMs: discardedElapsedRealMs,
        eventsSuppressed: true
      });
    }

    if (elapsedRealMs > MAX_OFFLINE_SIM_MS) {
      addLog('system', 'Du warst lange weg. Offline-Simulation wurde begrenzt.', {
        offlineElapsedHours: round2(elapsedRealMs / (60 * 60 * 1000)),
        simulatedHours: round2(MAX_OFFLINE_SIM_MS / (60 * 60 * 1000))
      });
    }

    applySimulationDelta(effectiveElapsedRealMs, effectiveNowMs, safeNowMs, {
      suppressEvents: true,
      suppressDeath: true,
      persistWallNowAsLastTick: true
    });

    if (discardedElapsedRealMs > 0 && Number.isFinite(Number(state.simulation.startRealTimeMs))) {
      state.simulation.startRealTimeMs += discardedElapsedRealMs;
    }

    if (!wasDeadBeforeCatchUp) {
      applyOfflineFairnessFloor();
      if (isPlantDead() && shouldProtectOfflineNightDeath(safePreviousTickMs, safeNowMs)) {
        applyOfflineNightSurvivalClamp();
      }
      syncCanonicalStateShape();
    }

    if (state.debug && state.debug.enabled) {
      console.debug('[offline:result]', {
        healthBefore: beforeStats.health,
        healthAfter: round2(state.status.health),
        stressBefore: beforeStats.stress,
        stressAfter: round2(state.status.stress),
        riskBefore: beforeStats.risk,
        riskAfter: round2(state.status.risk),
        waterBefore: beforeStats.water,
        waterAfter: round2(state.status.water),
        deathProtected: !wasDeadBeforeCatchUp && !isPlantDead(),
        lastTickRealTimeMs: state.simulation.lastTickRealTimeMs
      });
    }
  } catch (error) {
    console.error('[offline] catch-up failed', error);
    state.simulation.lastTickRealTimeMs = safeNowMs;
    state.simulation.growthImpulse = 0;
    addLog('system', 'Offline-Fortschritt konnte nicht vollständig berechnet werden.', {
      error: error && error.message ? error.message : String(error)
    });
    syncCanonicalStateShape();
  }
}

function applyOfflineFairnessFloor() {
  if (!isPlantDead()) {
    state.status.health = Math.max(12, Number(state.status.health) || 0);
  }
  state.status.water = Math.max(5, Number(state.status.water) || 0);
  state.status.nutrition = Math.max(5, Number(state.status.nutrition) || 0);
  if (Number(state.status.stress) >= 100) {
    state.status.stress = 98;
  }
  if (Number(state.status.risk) >= 100) {
    state.status.risk = 98;
  }

  if (!isPlantDead()) {
    state.plant.isDead = false;
    if (state.plant.phase === 'dead') {
      state.plant.phase = getStageTimeline()[clampInt(Number(state.plant.stageIndex) || 0, 0, Math.max(0, getStageTimeline().length - 1))]?.phase || 'seedling';
    }
    state.ui.deathOverlayOpen = false;
  }
  clampStatus();
}


function isNightHourLocal(hour) {
  return hour >= 22 || hour < 8;
}

function intervalOverlapsNightWindow(startMs, endMs) {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return false;
  }

  const start = new Date(startMs);
  const end = new Date(endMs);
  const dayStart = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();

  for (let cursor = dayStart - 24 * 60 * 60 * 1000; cursor <= endMs; cursor += 24 * 60 * 60 * 1000) {
    const nightStart = cursor + (22 * 60 * 60 * 1000);
    const nightEnd = cursor + (32 * 60 * 60 * 1000);
    if (startMs < nightEnd && endMs > nightStart) {
      return true;
    }
  }

  return false;
}

function shouldProtectOfflineNightDeath(previousTickMs, nowMs) {
  if (!Number.isFinite(previousTickMs) || !Number.isFinite(nowMs) || nowMs <= previousTickMs) {
    return false;
  }

  const nowHour = new Date(nowMs).getHours();
  if (isNightHourLocal(nowHour)) {
    return true;
  }

  return intervalOverlapsNightWindow(previousTickMs, nowMs);
}

function applyOfflineNightSurvivalClamp() {
  state.status.health = Math.max(8, Number(state.status.health) || 0);
  state.status.water = Math.max(6, Number(state.status.water) || 0);
  state.status.nutrition = Math.max(6, Number(state.status.nutrition) || 0);
  state.status.stress = Math.max(88, Number(state.status.stress) || 0);
  state.status.risk = Math.max(92, Number(state.status.risk) || 0);

  state.plant.isDead = false;
  state.plant.phase = getStageTimeline()[clampInt(Number(state.plant.stageIndex) || 0, 0, Math.max(0, getStageTimeline().length - 1))]?.phase || 'seedling';
  state.plant.stageKey = stageAssetKeyForIndex(state.plant.stageIndex);
  state.ui.deathOverlayOpen = false;
  state.ui.deathOverlayAcknowledged = false;

  const meta = getCanonicalMeta(state);
  meta.rescue.lastResult = 'Offline-Nacht: Pflanze knapp überlebt und ist kritisch.';
  addLog('system', 'Offline-Nachtschutz aktiv: Todeszustand verhindert', {
    health: round2(state.status.health),
    stress: round2(state.status.stress),
    risk: round2(state.status.risk)
  });
}

function evolveEnvironmentChemistry(minutes) {
  const controls = getEnvironmentControlsForSimulation();
  const isDay = Boolean(state.simulation && state.simulation.isDaytime);
  const statusWater = clamp(Number(state.status.water || 0), 0, 100);
  const statusNutrition = clamp(Number(state.status.nutrition || 0), 0, 100);

  const ambientTemp = isDay ? 24.0 : 21.0;
  controls.temperatureC = clamp(controls.temperatureC + ((ambientTemp - controls.temperatureC) * 0.015 * minutes), 16, 36);

  const humidityPull = ((statusWater - 50) * 0.04) - ((controls.airflowPercent - 50) * 0.03);
  controls.humidityPercent = clampInt(Math.round(controls.humidityPercent + (humidityPull * 0.12 * minutes)), 30, 90);

  controls.airflowPercent = clampInt(Math.round(controls.airflowPercent + ((55 - controls.airflowPercent) * 0.01 * minutes)), 0, 100);

  const ecDecayPerMin = 0.0028 + ((100 - statusNutrition) * 0.00002) + ((statusWater < 35 ? 0.0012 : 0));
  controls.ec = clamp(controls.ec - (ecDecayPerMin * minutes), 0.6, 2.8);

  const phDrift = ((6.0 - controls.ph) * 0.018) - ((controls.ec - 1.6) * 0.004);
  controls.ph = clamp(controls.ph + (phDrift * minutes), 5.0, 7.0);

  if (state.environmentControls && typeof state.environmentControls === 'object') {
    state.environmentControls.temperatureC = controls.temperatureC;
    state.environmentControls.humidityPercent = controls.humidityPercent;
    state.environmentControls.airflowPercent = controls.airflowPercent;
    state.environmentControls.ph = controls.ph;
    state.environmentControls.ec = controls.ec;
  }
}

function applyStatusDrift(elapsedMs) {
  const minutesRaw = elapsedMs / 60_000;
  const offlineCatchUp = elapsedMs > MAX_ELAPSED_PER_TICK_MS;
  const minutes = minutesRaw * (offlineCatchUp ? OFFLINE_STATUS_DECAY_MULTIPLIER : 1);
  if (minutes <= 0) {
    state.simulation.growthImpulse = 0;
    return;
  }

  evolveEnvironmentChemistry(minutes);
  const envModel = buildEnvironmentModelFromState(state.status, state.simulation, state.plant);
  const rootModel = buildRootZoneModelFromState(state.status, envModel, state.plant);

  const envStressBase = (envModel.stressFactor.temp * 0.36)
    + (envModel.stressFactor.humidity * 0.24)
    + (envModel.stressFactor.vpd * 0.28)
    + (envModel.stressFactor.airflow * 0.12);
  const rootStressBase = (rootModel.stressFactor.ph * 0.42)
    + (rootModel.stressFactor.ec * 0.34)
    + (rootModel.stressFactor.oxygen * 0.24);

  const profile = envModel.stageProfile || getEnvStageProfile(clampInt(Number(state.plant.stageIndex || 0) + 1, 1, 12));
  const tempOut = profile.temp ? Math.max(0, profile.temp[0] - envModel.temperatureC, envModel.temperatureC - profile.temp[1]) : 0;
  const humidityOut = profile.humidity ? Math.max(0, profile.humidity[0] - envModel.humidityPercent, envModel.humidityPercent - profile.humidity[1]) : 0;
  const vpdOut = profile.vpd ? Math.max(0, profile.vpd[0] - envModel.vpdKpa, envModel.vpdKpa - profile.vpd[1]) : 0;
  const phOut = profile.ph ? Math.max(0, profile.ph[0] - rootModel.ph, rootModel.ph - profile.ph[1]) : 0;
  const ecOut = profile.ec ? Math.max(0, profile.ec[0] - rootModel.ec, rootModel.ec - profile.ec[1]) : 0;

  const profileEnvPenalty = clamp((tempOut / 5.5) + (humidityOut / 24) + (vpdOut / 0.9), 0, 1.5);
  const profileRootPenalty = clamp((phOut / 0.8) + (ecOut / 1.2), 0, 1.5);

  const envStress = clamp(envStressBase + (profileEnvPenalty * 0.22), 0, 2);
  const rootStress = clamp(rootStressBase + (profileRootPenalty * 0.26), 0, 2);

  const stageIndexOneBased = clampInt(Number(state.plant.stageIndex || 0) + 1, 1, 12);
  const stagePressure = clamp((stageIndexOneBased - 1) / 11, 0, 1);
  const envInfluence = 0.78 + (stagePressure * 0.34);
  const rootInfluence = 0.76 + (stagePressure * 0.38);

  const uptakePenalty = clamp(((rootStress * 0.58) + (envStress * 0.34)) * rootInfluence, 0, 0.92);
  const transpiration = clamp(0.74 + ((envModel.vpdKpa - 0.95) * 0.60), 0.35, 1.95);

  const waterDrainPerMin = 0.10 + (transpiration * 0.054) + (envStress * 0.038 * envInfluence);
  const nutritionDrainPerMin = 0.078 + (0.048 * (1 - uptakePenalty)) + (0.024 * rootStress * rootInfluence);

  state.status.water -= waterDrainPerMin * minutes;
  state.status.nutrition -= nutritionDrainPerMin * minutes;

  const inRecoveryBand = (
    state.status.water >= 45 && state.status.water <= 72 &&
    state.status.nutrition >= 45 && state.status.nutrition <= 72 &&
    state.status.stress < 42 &&
    envStress < 0.35 &&
    rootStress < 0.35
  );

  const waterDeficiency = clamp((WATER_STRESS_THRESHOLD - state.status.water) / (WATER_STRESS_THRESHOLD - WATER_CRITICAL_THRESHOLD), 0, 1);
  const waterCritical = clamp((WATER_CRITICAL_THRESHOLD - state.status.water) / WATER_CRITICAL_THRESHOLD, 0, 1);
  const nutritionDeficiency = clamp((NUTRITION_STRESS_THRESHOLD - state.status.nutrition) / (NUTRITION_STRESS_THRESHOLD - NUTRITION_CRITICAL_THRESHOLD), 0, 1);
  const nutritionCritical = clamp((NUTRITION_CRITICAL_THRESHOLD - state.status.nutrition) / NUTRITION_CRITICAL_THRESHOLD, 0, 1);

  let stressDelta = (-0.02 * minutes)
    + (waterDeficiency * 0.10 * minutes)
    + (waterCritical * 0.30 * minutes)
    + (nutritionDeficiency * 0.08 * minutes)
    + (nutritionCritical * 0.10 * minutes)
    + (envStress * 0.14 * envInfluence * minutes)
    + (rootStress * 0.12 * rootInfluence * minutes);
  if (inRecoveryBand) {
    stressDelta -= 0.10 * minutes;
  }
  state.status.stress += stressDelta;

  const stressPressure = clamp((state.status.stress - 52) / 48, 0, 1);
  const deficiencyPressure = (waterDeficiency * 0.25) + (waterCritical * 1.0) + (nutritionDeficiency * 0.1);
  let riskDelta = (-0.004 * minutes)
    + (stressPressure * 0.08 * minutes)
    + (deficiencyPressure * 0.06 * minutes)
    + (envStress * 0.08 * envInfluence * minutes)
    + (rootStress * 0.10 * rootInfluence * minutes);
  if (inRecoveryBand) {
    riskDelta -= 0.05 * minutes;
  }
  if (state.status.water > 97 || state.status.water < 12) {
    riskDelta += 0.08 * minutes;
  }
  state.status.risk += riskDelta;

  const stressHealthPressure = clamp((state.status.stress - 55) / 45, 0, 1);
  const riskHealthPressure = clamp((state.status.risk - 60) / 40, 0, 1);
  let healthDelta = (-0.008 * minutes)
    - (stressHealthPressure * 0.08 * minutes)
    - (riskHealthPressure * 0.07 * minutes)
    - (waterCritical * 0.08 * minutes)
    - (envStress * 0.045 * envInfluence * minutes)
    - (rootStress * 0.05 * rootInfluence * minutes);
  if (inRecoveryBand && state.status.risk <= 45) {
    healthDelta += 0.20 * minutes;
  }
  if (state.status.water < 12) {
    healthDelta -= 0.06 * minutes;
  }
  state.status.health += healthDelta;

  // Record telemetry for charts
  if (!state.history.telemetry) state.history.telemetry = [];
  const lastTele = state.history.telemetry[state.history.telemetry.length - 1];
  const currentSimDay = Number(state.simulation.simDay) || 0;
  if (!lastTele || lastTele.day !== currentSimDay) {
    state.history.telemetry.push({
      day: currentSimDay,
      health: Math.round(state.status.health),
      water: Math.round(state.status.water),
      nutrition: Math.round(state.status.nutrition),
      stress: Math.round(state.status.stress)
    });
    if (state.history.telemetry.length > 50) state.history.telemetry.shift();
  }

  const ecoEfficiency = clamp(1 - (envStress * 0.5) - (rootStress * 0.5), 0, 1);
  const impulseRaw = ((state.status.health - state.status.stress - (state.status.risk * 0.45)) / 35) * (0.7 + (ecoEfficiency * 0.6));
  state.simulation.growthImpulse = clamp(impulseRaw, -3, 3);

  clampStatus();
}

function advanceGrowthTick(elapsedSimMs, options = {}) {
  const suppressDeath = Boolean(options && options.suppressDeath);
  const prevGrowth = Number(state.status.growth) || 0;

  if (isPlantDead()) {
    if (suppressDeath) {
      state.plant.isDead = false;
      state.ui.deathOverlayOpen = false;
      return;
    }
    state.plant.isDead = true;
    state.plant.stageProgress = 1;
    return;
  }

  if (state.status.health <= 0 || state.status.risk >= 100 || state.plant.isDead === true) {
    if (suppressDeath) {
      state.plant.isDead = false;
      state.ui.deathOverlayOpen = false;
      return;
    }
    enterDeadPhase();
    return;
  }

  updateLifecycleAverages(elapsedSimMs);
  updateQualityTier();

  const simDay = simDayFloat();
  const stage = getCurrentStage(simDay);

  state.plant.stageIndex = stage.stageIndex;
  state.plant.phase = stage.current.phase;
  state.plant.stageKey = stageAssetKeyForIndex(stage.stageIndex);
  state.plant.lastValidStageKey = state.plant.stageKey;
  state.plant.stageProgress = stage.progressInPhase;
  state.status.growth = round2(computeGrowthPercent(state.simulation.nowMs));

  if (state.debug.enabled && state.debug.showInternalTicks && state.simulation.tickCount % CONFIG.logTickEveryNTicks === 0) {
    console.debug('[growth]', {
      tick: state.simulation.tickCount,
      simTimeMs: state.simulation.simTimeMs,
      oldGrowth: round2(prevGrowth),
      newGrowth: state.status.growth,
      water: round2(state.status.water),
      nutrients: round2(state.status.nutrition),
      stress: round2(state.status.stress),
      risk: round2(state.status.risk),
      eventActive: state.events.machineState === 'activeEvent'
    });
  }
}

function canAdvanceToStage(targetStageIndex, simDay) {
  const targetDef = STAGE_DEFS[targetStageIndex];
  if (!targetDef) {
    return false;
  }

  const deterministicDelayDays = deterministicStageDelayDays(targetStageIndex);
  const dayReady = simDay >= (targetDef.simDayStart + deterministicDelayDays);
  const healthReady = state.status.health >= targetDef.minHealth;
  const stressReady = state.status.stress <= targetDef.maxStress;

  if (targetStageIndex === STAGE_DEFS.length - 1) {
    if (state.plant.lifecycle.qualityTier === 'perfect') {
      state.plant.lifecycle.qualityLocked = true;
      return dayReady && healthReady && stressReady;
    }
    return dayReady;
  }

  return dayReady && healthReady && stressReady;
}

function setGrowthStageIndex(stageIndex) {
  const safeIndex = clampInt(stageIndex, 0, STAGE_DEFS.length - 1);
  const stageDef = STAGE_DEFS[safeIndex];

  state.plant.stageIndex = safeIndex;
  state.plant.phase = stageDef.phase;
  state.plant.stageKey = stageAssetKeyForIndex(safeIndex);
  state.plant.lastValidStageKey = state.plant.stageKey;

  addLog('stage', `Stufe erreicht: ${safeIndex + 1} ${stageDef.label}`, {
    simDay: round2(simDayFloat()),
    health: round2(state.status.health),
    stress: round2(state.status.stress),
    quality: state.plant.lifecycle.qualityTier
  });
}

function enterDeadPhase() {
  const wasDead = state.plant.phase === 'dead' || state.plant.isDead === true;
  state.plant.phase = 'dead';
  state.plant.isDead = true;
  state.plant.stageProgress = 1;
  state.plant.stageKey = state.plant.lastValidStageKey || 'stage_01';
  state.ui.deathOverlayOpen = true;
  state.ui.deathOverlayAcknowledged = false;
  if (!wasDead) {
    addLog('system', 'Todesphase erreicht', { stageName: state.plant.stageKey });
  }
}

function isPlantDead() {
  return state.plant.phase === 'dead' || state.plant.isDead === true || Number(state.status.health) <= 0;
}

function syncDeathState() {
  if (isDeathSuppressedForFairness(Date.now())) {
    applyFairnessSurvivalGuard(Date.now());
    state.plant.isDead = false;
    if (state.plant.phase === 'dead') {
      state.plant.phase = getStageTimeline()[clampInt(Number(state.plant.stageIndex) || 0, 0, Math.max(0, getStageTimeline().length - 1))]?.phase || 'seedling';
    }
    return false;
  }

  if (!isPlantDead()) {
    state.plant.isDead = false;
    return false;
  }

  if (state.plant.phase !== 'dead' || state.plant.isDead !== true) {
    enterDeadPhase();
  }

  const inAnalysis = state.ui.openSheet === 'dashboard';
  if (!inAnalysis) {
    state.ui.deathOverlayOpen = true;
    state.ui.deathOverlayAcknowledged = false;
  }
  return true;
}

function getElapsedRealMsSinceRunStart(nowMs) {
  const startMs = Number(state.simulation.startRealTimeMs);
  const safeStartMs = Number.isFinite(startMs) ? startMs : nowMs;
  return clamp(nowMs - safeStartMs, 0, REAL_RUN_DURATION_MS);
}

function getTotalRunProgress(nowMs) {
  return clamp(getElapsedRealMsSinceRunStart(nowMs) / REAL_RUN_DURATION_MS, 0, 1);
}

function getPlantTimeFromElapsed(nowMs) {
  const totalRunProgress = getTotalRunProgress(nowMs);
  const elapsedPlantMs = totalRunProgress * TOTAL_LIFECYCLE_SIM_MS;
  const simTimeMs = Number(state.simulation.simEpochMs) + elapsedPlantMs;

  return {
    totalRunProgress,
    elapsedPlantMs,
    simTimeMs,
    simDay: clamp(elapsedPlantMs / SIM_DAY_MS, 0, TOTAL_LIFECYCLE_SIM_DAYS)
  };
}

function getStageTimeline() {
  const source = Array.isArray(STAGE_DEFS) && STAGE_DEFS.length >= 2 ? STAGE_DEFS : DEFAULT_STAGE_TIMELINE;
  const cleaned = [];

  for (let i = 0; i < source.length; i += 1) {
    const item = source[i] || {};
    const rawStart = Number(item.simDayStart);
    const simDayStart = Number.isFinite(rawStart) ? rawStart : NaN;
    if (!Number.isFinite(simDayStart)) {
      continue;
    }
    cleaned.push({
      index: cleaned.length,
      id: typeof item.id === 'string' && item.id ? item.id : `stage_${i + 1}`,
      label: typeof item.label === 'string' && item.label ? item.label : `Phase ${i + 1}`,
      phase: typeof item.phase === 'string' && item.phase ? item.phase : 'vegetative',
      simDayStart: clamp(simDayStart, 0, TOTAL_LIFECYCLE_SIM_DAYS)
    });
  }

  cleaned.sort((a, b) => a.simDayStart - b.simDayStart);
  const strictlyIncreasing = cleaned.length >= 2
    && cleaned[0].simDayStart === 0
    && cleaned.every((stage, idx) => idx === 0 || stage.simDayStart > cleaned[idx - 1].simDayStart);

  return strictlyIncreasing ? cleaned : DEFAULT_STAGE_TIMELINE;
}

function getCurrentStage(simDay) {
  const timeline = getStageTimeline();
  const safeDay = clamp(Number(simDay) || 0, 0, TOTAL_LIFECYCLE_SIM_DAYS);

  let currentIndex = timeline.length - 1;
  for (let i = 0; i < timeline.length; i += 1) {
    const current = timeline[i];
    const next = timeline[i + 1];
    const endDay = next ? next.simDayStart : TOTAL_LIFECYCLE_SIM_DAYS;
    if (safeDay >= current.simDayStart && safeDay < endDay) {
      currentIndex = i;
      break;
    }
  }

  const current = timeline[currentIndex] || timeline[0];
  const next = timeline[currentIndex + 1] || null;
  const startDay = current ? current.simDayStart : 0;
  const endDay = next ? next.simDayStart : TOTAL_LIFECYCLE_SIM_DAYS;
  const span = Math.max(0.25, endDay - startDay);
  const progressInPhase = clamp((safeDay - startDay) / span, 0, 1);

  return {
    timeline,
    stageIndex: currentIndex,
    current,
    next,
    startDay,
    endDay,
    progressInPhase
  };
}

function computeGrowthPercent(nowMs = Date.now()) {
  if (state.plant.phase === 'dead') {
    return 0;
  }
  return round2(getTotalRunProgress(nowMs) * 100);
}

function computeStageProgress(simDay, stageIndex) {
  const snapshot = getCurrentStage(simDay);
  if (clampInt(stageIndex, 0, snapshot.timeline.length - 1) !== snapshot.stageIndex) {
    return snapshot.progressInPhase;
  }
  return snapshot.progressInPhase;
}

function getDayNightIcon() {
  return state.simulation.isDaytime ? '☀️' : '🌙';
}

function formatPlantAgeLabel(stage, simDay) {
  const safeSimDay = clamp(Number(simDay) || 0, 0, TOTAL_LIFECYCLE_SIM_DAYS);
  const plantDay = Math.max(1, Math.floor(safeSimDay) + 1);
  const timeline = stage && Array.isArray(stage.timeline) ? stage.timeline : getStageTimeline();
  const floweringStart = timeline.find((item) => item.phase === 'flowering');

  if (!floweringStart || safeSimDay < floweringStart.simDayStart) {
    return `Tag ${plantDay}`;
  }

  const bloomDay = Math.max(1, Math.floor(safeSimDay - floweringStart.simDayStart) + 1);
  return `Blütetag ${bloomDay}`;
}

function formatPhaseProgressLabel(progressPercent, nextLabel) {
  const targetLabel = nextLabel || 'Ernte';
  return `${progressPercent}% → ${targetLabel}`;
}

function getPhaseCardViewModel() {
  const isDead = state.plant.phase === 'dead' || state.plant.isDead === true;
  const simDay = simDayFloat();
  const stage = getCurrentStage(simDay);
  const fallbackPhaseLabel = PHASE_LABEL_DE[state.plant.phase] || PHASE_LABEL_DE.seedling;
  const title = stage.current && stage.current.label ? stage.current.label : fallbackPhaseLabel;
  const progressPercent = clamp(Math.round(stage.progressInPhase * 100), 0, 100);
  const ageLabel = formatPlantAgeLabel(stage, simDay);
  const cycleIcon = getDayNightIcon();
  const progressLabel = formatPhaseProgressLabel(progressPercent, stage.next ? stage.next.label : 'Ernte');

  if (isDead) {
    return {
      title,
      ageLabel,
      subtitle: 'Pflanze eingegangen',
      progressPercent: 100,
      nextLabel: null,
      cycleIcon
    };
  }

  if (!stage.next) {
    return {
      title,
      ageLabel,
      subtitle: progressLabel,
      progressPercent,
      nextLabel: 'Ernte',
      cycleIcon
    };
  }

  return {
    title,
    ageLabel,
    subtitle: progressLabel,
    progressPercent,
    nextLabel: stage.next.label,
    cycleIcon
  };
}

function updateLifecycleAverages(elapsedSimMs) {
  const observed = Math.max(0, Number(elapsedSimMs) || 0);
  if (observed <= 0) {
    return;
  }

  const totalObserved = state.plant.observedSimMs + observed;
  state.plant.averageHealth = ((state.plant.averageHealth * state.plant.observedSimMs) + (state.status.health * observed)) / totalObserved;
  state.plant.averageStress = ((state.plant.averageStress * state.plant.observedSimMs) + (state.status.stress * observed)) / totalObserved;
  state.plant.observedSimMs = totalObserved;
}

function updateQualityTier() {
  const avgHealth = state.plant.averageHealth;
  const avgStress = state.plant.averageStress;

  if (avgHealth >= 80 && avgStress <= 30 && state.status.stress <= 30) {
    state.plant.lifecycle.qualityTier = 'perfect';
    return;
  }

  if (avgHealth < 50 || avgStress >= 50 || state.status.stress >= 65) {
    state.plant.lifecycle.qualityTier = 'degraded';
    return;
  }

  state.plant.lifecycle.qualityTier = 'normal';
}

function simDayFloat() {
  const elapsed = Math.max(0, state.simulation.simTimeMs - state.simulation.simEpochMs);
  return clamp(elapsed / SIM_DAY_MS, 0, TOTAL_LIFECYCLE_SIM_DAYS);
}

function deterministicStageDelayDays(stageIndex) {
  if (stageIndex <= 0) {
    return 0;
  }
  const u = deterministicUnitFloat(`stage_delay:${stageIndex}`);
  return round2((u - 0.5) * 0.6);
}

function stageAssetKeyForIndex(stageIndex) {
  return `stage_${String(stageIndex + 1).padStart(2, '0')}`;
}

function normalizeStageKey(rawStageKey) {
  const raw = String(rawStageKey || '').trim();
  if (raw && Object.prototype.hasOwnProperty.call(STAGE_ASSET_FALLBACK, raw)) {
    return raw;
  }

  const match = raw.match(/^stage_(\d{1,2})$/);
  if (match) {
    const index = clampInt(Number(match[1]), 1, STAGE_DEFS.length);
    return `stage_${String(index).padStart(2, '0')}`;
  }

  return 'stage_01';
}

function onBoostAction() {
  // Absichtlich limitierter Boost: Event-Timer um 30 Min vorziehen,
  // Pflanzenwerte nur leicht anstoßen (kein vollständiger 30-Minuten-Simulationssprung).
  const BOOST_PLANT_EFFECT_MS = 3 * 60 * 1000;
  const BOOST_GROWTH_PERCENT_DELTA = 0.02;

  if (isPlantDead()) {
    addLog('action', 'Boost blockiert: Pflanze ist eingegangen', null);
    renderAll();
    return;
  }

  const nowMs = Date.now();
  resetBoostDaily(nowMs);

  if (state.boost.boostUsedToday >= state.boost.boostMaxPerDay) {
    addLog('action', 'Boost wegen Tageslimit blockiert', { cap: state.boost.boostMaxPerDay });
    renderAll();
    return;
  }

  state.boost.boostUsedToday += 1;
  applyStatusDrift(BOOST_PLANT_EFFECT_MS);
  applyGrowthPercentDelta(BOOST_GROWTH_PERCENT_DELTA);

  state.events.scheduler.nextEventRealTimeMs = Math.max(nowMs, state.events.scheduler.nextEventRealTimeMs - BOOST_ADVANCE_MS);
  state.events.cooldownUntilMs = Math.max(nowMs, state.events.cooldownUntilMs - BOOST_ADVANCE_MS);

  runEventStateMachine(nowMs);
  updateVisibleOverlays();

  addLog('action', 'Ereignis-Boost angewendet (Event-Timer -30 Min, Pflanze leicht angestoßen)', {
    usedToday: state.boost.boostUsedToday,
    nextEventAtMs: state.events.scheduler.nextEventRealTimeMs
  });

  renderAll();
  schedulePersistState(true);
}

function onClearLog() {
  state.history.systemLog = [];
  state.history = { actions: [], events: [], system: [] };
  addLog('system', 'Protokoll geleert', null);
  renderAnalysisPanel(true);
  schedulePersistState(true);
}

function resetBoostDaily(nowMs) {
  const currentStamp = dayStamp(nowMs);
  if (state.boost.dayStamp !== currentStamp) {
    state.boost.dayStamp = currentStamp;
    state.boost.boostUsedToday = 0;
    addLog('system', 'Täglicher Boost-Zähler zurückgesetzt', { dayStamp: currentStamp });
  }
}

function dayStamp(timestampMs) {
  const d = new Date(timestampMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function alignToSimStartHour(realNowMs, startHour) {
  const d = new Date(realNowMs);
  d.setHours(clampInt(startHour, 0, 23), 0, 0, 0);
  return d.getTime();
}

function simHour(simTimeMs) {
  return new Date(simTimeMs).getHours();
}

function isDaytimeAtSimTime(simTimeMs) {
  const hour = simHour(simTimeMs);
  return hour >= SIM_DAY_START_HOUR && hour < SIM_NIGHT_START_HOUR;
}

function nextDaytimeRealMs(realNowMs, simTimeMs) {
  const simDate = new Date(simTimeMs);
  const shifted = new Date(simDate.getTime());

  if (simHour(simTimeMs) >= SIM_NIGHT_START_HOUR) {
    shifted.setDate(shifted.getDate() + 1);
  }

  shifted.setHours(SIM_DAY_START_HOUR, 0, 0, 0);
  const simDeltaMs = Math.max(0, shifted.getTime() - simTimeMs);
  const realDeltaMs = Math.ceil(simDeltaMs * (REAL_RUN_DURATION_MS / TOTAL_LIFECYCLE_SIM_MS));
  return realNowMs + realDeltaMs;
}

function formatSimClock(simTimeMs) {
  return new Date(simTimeMs).toLocaleTimeString('de-DE');
}

function deterministicUnitFloat(contextKey) {
  const hash = hashString(`${state.simulation.globalSeed}|${state.simulation.plantId}|${contextKey}`);
  return (hash % 1_000_000) / 1_000_000;
}

function hashString(input) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function clampStatus() {
  state.status.health = clamp(state.status.health, 0, 100);
  state.status.stress = clamp(state.status.stress, 0, 100);
  state.status.water = clamp(state.status.water, 0, 100);
  state.status.nutrition = clamp(state.status.nutrition, 0, 100);
  state.status.growth = clamp(state.status.growth, 0, 100);
  state.status.risk = clamp(state.status.risk, 0, 100);
}

function updateVisibleOverlays() {
  const overlays = [];

  if (state.status.stress >= 80) {
    overlays.push('overlay_burn');
  }
  if (state.status.nutrition <= 28) {
    overlays.push('overlay_def_n');
  } else if (state.status.nutrition <= 45) {
    overlays.push('overlay_def_mg');
  }
  if (state.status.risk >= 78) {
    overlays.push('overlay_mold_warning');
  }
  if (state.status.risk >= 62) {
    overlays.push('overlay_pest_mites');
  }
  if (state.status.risk >= 70 && state.status.stress >= 55) {
    overlays.push('overlay_pest_thrips');
  }

  state.ui.visibleOverlayIds = overlays;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function clampInt(value, min, max) {
  return Math.min(max, Math.max(min, Math.trunc(Number(value) || 0)));
}

function syncRuntimeClocks(nowMs) {
  state.simulation.nowMs = nowMs;
  if (!Number.isFinite(state.simulation.simTimeMs)) {
    state.simulation.simTimeMs = alignToSimStartHour(nowMs, SIM_START_HOUR);
  }
  state.simulation.isDaytime = isDaytimeAtSimTime(state.simulation.simTimeMs);
  if (!Number.isFinite(state.simulation.lastTickRealTimeMs)) {
    state.simulation.lastTickRealTimeMs = nowMs;
  }
}

async function loadEventCatalog() {
  const catalogs = [];

  try {
    const v1 = await fetch(`./data/events.json?v=${EVENTS_CATALOG_VERSION}`, { cache: 'no-store' });
    if (v1.ok) {
      const payload = await v1.json();
      const events = Array.isArray(payload) ? payload : payload.events;
      if (Array.isArray(events)) {
        catalogs.push(...events.map((eventDef) => normalizeEvent(eventDef, 'v1')).filter(Boolean));
      }
    }
  } catch (_error) {
    // handled by fallback below
  }

  try {
    const v2 = await fetch('./data/events.v2.json', { cache: 'default' });
    if (v2.ok) {
      const payload = await v2.json();
      const events = Array.isArray(payload) ? payload : payload.events;
      if (Array.isArray(events)) {
        catalogs.push(...events.map((eventDef) => normalizeEvent(eventDef, 'v2')).filter(Boolean));
      }
    }
  } catch (_error) {
    // optional catalog, keep working with v1/fallback
  }

  if (!catalogs.length) {
    catalogs.push(normalizeEvent({
      id: 'fallback_soil_check',
      category: 'water',
      title: 'Bodenfeuchte prüfen',
      description: 'Bei der manuellen Kontrolle wurde ungleichmäßige Feuchte festgestellt.',
      choices: [
        { id: 'fallback_care', label: 'Ausgewogene Pflege anwenden', effects: { water: 6, stress: -2, health: 2 } },
        { id: 'fallback_wait', label: 'Einen Zyklus warten', effects: { stress: 2, risk: 2 } },
        { id: 'fallback_mix', label: 'Obere Schicht vorsichtig auflockern', effects: { health: 1, risk: -1 } }
      ]
    }, 'v1'));

    addLog('system', 'events.json/events.v2.json konnten nicht geladen werden, Fallback-Katalog aktiv', null);
  }

  state.events.catalog = catalogs.filter(Boolean);
}

async function loadActionsCatalog() {
  try {
    let response = null;
    try {
      response = await fetch(`./data/actions.json?v=${ACTIONS_CATALOG_VERSION}`, { cache: 'no-store' });
    } catch (_error) {
      response = await fetch('./data/actions.json', { cache: 'default' });
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    const actions = Array.isArray(payload) ? payload : payload.actions;
    if (!Array.isArray(actions)) {
      throw new Error('Invalid actions payload');
    }

    const normalized = actions.map(normalizeAction).filter(Boolean);
    state.actions.catalog = normalized;
    state.actions.byId = Object.fromEntries(normalized.map((action) => [action.id, action]));
  } catch (error) {
    state.actions.catalog = [];
    state.actions.byId = {};
    addLog('system', 'actions.json konnte nicht geladen werden, Aktionssystem ohne Katalog', {
      error: error.message
    });
  }
}
