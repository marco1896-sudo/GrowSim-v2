#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const progression = require('../src/progression/progression.js');

const actionsPayload = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'actions.json'), 'utf8'));
const actions = Array.isArray(actionsPayload) ? actionsPayload : (actionsPayload.actions || []);

const TOTAL_LIFECYCLE_SIM_DAYS = 88;
const REAL_RUN_MINUTES = 7 * 24 * 60;
const SIM_MINUTES_PER_REAL_MIN = (TOTAL_LIFECYCLE_SIM_DAYS * 24 * 60) / REAL_RUN_MINUTES;
const WATER_STRESS_THRESHOLD = 30;
const WATER_CRITICAL_THRESHOLD = 12;
const NUTRITION_STRESS_THRESHOLD = 30;
const NUTRITION_CRITICAL_THRESHOLD = 14;
const STAGE_DAY_STARTS = [0, 3, 8, 16, 24, 31, 39, 47, 57, 66, 75, 84];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clampInt(value, min, max) {
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function hashString(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function deterministicUnit(seed, key) {
  return (hashString(`${seed}|${key}`) % 1_000_000) / 1_000_000;
}

function stageIndexForDay(simDay) {
  let index = 0;
  for (let i = 0; i < STAGE_DAY_STARTS.length; i += 1) {
    if (simDay >= STAGE_DAY_STARTS[i]) {
      index = i;
    }
  }
  return index;
}

function buildSetup(build) {
  if (build === 'Hardy') {
    return { mode: 'indoor', light: 'medium', medium: 'soil', potSize: 'medium', genetics: 'indica' };
  }
  if (build === 'Fast') {
    return { mode: 'indoor', light: 'medium', medium: 'soil', potSize: 'medium', genetics: 'sativa' };
  }
  return { mode: 'indoor', light: 'high', medium: 'soil', potSize: 'medium', genetics: 'hybrid' };
}

function buildProfile(setup) {
  const profile = progression.getDefaultProfile();
  profile.totalXp = 1400;
  profile.level = progression.getLevelForXp(profile.totalXp);
  profile.unlocks.setupModes = [setup.mode];
  profile.unlocks.media = [setup.medium];
  profile.unlocks.lights = [setup.light];
  profile.unlocks.genetics = ['hybrid', setup.genetics];
  return profile;
}

function prereqOk(state, action) {
  const min = action.prerequisites?.min || {};
  const max = action.prerequisites?.max || {};
  for (const [key, value] of Object.entries(min)) {
    if (key in state.status && state.status[key] < Number(value)) {
      return false;
    }
  }
  for (const [key, value] of Object.entries(max)) {
    if (key in state.status && state.status[key] > Number(value)) {
      return false;
    }
  }
  if (Number.isFinite(Number(action.trigger?.minStageIndex)) && state.plant.stageIndex < Number(action.trigger.minStageIndex)) {
    return false;
  }
  return true;
}

function chooseCarefulAction(state, actionsByCategory, seed) {
  const tryPick = (category, intensity) => {
    const ordered = (actionsByCategory[category] || [])
      .filter((action) => !intensity || action.intensity === intensity)
      .slice()
      .sort((left, right) => left.id.localeCompare(right.id));
    for (const action of ordered) {
      if ((state.actions.cooldowns[action.id] || 0) <= state.simulation.realMinutes && prereqOk(state, action)) {
        return action;
      }
    }
    return null;
  };

  if (state.status.stress > 20 || state.status.risk > 24) {
    return tryPick('environment', 'low') || tryPick('environment', 'medium');
  }
  if (state.status.water < 62) {
    return tryPick('watering', 'low') || tryPick('watering', 'medium');
  }
  if (state.status.nutrition < 60) {
    return tryPick('fertilizing', 'low') || tryPick('fertilizing', 'medium');
  }
  if (state.plant.stageIndex >= 5
    && state.status.health > 70
    && state.status.stress < 26
    && deterministicUnit(seed, `training:${state.simulation.realMinutes}`) < 0.15) {
    return tryPick('training', 'low');
  }
  return null;
}

function applyImmediateEffects(state, effects) {
  for (const [key, value] of Object.entries(effects || {})) {
    if (key in state.status) {
      state.status[key] = clamp(state.status[key] + Number(value), 0, 100);
    }
  }
}

function applyActiveEffects(state, elapsedSimMinutes) {
  const next = [];
  for (const effect of state.actions.activeEffects) {
    const stepMinutes = Math.min(elapsedSimMinutes, effect.remainingMinutes);
    const simHours = stepMinutes / 60;
    for (const [key, perHour] of Object.entries(effect.rates || {})) {
      const metric = key.replace(/PerHour$/, '');
      if (metric in state.status) {
        state.status[metric] = clamp(state.status[metric] + (Number(perHour) * simHours), 0, 100);
      }
    }
    effect.remainingMinutes -= stepMinutes;
    if (effect.remainingMinutes > 0) {
      next.push(effect);
    }
  }
  state.actions.activeEffects = next;
}

function applyPassiveDrift(state) {
  const minutes = 1;
  const stageIndexOneBased = clampInt(state.plant.stageIndex + 1, 1, 12);
  const stagePressure = clamp((stageIndexOneBased - 1) / 11, 0, 1);
  const earlyPhaseRelief = 0.8 + (stagePressure * 0.2);
  const envInfluence = 0.78 + (stagePressure * 0.34);
  const rootInfluence = 0.76 + (stagePressure * 0.38);
  const envStress = 0.18;
  const rootStress = 0.16;

  const genetics = String(state.setup.genetics || 'hybrid');
  const medium = String(state.setup.medium || 'soil');
  const light = String(state.setup.light || 'medium');

  const geneticsStressModifier = genetics === 'indica' ? 0.76 : (genetics === 'sativa' ? 1.18 : 1);
  const geneticsHealthModifier = genetics === 'indica' ? 1.14 : (genetics === 'sativa' ? 0.93 : 1);
  const geneticsGrowthModifier = genetics === 'indica' ? 0.84 : (genetics === 'sativa' ? 1.16 : 1);
  const geneticsWaterModifier = genetics === 'indica' ? 0.94 : (genetics === 'sativa' ? 1.12 : 1);
  const geneticsNutritionModifier = genetics === 'indica' ? 0.96 : (genetics === 'sativa' ? 1.1 : 1);
  const geneticsPressureModifier = genetics === 'indica' ? 0.86 : (genetics === 'sativa' ? 1.1 : 1);
  const geneticsTempoModifier = genetics === 'indica' ? -0.07 : (genetics === 'sativa' ? 0.2 : 0);
  const mediumWaterModifier = medium === 'coco' ? 1.22 : 1;
  const mediumNutritionModifier = medium === 'coco' ? 1.14 : 1;
  const mediumGrowthModifier = medium === 'coco' ? 1.08 : 1;
  const mediumPressureModifier = medium === 'coco' ? 1.08 : 1;
  const mediumTempoModifier = medium === 'coco' ? 0.04 : 0;
  const lightWaterModifier = light === 'high' ? 1.22 : 1;
  const lightNutritionModifier = light === 'high' ? 1.18 : 1;
  const lightGrowthModifier = light === 'high' ? 1.16 : 1;
  const lightPressureModifier = light === 'high' ? 1.12 : 1;
  const lightTempoModifier = light === 'high' ? 0.15 : 0;

  const uptakePenalty = clamp(((rootStress * 0.58) + (envStress * 0.34)) * rootInfluence, 0, 0.92);
  const transpiration = clamp(0.74 + ((1.05 - 0.95) * 0.60), 0.35, 1.95);

  const waterDrainPerMin = 0.10 + (transpiration * 0.054) + (envStress * 0.038 * envInfluence);
  const nutritionDrainPerMin = 0.078 + (0.048 * (1 - uptakePenalty)) + (0.024 * rootStress * rootInfluence);

  state.status.water -= (waterDrainPerMin * mediumWaterModifier * geneticsWaterModifier * lightWaterModifier) * minutes * earlyPhaseRelief;
  state.status.nutrition -= (nutritionDrainPerMin * mediumNutritionModifier * geneticsNutritionModifier * lightNutritionModifier) * minutes * earlyPhaseRelief;

  const inRecoveryBand = (
    state.status.water >= 45 && state.status.water <= 72 &&
    state.status.nutrition >= 45 && state.status.nutrition <= 72 &&
    state.status.stress < 42
  );

  const waterDeficiency = clamp((WATER_STRESS_THRESHOLD - state.status.water) / (WATER_STRESS_THRESHOLD - WATER_CRITICAL_THRESHOLD), 0, 1);
  const waterCritical = clamp((WATER_CRITICAL_THRESHOLD - state.status.water) / WATER_CRITICAL_THRESHOLD, 0, 1);
  const nutritionDeficiency = clamp((NUTRITION_STRESS_THRESHOLD - state.status.nutrition) / (NUTRITION_STRESS_THRESHOLD - NUTRITION_CRITICAL_THRESHOLD), 0, 1);
  const nutritionCritical = clamp((NUTRITION_CRITICAL_THRESHOLD - state.status.nutrition) / NUTRITION_CRITICAL_THRESHOLD, 0, 1);

  let stressDelta = (-0.02 * minutes)
    + (waterDeficiency * 0.10 * minutes * earlyPhaseRelief)
    + (waterCritical * 0.30 * minutes * earlyPhaseRelief)
    + (nutritionDeficiency * 0.08 * minutes * earlyPhaseRelief)
    + (nutritionCritical * 0.10 * minutes * earlyPhaseRelief)
    + (envStress * 0.14 * envInfluence * minutes * earlyPhaseRelief)
    + (rootStress * 0.12 * rootInfluence * minutes * earlyPhaseRelief);
  if (inRecoveryBand) {
    stressDelta -= 0.10 * minutes;
  }
  state.status.stress += stressDelta * geneticsStressModifier * geneticsPressureModifier * mediumPressureModifier * lightPressureModifier;

  const stressPressure = clamp((state.status.stress - 52) / 48, 0, 1);
  const deficiencyPressure = ((waterDeficiency * 0.25) + (waterCritical * 1.0) + (nutritionDeficiency * 0.1)) * earlyPhaseRelief;
  let riskDelta = (-0.004 * minutes)
    + (stressPressure * 0.08 * minutes * earlyPhaseRelief)
    + (deficiencyPressure * 0.06 * minutes)
    + (envStress * 0.08 * envInfluence * minutes * earlyPhaseRelief)
    + (rootStress * 0.10 * rootInfluence * minutes * earlyPhaseRelief);
  if (inRecoveryBand) {
    riskDelta -= 0.05 * minutes;
  }
  if (state.status.water > 97 || state.status.water < 12) {
    riskDelta += 0.08 * minutes;
  }
  state.status.risk += riskDelta * geneticsStressModifier * geneticsPressureModifier * lightPressureModifier;

  const stressHealthPressure = clamp((state.status.stress - 55) / 45, 0, 1);
  const riskHealthPressure = clamp((state.status.risk - 60) / 40, 0, 1);
  let healthDelta = (-0.008 * minutes)
    - (stressHealthPressure * 0.08 * minutes * earlyPhaseRelief)
    - (riskHealthPressure * 0.07 * minutes * earlyPhaseRelief)
    - (waterCritical * 0.08 * minutes * earlyPhaseRelief)
    - (envStress * 0.045 * envInfluence * minutes * earlyPhaseRelief)
    - (rootStress * 0.05 * rootInfluence * minutes * earlyPhaseRelief);
  if (inRecoveryBand && state.status.risk <= 45) {
    healthDelta += 0.20 * minutes;
  }
  if (state.status.water < 12) {
    healthDelta -= 0.06 * minutes;
  }
  state.status.health += healthDelta * geneticsHealthModifier;

  const ecoEfficiency = clamp(1 - (envStress * 0.5) - (rootStress * 0.5), 0, 1);
  const impulseRaw = ((state.status.health - state.status.stress - (state.status.risk * 0.45)) / 35)
    * (0.7 + (ecoEfficiency * 0.6))
    * geneticsGrowthModifier
    * mediumGrowthModifier
    * lightGrowthModifier;
  state.simulation.growthImpulse = clamp(impulseRaw, -3, 3);

  const tempoBuildModifier = geneticsTempoModifier + mediumTempoModifier + lightTempoModifier;
  const positiveTempoMomentum = clamp((state.simulation.growthImpulse - 0.2) / 2.2, 0, 1);
  const negativeTempoMomentum = clamp((-state.simulation.growthImpulse - 0.4) / 2.6, 0, 1);
  const tempoDeltaDays = ((tempoBuildModifier * positiveTempoMomentum) - (0.05 * negativeTempoMomentum)) * (minutes / (24 * 60));
  state.simulation.tempoOffsetDays = clamp((Number(state.simulation.tempoOffsetDays) || 0) + tempoDeltaDays, -4, 8);

  for (const key of ['water', 'nutrition', 'stress', 'risk', 'health']) {
    state.status[key] = clamp(state.status[key], 0, 100);
  }
}

function applyRescue(state) {
  state.status.health = 34;
  state.status.stress = clamp(state.status.stress - 22, 0, 100);
  state.status.risk = clamp(state.status.risk - 18, 0, 100);
  state.status.water = Math.max(40, state.status.water);
  state.status.nutrition = Math.max(32, state.status.nutrition);
  state.meta.rescue.used = true;
  state.run.status = 'active';
  state.plant.phase = 'vegetative';
  state.plant.isDead = false;
}

function runCarefulAudit(build, seed) {
  const setup = buildSetup(build);
  const profile = buildProfile(setup);
  const run = progression.getDefaultRunState();
  run.id = 1;
  run.status = 'active';
  run.setupSnapshot = { ...setup };

  const state = {
    profile,
    run,
    setup,
    simulation: { realMinutes: 0, simDay: 0, growthImpulse: 0, tempoOffsetDays: 0 },
    plant: {
      phase: 'seedling',
      isDead: false,
      stageIndex: 0,
      lifecycle: { qualityScore: 77.5 }
    },
    status: { health: 85, stress: 15, water: 70, nutrition: 65, growth: 0, risk: 20 },
    actions: { cooldowns: {}, activeEffects: [] },
    meta: { rescue: { used: false } }
  };

  const actionsByCategory = {};
  for (const action of actions) {
    (actionsByCategory[action.category] ||= []).push(action);
  }

  while (state.simulation.realMinutes < REAL_RUN_MINUTES) {
    state.simulation.realMinutes += 1;
    const baseSimDay = (state.simulation.realMinutes / REAL_RUN_MINUTES) * TOTAL_LIFECYCLE_SIM_DAYS;
    state.simulation.simDay = clamp(baseSimDay + (Number(state.simulation.tempoOffsetDays) || 0), 0, TOTAL_LIFECYCLE_SIM_DAYS);
    state.plant.stageIndex = stageIndexForDay(state.simulation.simDay);

    applyActiveEffects(state, SIM_MINUTES_PER_REAL_MIN);
    applyPassiveDrift(state);

    if (state.simulation.realMinutes % 10 === 0) {
      const action = chooseCarefulAction(state, actionsByCategory, seed);
      if (action) {
        applyImmediateEffects(state, action.effects?.immediate || {});
        const durationMinutes = Math.max(0, Number(action.effects?.durationSimMinutes) || 0);
        if (durationMinutes > 0 && action.effects?.overTime) {
          state.actions.activeEffects.push({
            remainingMinutes: durationMinutes,
            rates: action.effects.overTime
          });
        }
        state.actions.cooldowns[action.id] = state.simulation.realMinutes + Number(action.cooldownRealMinutes || 0);
      }
    }

    if (state.status.health <= 0 || state.status.risk >= 100) {
      if (!state.meta.rescue.used) {
        applyRescue(state);
      } else {
        break;
      }
    }

    if (state.simulation.simDay >= 20) {
      break;
    }
  }

  return round2(state.simulation.simDay);
}

(function testHardyCarefulReachesDayTwentyMoreReliably() {
  const hardyDays = ['seed-a', 'seed-b', 'seed-c'].map((seed) => runCarefulAudit('Hardy', seed));
  const fastDays = ['seed-a', 'seed-b', 'seed-c'].map((seed) => runCarefulAudit('Fast', seed));

  assert.ok(hardyDays.every((day) => day >= 20), `Hardy careful should now hit day 20 in the smoke audit, got ${hardyDays.join(', ')}`);
  assert.ok(hardyDays.reduce((sum, day) => sum + day, 0) > fastDays.reduce((sum, day) => sum + day, 0), 'Hardy should still stay meaningfully safer than Fast in the early loop');
})();

function runTempoSnapshot(build, seed, horizonRealMinutes = 18 * 60) {
  const setup = buildSetup(build);
  const profile = buildProfile(setup);
  const run = progression.getDefaultRunState();
  run.id = 2;
  run.status = 'active';
  run.setupSnapshot = { ...setup };

  const state = {
    profile,
    run,
    setup,
    simulation: { realMinutes: 0, simDay: 0, growthImpulse: 0, tempoOffsetDays: 0 },
    plant: {
      phase: 'seedling',
      isDead: false,
      stageIndex: 0,
      lifecycle: { qualityScore: 77.5 }
    },
    status: { health: 85, stress: 15, water: 70, nutrition: 65, growth: 0, risk: 20 },
    actions: { cooldowns: {}, activeEffects: [] },
    meta: { rescue: { used: false } }
  };

  const actionsByCategory = {};
  for (const action of actions) {
    (actionsByCategory[action.category] ||= []).push(action);
  }

  while (state.simulation.realMinutes < horizonRealMinutes) {
    state.simulation.realMinutes += 1;
    const baseSimDay = (state.simulation.realMinutes / REAL_RUN_MINUTES) * TOTAL_LIFECYCLE_SIM_DAYS;
    state.simulation.simDay = clamp(baseSimDay + (Number(state.simulation.tempoOffsetDays) || 0), 0, TOTAL_LIFECYCLE_SIM_DAYS);
    state.plant.stageIndex = stageIndexForDay(state.simulation.simDay);

    applyActiveEffects(state, SIM_MINUTES_PER_REAL_MIN);
    applyPassiveDrift(state);

    if (state.simulation.realMinutes % 10 === 0) {
      const action = chooseCarefulAction(state, actionsByCategory, seed);
      if (action) {
        applyImmediateEffects(state, action.effects?.immediate || {});
        const durationMinutes = Math.max(0, Number(action.effects?.durationSimMinutes) || 0);
        if (durationMinutes > 0 && action.effects?.overTime) {
          state.actions.activeEffects.push({
            remainingMinutes: durationMinutes,
            rates: action.effects.overTime
          });
        }
        state.actions.cooldowns[action.id] = state.simulation.realMinutes + Number(action.cooldownRealMinutes || 0);
      }
    }

    if (state.status.health <= 0 || state.status.risk >= 100) {
      break;
    }
  }

  return {
    simDay: round2(state.simulation.simDay),
    stageIndex: state.plant.stageIndex,
    tempoOffsetDays: round2(state.simulation.tempoOffsetDays),
    health: round2(state.status.health),
    stress: round2(state.status.stress),
    risk: round2(state.status.risk)
  };
}

(function testTempoBuildsGainRealProgressWhileHardyStaysSafer() {
  const hardy = runTempoSnapshot('Hardy', 'tempo-seed');
  const fast = runTempoSnapshot('Fast', 'tempo-seed');
  const highOutput = runTempoSnapshot('High Output', 'tempo-seed');

  assert.ok(fast.simDay > hardy.simDay, `Fast should progress further than Hardy at the same real-time horizon (${fast.simDay} vs ${hardy.simDay})`);
  assert.ok(highOutput.simDay > hardy.simDay, `High Output should progress further than Hardy at the same real-time horizon (${highOutput.simDay} vs ${hardy.simDay})`);
  assert.ok((fast.simDay - hardy.simDay) >= 0.18, `Fast should now keep a clearer tempo edge over Hardy (${fast.simDay} vs ${hardy.simDay})`);
  assert.ok((highOutput.simDay - hardy.simDay) >= 0.1, `High Output should now keep a measurable tempo edge over Hardy (${highOutput.simDay} vs ${hardy.simDay})`);
  assert.ok(fast.tempoOffsetDays > hardy.tempoOffsetDays, 'Fast should build more positive tempo offset than Hardy');
  assert.ok(highOutput.tempoOffsetDays > hardy.tempoOffsetDays, 'High Output should build more positive tempo offset than Hardy');
  assert.ok(hardy.stress < fast.stress, 'Hardy should remain less stress-prone than Fast under the same careful play');
  assert.ok(hardy.stress < highOutput.stress, 'Hardy should remain less stress-prone than High Output under the same careful play');
  assert.ok(hardy.health > fast.health, 'Hardy should keep more health buffer than Fast under the same careful play');
  assert.ok(hardy.health > highOutput.health, 'Hardy should keep more health buffer than High Output under the same careful play');
})();

console.log('balance-audit smoke tests passed');
