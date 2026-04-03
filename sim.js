'use strict';

const growSimRuntimeConfig = (typeof window !== 'undefined' && window.GrowSimSimulationConfig && typeof window.GrowSimSimulationConfig === 'object')
  ? window.GrowSimSimulationConfig
  : ((typeof globalThis !== 'undefined' && globalThis.GrowSimSimulationConfig && typeof globalThis.GrowSimSimulationConfig === 'object')
    ? globalThis.GrowSimSimulationConfig
    : {});

const SIM_RUNTIME_SPEED_OPTIONS = Array.isArray(growSimRuntimeConfig.SIM_SPEED_OPTIONS)
  ? growSimRuntimeConfig.SIM_SPEED_OPTIONS.slice()
  : (Array.isArray(globalThis.SIM_SPEED_OPTIONS) ? globalThis.SIM_SPEED_OPTIONS.slice() : [4, 8, 12, 16]);
const SIM_RUNTIME_DEFAULT_BASE_SPEED = Number.isFinite(Number(growSimRuntimeConfig.DEFAULT_BASE_SIM_SPEED))
  ? Number(growSimRuntimeConfig.DEFAULT_BASE_SIM_SPEED)
  : (Number.isFinite(Number(globalThis.DEFAULT_BASE_SIM_SPEED)) ? Number(globalThis.DEFAULT_BASE_SIM_SPEED) : 12);
const SIM_RUNTIME_BOOST_SPEED = Number.isFinite(Number(growSimRuntimeConfig.BOOST_SIM_SPEED))
  ? Number(growSimRuntimeConfig.BOOST_SIM_SPEED)
  : (Number.isFinite(Number(globalThis.BOOST_SIM_SPEED)) ? Number(globalThis.BOOST_SIM_SPEED) : 24);
const SIM_RUNTIME_START_HOUR = Number.isFinite(Number(growSimRuntimeConfig.SIM_START_HOUR))
  ? Number(growSimRuntimeConfig.SIM_START_HOUR)
  : (Number.isFinite(Number(globalThis.SIM_START_HOUR)) ? Number(globalThis.SIM_START_HOUR) : 8);
const SIM_RUNTIME_DAY_START_HOUR = Number.isFinite(Number(growSimRuntimeConfig.SIM_DAY_START_HOUR))
  ? Number(growSimRuntimeConfig.SIM_DAY_START_HOUR)
  : (Number.isFinite(Number(globalThis.SIM_DAY_START_HOUR)) ? Number(globalThis.SIM_DAY_START_HOUR) : 6);
const SIM_RUNTIME_NIGHT_START_HOUR = Number.isFinite(Number(growSimRuntimeConfig.SIM_NIGHT_START_HOUR))
  ? Number(growSimRuntimeConfig.SIM_NIGHT_START_HOUR)
  : (Number.isFinite(Number(globalThis.SIM_NIGHT_START_HOUR)) ? Number(globalThis.SIM_NIGHT_START_HOUR) : 22);
const SIM_RUNTIME_MAX_ELAPSED_PER_TICK_MS = Number.isFinite(Number(growSimRuntimeConfig.MAX_ELAPSED_PER_TICK_MS))
  ? Number(growSimRuntimeConfig.MAX_ELAPSED_PER_TICK_MS)
  : (Number.isFinite(Number(globalThis.MAX_ELAPSED_PER_TICK_MS)) ? Number(globalThis.MAX_ELAPSED_PER_TICK_MS) : 5000);
const SIM_RUNTIME_MAX_OFFLINE_SIM_MS = Number.isFinite(Number(growSimRuntimeConfig.MAX_OFFLINE_SIM_MS))
  ? Number(growSimRuntimeConfig.MAX_OFFLINE_SIM_MS)
  : (Number.isFinite(Number(globalThis.MAX_OFFLINE_SIM_MS)) ? Number(globalThis.MAX_OFFLINE_SIM_MS) : 8 * 60 * 60 * 1000);
const SIM_RUNTIME_LARGE_TIME_JUMP_LOG_MS = Number.isFinite(Number(growSimRuntimeConfig.LARGE_TIME_JUMP_LOG_MS))
  ? Number(growSimRuntimeConfig.LARGE_TIME_JUMP_LOG_MS)
  : (Number.isFinite(Number(globalThis.LARGE_TIME_JUMP_LOG_MS)) ? Number(globalThis.LARGE_TIME_JUMP_LOG_MS) : 60 * 1000);
const SIM_RUNTIME_FREEZE_ON_DEATH = typeof growSimRuntimeConfig.FREEZE_SIM_ON_DEATH === 'boolean'
  ? growSimRuntimeConfig.FREEZE_SIM_ON_DEATH
  : (typeof globalThis.FREEZE_SIM_ON_DEATH === 'boolean' ? globalThis.FREEZE_SIM_ON_DEATH : true);

const FAIRNESS_REACTION_GRACE_MS = 2 * 60 * 1000;
const OFFLINE_STATUS_DECAY_MULTIPLIER = 0.72;
const OFFLINE_CATCHUP_CHUNK_REAL_MS = 20 * 60 * 1000;
const PASSIVE_METABOLISM_DAY_FACTOR = 1;
const PASSIVE_METABOLISM_NIGHT_FACTOR = 0.42;
const PASSIVE_NUTRITION_DAY_FACTOR = 0.52;
const PASSIVE_NUTRITION_NIGHT_FACTOR = 0.2;
const OFFLINE_PASSIVE_WATER_LOSS_CAP_PER_BLOCK = 3.2;
const OFFLINE_PASSIVE_NUTRITION_LOSS_CAP_PER_BLOCK = 1.3;
const STRESS_EXPOSURE_RISE_PER_HOUR = 0.9;
const STRESS_EXPOSURE_FALL_PER_HOUR = 0.36;
const RISK_EXPOSURE_RISE_PER_HOUR = 0.28;
const RISK_EXPOSURE_FALL_PER_HOUR = 0.06;
const STRESS_RISE_CAP_PER_HOUR = 8;
const RISK_RISE_CAP_PER_HOUR = 3.2;
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

const CLIMATE_TENT_VOLUME_M3 = 1.28;
const CLIMATE_UPDATE_MAX_STEP_MINUTES = 5;
const CLIMATE_ROOM_DEFAULTS = Object.freeze({
  day: Object.freeze({ temperatureC: 23.0, humidityPercent: 52 }),
  night: Object.freeze({ temperatureC: 20.0, humidityPercent: 58 })
});
const CLIMATE_BASE_EXCHANGE_PER_MINUTE = 0.0035;
const CLIMATE_EXHAUST_EXCHANGE_FACTOR = 0.00023;
const CLIMATE_CIRCULATION_EXCHANGE_FACTOR = 0.00004;
const CLIMATE_MAX_EXCHANGE_PER_MINUTE = 0.08;

function getEnvStageProfile(stageIndexOneBased) {
  const stage = clampInt(Number(stageIndexOneBased) || 1, 1, 12);
  return ENV_STAGE_PROFILES.find((profile) => stage >= profile.minStage && stage <= profile.maxStage) || ENV_STAGE_PROFILES[1];
}

function saturationVaporPressureKpa(tempC) {
  const safeTemp = clamp(Number(tempC) || 0, -30, 60);
  return 0.61078 * Math.exp((17.2694 * safeTemp) / (safeTemp + 237.3));
}

function absoluteHumidityFromRelativeHumidity(tempC, humidityPercent) {
  const safeRh = clamp(Number(humidityPercent) || 0, 0, 100);
  const saturation = saturationVaporPressureKpa(tempC);
  const actualVaporPressureHpa = (saturation * (safeRh / 100)) * 10;
  return clamp((216.7 * actualVaporPressureHpa) / (Number(tempC) + 273.15), 0, 80);
}

function relativeHumidityFromAbsoluteHumidity(tempC, absoluteHumidityGm3) {
  const saturationAbs = absoluteHumidityFromRelativeHumidity(tempC, 100);
  if (!Number.isFinite(saturationAbs) || saturationAbs <= 0) {
    return 0;
  }
  return clamp((Number(absoluteHumidityGm3) / saturationAbs) * 100, 0, 100);
}

function computeVpdKpa(tempC, humidityPercent) {
  const saturation = saturationVaporPressureKpa(tempC);
  return clamp(saturation * (1 - (clamp(Number(humidityPercent) || 0, 0, 100) / 100)), 0, 3.5);
}

function deriveAirflowLabelFromScore(airflowScore) {
  const safeScore = clampInt(Number(airflowScore) || 0, 0, 100);
  if (safeScore >= 75) return 'Good';
  if (safeScore >= 40) return 'Mittel';
  return 'Schwach';
}

function getEnvironmentControlDefaults() {
  const dayTemperatureC = 25;
  const dayHumidityPercent = 60;
  const nightTemperatureC = 21;
  const nightHumidityPercent = 55;

  return {
    temperatureC: dayTemperatureC,
    humidityPercent: dayHumidityPercent,
    airflowPercent: 65,
    ph: 6.0,
    ec: 1.4,
    targets: {
      day: {
        temperatureC: dayTemperatureC,
        humidityPercent: dayHumidityPercent,
        vpdKpa: round2(computeVpdKpa(dayTemperatureC, dayHumidityPercent))
      },
      night: {
        temperatureC: nightTemperatureC,
        humidityPercent: nightHumidityPercent,
        vpdKpa: round2(computeVpdKpa(nightTemperatureC, nightHumidityPercent))
      }
    },
    vpdTargetEnabled: false,
    fan: {
      minPercent: 65,
      maxPercent: 100
    },
    buffers: {
      temperatureC: 0.7,
      humidityPercent: 4,
      vpdKpa: 0.12
    },
    ramp: {
      percentPerMinute: 18
    },
    transitionMinutes: 45
  };
}

function normalizeEnvironmentControls(sourceState = state) {
  const target = sourceState && typeof sourceState === 'object' ? sourceState : state;
  const defaults = getEnvironmentControlDefaults();
  const controls = target.environmentControls && typeof target.environmentControls === 'object'
    ? target.environmentControls
    : (target.environmentControls = {});

  controls.temperatureC = clamp(Number.isFinite(Number(controls.temperatureC)) ? Number(controls.temperatureC) : defaults.temperatureC, 16, 36);
  controls.humidityPercent = clampInt(Number.isFinite(Number(controls.humidityPercent)) ? Number(controls.humidityPercent) : defaults.humidityPercent, 30, 90);
  controls.airflowPercent = clampInt(Number.isFinite(Number(controls.airflowPercent)) ? Number(controls.airflowPercent) : defaults.airflowPercent, 0, 100);
  controls.ph = clamp(Number.isFinite(Number(controls.ph)) ? Number(controls.ph) : defaults.ph, 5.0, 7.0);
  controls.ec = clamp(Number.isFinite(Number(controls.ec)) ? Number(controls.ec) : defaults.ec, 0.6, 2.8);

  if (!controls.targets || typeof controls.targets !== 'object') controls.targets = {};
  if (!controls.targets.day || typeof controls.targets.day !== 'object') controls.targets.day = {};
  if (!controls.targets.night || typeof controls.targets.night !== 'object') controls.targets.night = {};

  controls.targets.day.temperatureC = clamp(
    Number.isFinite(Number(controls.targets.day.temperatureC)) ? Number(controls.targets.day.temperatureC) : controls.temperatureC,
    16,
    36
  );
  controls.targets.day.humidityPercent = clampInt(
    Number.isFinite(Number(controls.targets.day.humidityPercent)) ? Number(controls.targets.day.humidityPercent) : controls.humidityPercent,
    30,
    90
  );
  controls.targets.day.vpdKpa = clamp(
    Number.isFinite(Number(controls.targets.day.vpdKpa))
      ? Number(controls.targets.day.vpdKpa)
      : computeVpdKpa(controls.targets.day.temperatureC, controls.targets.day.humidityPercent),
    0.2,
    3.0
  );

  controls.targets.night.temperatureC = clamp(
    Number.isFinite(Number(controls.targets.night.temperatureC)) ? Number(controls.targets.night.temperatureC) : defaults.targets.night.temperatureC,
    16,
    36
  );
  controls.targets.night.humidityPercent = clampInt(
    Number.isFinite(Number(controls.targets.night.humidityPercent)) ? Number(controls.targets.night.humidityPercent) : defaults.targets.night.humidityPercent,
    30,
    90
  );
  controls.targets.night.vpdKpa = clamp(
    Number.isFinite(Number(controls.targets.night.vpdKpa))
      ? Number(controls.targets.night.vpdKpa)
      : computeVpdKpa(controls.targets.night.temperatureC, controls.targets.night.humidityPercent),
    0.2,
    3.0
  );

  controls.vpdTargetEnabled = Boolean(controls.vpdTargetEnabled);
  if (!controls.fan || typeof controls.fan !== 'object') controls.fan = {};
  controls.fan.minPercent = clampInt(Number.isFinite(Number(controls.fan.minPercent)) ? Number(controls.fan.minPercent) : controls.airflowPercent, 0, 100);
  controls.fan.maxPercent = clampInt(Number.isFinite(Number(controls.fan.maxPercent)) ? Number(controls.fan.maxPercent) : defaults.fan.maxPercent, controls.fan.minPercent, 100);

  if (!controls.buffers || typeof controls.buffers !== 'object') controls.buffers = {};
  controls.buffers.temperatureC = clamp(Number.isFinite(Number(controls.buffers.temperatureC)) ? Number(controls.buffers.temperatureC) : defaults.buffers.temperatureC, 0.1, 4);
  controls.buffers.humidityPercent = clampInt(Number.isFinite(Number(controls.buffers.humidityPercent)) ? Number(controls.buffers.humidityPercent) : defaults.buffers.humidityPercent, 1, 20);
  controls.buffers.vpdKpa = clamp(Number.isFinite(Number(controls.buffers.vpdKpa)) ? Number(controls.buffers.vpdKpa) : defaults.buffers.vpdKpa, 0.02, 0.6);

  if (!controls.ramp || typeof controls.ramp !== 'object') controls.ramp = {};
  controls.ramp.percentPerMinute = clamp(Number.isFinite(Number(controls.ramp.percentPerMinute)) ? Number(controls.ramp.percentPerMinute) : defaults.ramp.percentPerMinute, 1, 100);
  controls.transitionMinutes = clamp(Number.isFinite(Number(controls.transitionMinutes)) ? Number(controls.transitionMinutes) : defaults.transitionMinutes, 1, 180);

  controls.temperatureC = controls.targets.day.temperatureC;
  controls.humidityPercent = controls.targets.day.humidityPercent;
  controls.airflowPercent = controls.fan.minPercent;

  return controls;
}

function getEnvironmentControlsForSimulation(sourceState = state) {
  return normalizeEnvironmentControls(sourceState);
}

function resolveLightPpfdBase(sourceState = state) {
  const setupLight = String(sourceState && sourceState.setup && sourceState.setup.light || 'medium').toLowerCase();
  if (setupLight === 'high') return 780;
  if (setupLight === 'low') return 470;
  return 620;
}

function resolveLightOutputPercent(sourceState = state, simulationLike = state.simulation) {
  if (!(simulationLike && simulationLike.isDaytime)) {
    return 0;
  }
  const setupLight = String(sourceState && sourceState.setup && sourceState.setup.light || 'medium').toLowerCase();
  if (setupLight === 'high') return 100;
  if (setupLight === 'low') return 62;
  return 82;
}

function isIndoorClimateMode(sourceState = state) {
  const activeState = sourceState && typeof sourceState === 'object' ? sourceState : state;
  return String(activeState && activeState.setup && activeState.setup.mode || '').trim().toLowerCase() === 'indoor';
}

function lerp(start, end, t) {
  const safeT = clamp(Number(t) || 0, 0, 1);
  return Number(start) + ((Number(end) - Number(start)) * safeT);
}

function computeClimateAirflowScore(climate, controls, statusLike = state.status) {
  const circulation = Number(climate.devices && climate.devices.circulation && climate.devices.circulation.outputPercent || 0);
  const exhaust = Number(climate.devices && climate.devices.exhaust && climate.devices.exhaust.outputPercent || 0);
  const demandFloor = Number(controls && controls.fan && controls.fan.minPercent || 0);
  const stress = clamp(Number(statusLike && statusLike.stress || 0), 0, 100);
  const score = Math.round((circulation * 0.55) + (exhaust * 0.35) + (demandFloor * 0.10) - (stress * 0.08));
  return clamp(score, 0, 100);
}

function syncClimateStateToLegacyReadout(climate, controls, simulationLike = state.simulation, sourceState = state) {
  const lightOutput = resolveLightOutputPercent(sourceState, simulationLike);
  climate.tent.temperatureC = clamp(Number(controls.temperatureC) || 0, 10, 40);
  climate.tent.absoluteHumidityGm3 = clamp(
    absoluteHumidityFromRelativeHumidity(climate.tent.temperatureC, controls.humidityPercent),
    0.5,
    45
  );
  climate.tent.humidityPercent = clampInt(Number(controls.humidityPercent) || 0, 0, 100);
  climate.tent.vpdKpa = round2(computeVpdKpa(climate.tent.temperatureC, climate.tent.humidityPercent));
  climate.tent.exchangePerMinute = 0;
  climate.tent.transpirationGph = 0;
  climate.tent.airflowScore = clampInt(Number(controls.airflowPercent) || 0, 0, 100);
  climate.tent.airflowLabel = deriveAirflowLabelFromScore(climate.tent.airflowScore);

  for (const deviceKey of ['exhaust', 'circulation', 'heater', 'humidifier', 'dehumidifier']) {
    if (!climate.devices[deviceKey] || typeof climate.devices[deviceKey] !== 'object') {
      climate.devices[deviceKey] = {};
    }
    climate.devices[deviceKey].targetPercent = 0;
    climate.devices[deviceKey].outputPercent = 0;
  }
  if (!climate.devices.light || typeof climate.devices.light !== 'object') {
    climate.devices.light = {};
  }
  climate.devices.light.targetPercent = lightOutput;
  climate.devices.light.outputPercent = lightOutput;

  climate.runtime.controlDemand = {
    temperatureError: 0,
    humidityError: 0,
    vpdError: 0,
    targetTemperatureC: round2(climate.tent.temperatureC),
    targetHumidityPercent: round2(climate.tent.humidityPercent),
    targetVpdKpa: round2(climate.tent.vpdKpa)
  };
  climate.runtime.eventTelemetry = {
    instabilityScore: 0
  };
}

function ensureClimateState(sourceState = state, statusLike = state.status, simulationLike = state.simulation, plantLike = state.plant) {
  const target = sourceState && typeof sourceState === 'object' ? sourceState : state;
  const controls = normalizeEnvironmentControls(target);
  const sim = simulationLike || (target && target.simulation) || state.simulation;
  const isDay = Boolean(sim && sim.isDaytime);
  const activePeriod = isDay ? 'day' : 'night';

  if (!target.climate || typeof target.climate !== 'object') target.climate = {};
  const climate = target.climate;

  if (!climate.tent || typeof climate.tent !== 'object') climate.tent = {};
  if (!climate.room || typeof climate.room !== 'object') climate.room = {};
  if (!climate.devices || typeof climate.devices !== 'object') climate.devices = {};
  if (!climate.runtime || typeof climate.runtime !== 'object') climate.runtime = {};

  if (!climate.room.day || typeof climate.room.day !== 'object') climate.room.day = {};
  if (!climate.room.night || typeof climate.room.night !== 'object') climate.room.night = {};
  if (!climate.room.current || typeof climate.room.current !== 'object') climate.room.current = {};

  climate.room.day.temperatureC = clamp(Number.isFinite(Number(climate.room.day.temperatureC)) ? Number(climate.room.day.temperatureC) : CLIMATE_ROOM_DEFAULTS.day.temperatureC, 10, 36);
  climate.room.day.humidityPercent = clampInt(Number.isFinite(Number(climate.room.day.humidityPercent)) ? Number(climate.room.day.humidityPercent) : CLIMATE_ROOM_DEFAULTS.day.humidityPercent, 20, 90);
  climate.room.night.temperatureC = clamp(Number.isFinite(Number(climate.room.night.temperatureC)) ? Number(climate.room.night.temperatureC) : CLIMATE_ROOM_DEFAULTS.night.temperatureC, 10, 36);
  climate.room.night.humidityPercent = clampInt(Number.isFinite(Number(climate.room.night.humidityPercent)) ? Number(climate.room.night.humidityPercent) : CLIMATE_ROOM_DEFAULTS.night.humidityPercent, 20, 90);

  const activeRoom = climate.room[activePeriod];
  climate.room.current.temperatureC = clamp(Number.isFinite(Number(climate.room.current.temperatureC)) ? Number(climate.room.current.temperatureC) : activeRoom.temperatureC, 10, 36);
  climate.room.current.absoluteHumidityGm3 = clamp(
    Number.isFinite(Number(climate.room.current.absoluteHumidityGm3))
      ? Number(climate.room.current.absoluteHumidityGm3)
      : absoluteHumidityFromRelativeHumidity(climate.room.current.temperatureC, activeRoom.humidityPercent),
    0,
    80
  );

  climate.tent.volumeM3 = clamp(Number.isFinite(Number(climate.tent.volumeM3)) ? Number(climate.tent.volumeM3) : CLIMATE_TENT_VOLUME_M3, 0.5, 5);
  climate.tent.temperatureC = clamp(Number.isFinite(Number(climate.tent.temperatureC)) ? Number(climate.tent.temperatureC) : controls.temperatureC, 10, 40);
  climate.tent.absoluteHumidityGm3 = clamp(
    Number.isFinite(Number(climate.tent.absoluteHumidityGm3))
      ? Number(climate.tent.absoluteHumidityGm3)
      : absoluteHumidityFromRelativeHumidity(climate.tent.temperatureC, controls.humidityPercent),
    0,
    80
  );
  climate.tent.exchangePerMinute = clamp(Number(climate.tent.exchangePerMinute) || 0, 0, 1);
  climate.tent.transpirationGph = clamp(Number(climate.tent.transpirationGph) || 0, 0, 25);

  const deviceDefaults = {
    light: resolveLightOutputPercent(target, sim),
    exhaust: controls.fan.minPercent,
    circulation: controls.fan.minPercent,
    heater: 0,
    humidifier: 0,
    dehumidifier: 0
  };
  for (const [deviceKey, defaultTarget] of Object.entries(deviceDefaults)) {
    if (!climate.devices[deviceKey] || typeof climate.devices[deviceKey] !== 'object') {
      climate.devices[deviceKey] = {};
    }
    const device = climate.devices[deviceKey];
    device.enabled = typeof device.enabled === 'boolean' ? device.enabled : true;
    device.targetPercent = clamp(Number.isFinite(Number(device.targetPercent)) ? Number(device.targetPercent) : defaultTarget, 0, 100);
    device.outputPercent = clamp(Number.isFinite(Number(device.outputPercent)) ? Number(device.outputPercent) : device.targetPercent, 0, 100);
  }

  climate.runtime.activePeriod = climate.runtime.activePeriod === 'night' ? 'night' : 'day';
  climate.runtime.transitionFromPeriod = climate.runtime.transitionFromPeriod === 'night' ? 'night' : 'day';
  climate.runtime.targetBlend = clamp(Number.isFinite(Number(climate.runtime.targetBlend)) ? Number(climate.runtime.targetBlend) : 1, 0, 1);
  climate.runtime.lastPeriodSwitchSimMs = Number.isFinite(Number(climate.runtime.lastPeriodSwitchSimMs))
    ? Number(climate.runtime.lastPeriodSwitchSimMs)
    : Number(sim && sim.simTimeMs || 0);
  if (!climate.runtime.controlDemand || typeof climate.runtime.controlDemand !== 'object') {
    climate.runtime.controlDemand = {};
  }
  if (!climate.runtime.eventTelemetry || typeof climate.runtime.eventTelemetry !== 'object') {
    climate.runtime.eventTelemetry = {};
  }
  climate.runtime.eventTelemetry.instabilityScore = clamp(Number(climate.runtime.eventTelemetry.instabilityScore) || 0, 0, 100);

  if (climate.runtime.activePeriod !== activePeriod) {
    climate.runtime.transitionFromPeriod = climate.runtime.activePeriod;
    climate.runtime.activePeriod = activePeriod;
    climate.runtime.targetBlend = 0;
    climate.runtime.lastPeriodSwitchSimMs = Number(sim && sim.simTimeMs || 0);
  }

  climate.tent.humidityPercent = clampInt(relativeHumidityFromAbsoluteHumidity(climate.tent.temperatureC, climate.tent.absoluteHumidityGm3), 0, 100);
  climate.tent.vpdKpa = round2(computeVpdKpa(climate.tent.temperatureC, climate.tent.humidityPercent));
  climate.tent.airflowScore = computeClimateAirflowScore(climate, controls, statusLike);
  climate.tent.airflowLabel = deriveAirflowLabelFromScore(climate.tent.airflowScore);

  if (!isIndoorClimateMode(target)) {
    syncClimateStateToLegacyReadout(climate, controls, sim, target);
  }

  return climate;
}

function buildEnvironmentReadoutFromState(
  sourceState = state,
  statusLike = sourceState && sourceState.status ? sourceState.status : state.status,
  simulationLike = sourceState && sourceState.simulation ? sourceState.simulation : state.simulation,
  plantLike = sourceState && sourceState.plant ? sourceState.plant : state.plant
) {
  const activeState = sourceState && typeof sourceState === 'object' ? sourceState : state;
  const controls = normalizeEnvironmentControls(activeState);
  const climate = ensureClimateState(activeState, statusLike, simulationLike, plantLike);
  const ppfdBase = resolveLightPpfdBase(activeState);
  const ppfd = (simulationLike && simulationLike.isDaytime)
    ? Math.round(clamp(ppfdBase + (Number(statusLike && statusLike.growth || 0) * 1.4), 320, 1100))
    : 45;

  if (climate && climate.tent) {
    return {
      temperatureC: clamp(Number(climate.tent.temperatureC) || controls.temperatureC, 10, 40),
      humidityPercent: clampInt(Number(climate.tent.humidityPercent) || controls.humidityPercent, 0, 100),
      vpdKpa: clamp(Number(climate.tent.vpdKpa) || computeVpdKpa(controls.temperatureC, controls.humidityPercent), 0.2, 3.5),
      ppfd,
      airflowScore: clampInt(Number(climate.tent.airflowScore) || controls.airflowPercent, 0, 100),
      airflowLabel: climate.tent.airflowLabel || deriveAirflowLabelFromScore(climate.tent.airflowScore),
      instabilityScore: clamp(Number(climate.runtime && climate.runtime.eventTelemetry && climate.runtime.eventTelemetry.instabilityScore) || 0, 0, 100)
    };
  }

  return {
    temperatureC: controls.temperatureC,
    humidityPercent: controls.humidityPercent,
    vpdKpa: computeVpdKpa(controls.temperatureC, controls.humidityPercent),
    ppfd,
    airflowScore: controls.airflowPercent,
    airflowLabel: deriveAirflowLabelFromScore(controls.airflowPercent),
    instabilityScore: 0
  };
}

function buildEnvironmentModelFromState(statusLike = state.status, simulationLike = state.simulation, plantLike = state.plant, sourceState = state) {
  const water = clamp(Number(statusLike && statusLike.water || 0), 0, 100);
  const stress = clamp(Number(statusLike && statusLike.stress || 0), 0, 100);
  const risk = clamp(Number(statusLike && statusLike.risk || 0), 0, 100);
  const stageIndexOneBased = clampInt(Number((plantLike && plantLike.stageIndex) || 0) + 1, 1, 12);
  const profile = getEnvStageProfile(stageIndexOneBased);
  const readout = buildEnvironmentReadoutFromState(sourceState, statusLike, simulationLike, plantLike);
  const temperatureC = clamp(Number(readout.temperatureC) || 0, 10, 40);
  const humidityPercent = clampInt(Number(readout.humidityPercent) || 0, 0, 100);
  const vpdKpa = clamp(Number(readout.vpdKpa) || 0, 0.2, 3.5);
  const ppfd = clampInt(Number(readout.ppfd) || 45, 0, 1100);
  const airflowScore = clampInt(
    Number.isFinite(Number(readout.airflowScore))
      ? Number(readout.airflowScore)
      : (readout.airflowLabel === 'Good' ? 80 : (readout.airflowLabel === 'Mittel' ? 55 : 30)),
    0,
    100
  );
  const airflowLabel = readout.airflowLabel || deriveAirflowLabelFromScore(airflowScore);

  const tempDeviation = profile.temp ? Math.max(0, profile.temp[0] - temperatureC, temperatureC - profile.temp[1]) : 0;
  const humidityDeviation = profile.humidity ? Math.max(0, profile.humidity[0] - humidityPercent, humidityPercent - profile.humidity[1]) : 0;
  const vpdDeviation = profile.vpd ? Math.max(0, profile.vpd[0] - vpdKpa, vpdKpa - profile.vpd[1]) : 0;
  const biologicalHeatPressure = clamp(((stress * 0.55) + (risk * 0.45)) / 100, 0, 1);
  const biologicalMoisturePressure = clamp((((100 - water) * 0.35) + (stress * 0.65)) / 100, 0, 1);
  const biologicalAirflowPressure = clamp(((stress * 0.45) + (risk * 0.55)) / 100, 0, 1);

  return {
    temperatureC,
    humidityPercent,
    vpdKpa,
    ppfd,
    airflowScore,
    airflowLabel,
    stageProfile: profile,
    stressFactor: {
      temp: clamp((tempDeviation / 7) + (biologicalHeatPressure * 0.18), 0, 1),
      humidity: clamp((humidityDeviation / 30) + (biologicalMoisturePressure * 0.15), 0, 1),
      vpd: clamp((vpdDeviation / 0.95) + (biologicalHeatPressure * 0.16), 0, 1),
      airflow: clamp(((45 - airflowScore) / 45) + (biologicalAirflowPressure * 0.14), 0, 1)
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

function rampPercentToward(current, target, maxDeltaPerMinute, minutes) {
  const safeCurrent = clamp(Number(current) || 0, 0, 100);
  const safeTarget = clamp(Number(target) || 0, 0, 100);
  const maxDelta = Math.max(0, Number(maxDeltaPerMinute) || 0) * Math.max(0, Number(minutes) || 0);
  if (safeCurrent < safeTarget) {
    return clamp(safeCurrent + maxDelta, 0, safeTarget);
  }
  if (safeCurrent > safeTarget) {
    return clamp(safeCurrent - maxDelta, safeTarget, 100);
  }
  return safeCurrent;
}

function computePlantTranspirationGph(statusLike, simulationLike, plantLike, climate, sourceState = state) {
  const isDay = Boolean(simulationLike && simulationLike.isDaytime);
  const stageIndexOneBased = clampInt(Number((plantLike && plantLike.stageIndex) || 0) + 1, 1, 12);
  const water = clamp(Number(statusLike && statusLike.water || 0), 0, 100);
  const stress = clamp(Number(statusLike && statusLike.stress || 0), 0, 100);
  const lightOutput = resolveLightOutputPercent(sourceState, simulationLike);
  const stageFactor = 0.22 + (stageIndexOneBased * 0.17);
  const waterFactor = clamp(0.35 + (water / 100), 0.2, 1.35);
  const lightFactor = isDay ? clamp(lightOutput / 100, 0.45, 1.2) : 0.12;
  const vpdFactor = clamp(0.55 + ((Number(climate.tent.vpdKpa) || 0.8) * 0.55), 0.35, 1.85);
  const stressPenalty = clamp(1 - (stress * 0.004), 0.55, 1);
  return clamp(3.2 * stageFactor * waterFactor * lightFactor * vpdFactor * stressPenalty, 0.05, 20);
}

function updateClimateState(minutes, sourceState = state, statusLike = state.status, simulationLike = state.simulation, plantLike = state.plant) {
  const safeMinutes = Math.max(0, Number(minutes) || 0);
  const activeState = sourceState && typeof sourceState === 'object' ? sourceState : state;
  const controls = normalizeEnvironmentControls(activeState);
  const climate = ensureClimateState(activeState, statusLike, simulationLike, plantLike);
  if (safeMinutes <= 0 || !isIndoorClimateMode(activeState)) {
    return climate;
  }

  const totalSteps = Math.max(1, Math.ceil(safeMinutes / CLIMATE_UPDATE_MAX_STEP_MINUTES));
  const stepMinutes = safeMinutes / totalSteps;
  const currentPeriod = Boolean(simulationLike && simulationLike.isDaytime) ? 'day' : 'night';
  const currentTargetProfile = controls.targets[currentPeriod];
  const previousTargetProfile = controls.targets[climate.runtime.transitionFromPeriod || currentPeriod] || currentTargetProfile;

  for (let index = 0; index < totalSteps; index += 1) {
    const roomProfile = climate.room[currentPeriod];
    climate.room.current.temperatureC = lerp(climate.room.current.temperatureC, roomProfile.temperatureC, clamp(0.22 * stepMinutes, 0, 1));
    const roomAbsTarget = absoluteHumidityFromRelativeHumidity(climate.room.current.temperatureC, roomProfile.humidityPercent);
    climate.room.current.absoluteHumidityGm3 = lerp(climate.room.current.absoluteHumidityGm3, roomAbsTarget, clamp(0.26 * stepMinutes, 0, 1));

    climate.runtime.targetBlend = clamp(climate.runtime.targetBlend + (stepMinutes / Math.max(1, controls.transitionMinutes)), 0, 1);
    const targetTemperatureC = lerp(previousTargetProfile.temperatureC, currentTargetProfile.temperatureC, climate.runtime.targetBlend);
    const targetHumidityPercent = lerp(previousTargetProfile.humidityPercent, currentTargetProfile.humidityPercent, climate.runtime.targetBlend);
    const targetVpdKpa = lerp(previousTargetProfile.vpdKpa, currentTargetProfile.vpdKpa, climate.runtime.targetBlend);

    const temperatureError = climate.tent.temperatureC - targetTemperatureC;
    const humidityError = climate.tent.humidityPercent - targetHumidityPercent;
    const vpdError = climate.tent.vpdKpa - targetVpdKpa;

    let exhaustTarget = controls.fan.minPercent;
    let heaterTarget = 0;
    let humidifierTarget = 0;
    let dehumidifierTarget = 0;

    if (temperatureError > controls.buffers.temperatureC) {
      exhaustTarget += clamp(temperatureError * 22, 0, controls.fan.maxPercent - controls.fan.minPercent);
    } else if (temperatureError < -controls.buffers.temperatureC) {
      heaterTarget = clamp(Math.abs(temperatureError) * 37, 0, 100);
    }

    if (humidityError > controls.buffers.humidityPercent) {
      exhaustTarget += clamp((humidityError - controls.buffers.humidityPercent) * 3.6, 0, controls.fan.maxPercent - controls.fan.minPercent);
      dehumidifierTarget = clamp((humidityError - controls.buffers.humidityPercent) * 7, 0, 100);
    } else if (humidityError < -controls.buffers.humidityPercent) {
      humidifierTarget = clamp((Math.abs(humidityError) - controls.buffers.humidityPercent) * 7.5, 0, 100);
    }

    if (controls.vpdTargetEnabled) {
      if (vpdError > controls.buffers.vpdKpa) {
        humidifierTarget = Math.max(humidifierTarget, clamp((vpdError - controls.buffers.vpdKpa) * 65, 0, 100));
        exhaustTarget = Math.max(controls.fan.minPercent, exhaustTarget - clamp((vpdError - controls.buffers.vpdKpa) * 18, 0, exhaustTarget));
      } else if (vpdError < -controls.buffers.vpdKpa) {
        dehumidifierTarget = Math.max(dehumidifierTarget, clamp((Math.abs(vpdError) - controls.buffers.vpdKpa) * 72, 0, 100));
        exhaustTarget += clamp((Math.abs(vpdError) - controls.buffers.vpdKpa) * 20, 0, controls.fan.maxPercent - controls.fan.minPercent);
      }
    }

    exhaustTarget = clamp(exhaustTarget, controls.fan.minPercent, controls.fan.maxPercent);
    const circulationTarget = clamp(Math.max(controls.fan.minPercent, controls.airflowPercent), 0, 100);
    const lightTarget = resolveLightOutputPercent(activeState, simulationLike);

    climate.devices.light.targetPercent = lightTarget;
    climate.devices.exhaust.targetPercent = exhaustTarget;
    climate.devices.circulation.targetPercent = circulationTarget;
    climate.devices.heater.targetPercent = heaterTarget;
    climate.devices.humidifier.targetPercent = humidifierTarget;
    climate.devices.dehumidifier.targetPercent = dehumidifierTarget;

    const rampRate = controls.ramp.percentPerMinute;
    climate.devices.light.outputPercent = rampPercentToward(climate.devices.light.outputPercent, climate.devices.light.targetPercent, rampRate * 1.2, stepMinutes);
    climate.devices.exhaust.outputPercent = rampPercentToward(climate.devices.exhaust.outputPercent, climate.devices.exhaust.targetPercent, rampRate, stepMinutes);
    climate.devices.circulation.outputPercent = rampPercentToward(climate.devices.circulation.outputPercent, climate.devices.circulation.targetPercent, rampRate * 1.25, stepMinutes);
    climate.devices.heater.outputPercent = rampPercentToward(climate.devices.heater.outputPercent, climate.devices.heater.targetPercent, rampRate * 0.9, stepMinutes);
    climate.devices.humidifier.outputPercent = rampPercentToward(climate.devices.humidifier.outputPercent, climate.devices.humidifier.targetPercent, rampRate * 0.8, stepMinutes);
    climate.devices.dehumidifier.outputPercent = rampPercentToward(climate.devices.dehumidifier.outputPercent, climate.devices.dehumidifier.targetPercent, rampRate * 0.8, stepMinutes);

    const exchangePerMinute = clamp(
      CLIMATE_BASE_EXCHANGE_PER_MINUTE
      + (climate.devices.exhaust.outputPercent * CLIMATE_EXHAUST_EXCHANGE_FACTOR)
      + (climate.devices.circulation.outputPercent * CLIMATE_CIRCULATION_EXCHANGE_FACTOR),
      CLIMATE_BASE_EXCHANGE_PER_MINUTE,
      CLIMATE_MAX_EXCHANGE_PER_MINUTE
    );
    climate.tent.exchangePerMinute = exchangePerMinute;
    const previousTemperatureC = climate.tent.temperatureC;
    const previousHumidityPercent = climate.tent.humidityPercent;
    const previousVpdKpa = climate.tent.vpdKpa;

    const lightHeatPerMinute = 0.018 * (climate.devices.light.outputPercent / 100);
    const heaterHeatPerMinute = 0.039 * (climate.devices.heater.outputPercent / 100);
    const humidifierCoolingPerMinute = 0.004 * (climate.devices.humidifier.outputPercent / 100);
    const dehumidifierHeatingPerMinute = 0.005 * (climate.devices.dehumidifier.outputPercent / 100);

    climate.tent.temperatureC += (climate.room.current.temperatureC - climate.tent.temperatureC) * exchangePerMinute * stepMinutes;
    climate.tent.temperatureC += (lightHeatPerMinute + heaterHeatPerMinute + dehumidifierHeatingPerMinute - humidifierCoolingPerMinute) * stepMinutes;
    climate.tent.temperatureC = clamp(climate.tent.temperatureC, 12, 40);

    climate.tent.humidityPercent = clampInt(relativeHumidityFromAbsoluteHumidity(climate.tent.temperatureC, climate.tent.absoluteHumidityGm3), 0, 100);
    climate.tent.vpdKpa = round2(computeVpdKpa(climate.tent.temperatureC, climate.tent.humidityPercent));
    climate.tent.transpirationGph = computePlantTranspirationGph(statusLike, simulationLike, plantLike, climate, activeState);

    const transpirationAbsDelta = ((climate.tent.transpirationGph / climate.tent.volumeM3) / 60) * stepMinutes;
    const humidifierAbsDelta = 0.18 * (climate.devices.humidifier.outputPercent / 100) * stepMinutes;
    const dehumidifierAbsDelta = 0.16 * (climate.devices.dehumidifier.outputPercent / 100) * stepMinutes;

    climate.tent.absoluteHumidityGm3 += (climate.room.current.absoluteHumidityGm3 - climate.tent.absoluteHumidityGm3) * exchangePerMinute * stepMinutes;
    climate.tent.absoluteHumidityGm3 += transpirationAbsDelta + humidifierAbsDelta - dehumidifierAbsDelta;
    climate.tent.absoluteHumidityGm3 = clamp(climate.tent.absoluteHumidityGm3, 0.5, 45);

    climate.tent.humidityPercent = clampInt(relativeHumidityFromAbsoluteHumidity(climate.tent.temperatureC, climate.tent.absoluteHumidityGm3), 0, 100);
    climate.tent.vpdKpa = round2(computeVpdKpa(climate.tent.temperatureC, climate.tent.humidityPercent));
    climate.tent.airflowScore = computeClimateAirflowScore(climate, controls, statusLike);
    climate.tent.airflowLabel = deriveAirflowLabelFromScore(climate.tent.airflowScore);
    const tempDeltaC = Math.abs(climate.tent.temperatureC - previousTemperatureC);
    const humidityDelta = Math.abs(climate.tent.humidityPercent - previousHumidityPercent);
    const vpdDelta = Math.abs(climate.tent.vpdKpa - previousVpdKpa);
    const telemetry = climate.runtime.eventTelemetry || (climate.runtime.eventTelemetry = {});
    const instabilityImpact = clamp((tempDeltaC * 18) + (humidityDelta * 1.35) + (vpdDelta * 45), 0, 100);
    telemetry.instabilityScore = clamp(
      Math.max(0, Number(telemetry.instabilityScore) || 0) - (4.5 * stepMinutes) + (instabilityImpact * 0.42),
      0,
      100
    );

    climate.runtime.controlDemand = {
      temperatureError: round2(temperatureError),
      humidityError: round2(humidityError),
      vpdError: round2(vpdError),
      targetTemperatureC: round2(targetTemperatureC),
      targetHumidityPercent: round2(targetHumidityPercent),
      targetVpdKpa: round2(targetVpdKpa)
    };
  }

  return climate;
}

const __gsGlobal = typeof globalThis !== 'undefined'
  ? globalThis
  : (typeof window !== 'undefined' ? window : this);

__gsGlobal.GrowSimEnvModel = __gsGlobal.GrowSimEnvModel || Object.freeze({
  getEnvStageProfile,
  getEnvironmentControlDefaults,
  normalizeEnvironmentControls,
  ensureClimateState,
  buildEnvironmentReadoutFromState,
  updateClimateState,
  computeVpdKpa,
  absoluteHumidityFromRelativeHumidity,
  relativeHumidityFromAbsoluteHumidity,
  buildEnvironmentModelFromState,
  buildRootZoneModelFromState
});

__gsGlobal.GrowSimDiagnostics = __gsGlobal.GrowSimDiagnostics || Object.freeze({
  computePlantDiagnostics,
  buildGuidanceHints
});

function tick() {
  const nowMs = Date.now();
  const prevOpenSheet = state.ui.openSheet;
  const run = state.run && typeof state.run === 'object' ? state.run : null;

  state.simulation.nowMs = nowMs;
  state.simulation.tickCount += 1;

  if (run && run.status === 'ended') {
    state.simulation.lastTickRealTimeMs = nowMs;
    state.simulation.growthImpulse = 0;
    syncCanonicalStateShape();
    if (typeof window !== 'undefined' && typeof window.checkMissions === 'function') {
      window.checkMissions('tick');
    }
    renderHud();
    renderEventSheet();
    renderAnalysisPanel();
    renderDeathOverlay();
    if (typeof renderRunSummaryOverlay === 'function') {
      renderRunSummaryOverlay();
    }
    state.ui.lastRenderRealMs = nowMs;
    schedulePersistState();
    return;
  }

  if (syncDeathState() && SIM_RUNTIME_FREEZE_ON_DEATH) {
    state.simulation.lastTickRealTimeMs = nowMs;
    state.simulation.growthImpulse = 0;
    syncCanonicalStateShape();
    if (typeof window !== 'undefined' && typeof window.checkMissions === 'function') {
      window.checkMissions('tick');
    }

    if (state.ui.openSheet !== prevOpenSheet) {
      renderSheets();
    }

    renderHud();
    renderEventSheet();
    renderAnalysisPanel();
    renderDeathOverlay();
    state.ui.lastRenderRealMs = nowMs;
    schedulePersistState();
    return;
  }

  advanceSimulationTime(nowMs, { reason: 'live_tick' });
  if (typeof window !== 'undefined' && typeof window.checkMissions === 'function') {
    window.checkMissions('tick');
  }

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

function getRealNowMs() {
  return Date.now();
}

function normalizeBaseSimulationSpeed(value) {
  const numericValue = Number(value);
  return SIM_RUNTIME_SPEED_OPTIONS.includes(numericValue) ? numericValue : SIM_RUNTIME_DEFAULT_BASE_SPEED;
}

function isSpeedBoostActive(nowMs = getRealNowMs()) {
  const safeNowMs = Number.isFinite(Number(nowMs)) ? Number(nowMs) : getRealNowMs();
  const boostEndsAtMs = Number(state.boost && state.boost.boostEndsAtMs);
  return Number.isFinite(boostEndsAtMs) && boostEndsAtMs > safeNowMs;
}

function getRemainingBoostMs(nowMs = getRealNowMs()) {
  const safeNowMs = Number.isFinite(Number(nowMs)) ? Number(nowMs) : getRealNowMs();
  const boostEndsAtMs = Number(state.boost && state.boost.boostEndsAtMs);
  if (!Number.isFinite(boostEndsAtMs)) {
    return 0;
  }
  return Math.max(0, boostEndsAtMs - safeNowMs);
}

function getEffectiveSimulationSpeed(nowMs = getRealNowMs()) {
  return isSpeedBoostActive(nowMs) ? SIM_RUNTIME_BOOST_SPEED : normalizeBaseSimulationSpeed(state.simulation && state.simulation.baseSpeed);
}

function computeSimulationDeltaMs(startRealMs, endRealMs) {
  const safeStartMs = Number.isFinite(Number(startRealMs)) ? Number(startRealMs) : getRealNowMs();
  const safeEndMs = Number.isFinite(Number(endRealMs)) ? Number(endRealMs) : safeStartMs;
  if (safeEndMs <= safeStartMs) {
    return 0;
  }

  const baseSpeed = normalizeBaseSimulationSpeed(state.simulation && state.simulation.baseSpeed);
  const boostEndsAtMs = Number(state.boost && state.boost.boostEndsAtMs);
  let cursorMs = safeStartMs;
  let simDeltaMs = 0;

  if (Number.isFinite(boostEndsAtMs) && boostEndsAtMs > cursorMs) {
    const boostSegmentEndMs = Math.min(safeEndMs, boostEndsAtMs);
    simDeltaMs += Math.max(0, boostSegmentEndMs - cursorMs) * SIM_RUNTIME_BOOST_SPEED;
    cursorMs = boostSegmentEndMs;
  }

  if (cursorMs < safeEndMs) {
    simDeltaMs += (safeEndMs - cursorMs) * baseSpeed;
  }

  return simDeltaMs;
}

function convertSimDeltaToFutureRealDeltaMs(simDeltaMs, fromRealNowMs = getRealNowMs()) {
  let remainingSimMs = Math.max(0, Number(simDeltaMs) || 0);
  if (remainingSimMs <= 0) {
    return 0;
  }

  const safeStartMs = Number.isFinite(Number(fromRealNowMs)) ? Number(fromRealNowMs) : getRealNowMs();
  const boostRemainingMs = getRemainingBoostMs(safeStartMs);
  let totalRealDeltaMs = 0;

  if (boostRemainingMs > 0) {
    const boostSimCapacityMs = boostRemainingMs * SIM_RUNTIME_BOOST_SPEED;
    if (remainingSimMs <= boostSimCapacityMs) {
      return Math.ceil(remainingSimMs / SIM_RUNTIME_BOOST_SPEED);
    }

    totalRealDeltaMs += boostRemainingMs;
    remainingSimMs -= boostSimCapacityMs;
  }

  const baseSpeed = normalizeBaseSimulationSpeed(state.simulation && state.simulation.baseSpeed);
  totalRealDeltaMs += Math.ceil(remainingSimMs / baseSpeed);
  return totalRealDeltaMs;
}

function updateEffectiveSpeedState(nowMs, options = {}) {
  const safeNowMs = Number.isFinite(Number(nowMs)) ? Number(nowMs) : getRealNowMs();
  const previousEffectiveSpeed = Number.isFinite(Number(state.simulation.effectiveSpeed))
    ? Number(state.simulation.effectiveSpeed)
    : normalizeBaseSimulationSpeed(state.simulation.baseSpeed);
  const previousBoostActive = Boolean(options.previousBoostActive);
  const currentBoostActive = isSpeedBoostActive(safeNowMs);
  const nextEffectiveSpeed = currentBoostActive ? SIM_RUNTIME_BOOST_SPEED : normalizeBaseSimulationSpeed(state.simulation.baseSpeed);

  state.simulation.baseSpeed = normalizeBaseSimulationSpeed(state.simulation.baseSpeed);
  state.simulation.effectiveSpeed = nextEffectiveSpeed;
  state.simulation.timeCompression = nextEffectiveSpeed;

  if (!currentBoostActive && Number(state.boost.boostEndsAtMs) <= safeNowMs) {
    state.boost.boostEndsAtMs = 0;
  }

  if (options.suppressLogs) {
    return nextEffectiveSpeed;
  }

  if (previousBoostActive && !currentBoostActive) {
    addLog('system', 'Zeit-Boost beendet', {
      atRealTimeMs: safeNowMs,
      effectiveSpeed: nextEffectiveSpeed
    });
  }

  if (previousEffectiveSpeed !== nextEffectiveSpeed) {
    addLog('system', 'Effektive Simulationsgeschwindigkeit geÃ¤ndert', {
      from: previousEffectiveSpeed,
      to: nextEffectiveSpeed,
      reason: options.reason || (currentBoostActive ? 'boost_active' : 'base_speed')
    });
  }

  return nextEffectiveSpeed;
}

function reportSimulationClockIssue(level, message, details) {
  const method = level === 'error' ? 'error' : 'warn';
  console[method](`[sim-time] ${message}`, details || {});
}

function setSimulationTimeMs(targetSimTimeMs, nowMs = getRealNowMs(), options = {}) {
  const safeNowMs = Number.isFinite(Number(nowMs)) ? Number(nowMs) : getRealNowMs();
  const simEpochMs = Number(state.simulation.simEpochMs) || alignToSimStartHour(safeNowMs, SIM_RUNTIME_START_HOUR);
  const previousSimTimeMs = Math.max(
    simEpochMs,
    Number(state.simulation.simTimeMs) || simEpochMs
  );
  const requestedSimTimeMs = Math.max(
    simEpochMs,
    Number.isFinite(Number(targetSimTimeMs)) ? Number(targetSimTimeMs) : previousSimTimeMs
  );
  if (!options.suppressLogs && requestedSimTimeMs < previousSimTimeMs) {
    reportSimulationClockIssue('error', 'Monotonic guard blocked backward sim time', {
      previousSimTimeMs,
      requestedSimTimeMs,
      safeNowMs,
      reason: options.reason || 'set_sim_time'
    });
  }
  const nextSimTimeMs = Math.max(previousSimTimeMs, requestedSimTimeMs);
  const previousLastTickRealTimeMs = Number.isFinite(Number(state.simulation.lastTickRealTimeMs))
    ? Number(state.simulation.lastTickRealTimeMs)
    : safeNowMs;
  if (!options.suppressLogs && safeNowMs < previousLastTickRealTimeMs) {
    reportSimulationClockIssue('error', 'Monotonic guard blocked backward lastTickRealTimeMs', {
      previousLastTickRealTimeMs,
      requestedLastTickRealTimeMs: safeNowMs,
      simTimeMs: nextSimTimeMs,
      reason: options.reason || 'set_sim_time'
    });
  }
  const nextLastTickRealTimeMs = Math.max(previousLastTickRealTimeMs, safeNowMs);
  const elapsedSimMs = Math.max(0, nextSimTimeMs - previousSimTimeMs);
  const wasDaytimeBefore = isDaytimeAtSimTime(previousSimTimeMs);
  const nowDaytime = isDaytimeAtSimTime(nextSimTimeMs);

  state.simulation.nowMs = Math.max(Number(state.simulation.nowMs) || 0, safeNowMs);
  state.simulation.simTimeMs = nextSimTimeMs;
  state.simulation.lastTickRealTimeMs = nextLastTickRealTimeMs;
  state.simulation.isDaytime = nowDaytime;

  if (!options.suppressLogs && elapsedSimMs >= SIM_RUNTIME_LARGE_TIME_JUMP_LOG_MS) {
    reportSimulationClockIssue('warn', 'Large simulation time jump detected', {
      previousSimTimeMs,
      nextSimTimeMs,
      elapsedSimMs,
      safeNowMs,
      reason: options.reason || 'set_sim_time'
    });
  }

  if (!wasDaytimeBefore && nowDaytime) {
    state.simulation.fairnessGraceUntilRealMs = Math.max(
      Number(state.simulation.fairnessGraceUntilRealMs) || 0,
      safeNowMs + FAIRNESS_REACTION_GRACE_MS
    );
    if (!options.suppressLogs) {
      addLog('system', 'Tagphase erreicht: kurze Reaktionszeit aktiv', {
        graceUntilRealMs: state.simulation.fairnessGraceUntilRealMs
      });
    }
  }

  return { elapsedSimMs };
}

function advanceSimulationTime(targetRealNowMs, options = {}) {
  const shouldChunk = Boolean(options.forceChunking);
  const safeTargetRealNowMs = Number.isFinite(Number(targetRealNowMs)) ? Number(targetRealNowMs) : getRealNowMs();
  const previousTickMs = Number.isFinite(Number(state.simulation.lastTickRealTimeMs))
    ? Number(state.simulation.lastTickRealTimeMs)
    : safeTargetRealNowMs;
  const rawRealDeltaMs = safeTargetRealNowMs - previousTickMs;
  if (!options.suppressLogs && rawRealDeltaMs < 0) {
    reportSimulationClockIssue('error', 'Negative real delta detected', {
      targetRealNowMs: safeTargetRealNowMs,
      previousTickMs,
      rawRealDeltaMs,
      reason: options.reason || 'advance'
    });
  }
  const safePreviousTickMs = Math.min(previousTickMs, safeTargetRealNowMs);
  const realDeltaMs = Math.max(0, rawRealDeltaMs);
  const previousBoostActive = isSpeedBoostActive(safePreviousTickMs);

  if (!shouldChunk && realDeltaMs > OFFLINE_CATCHUP_CHUNK_REAL_MS) {
    let chunkCursorMs = previousTickMs;
    let totalElapsedRealMs = 0;
    let totalElapsedSimMs = 0;

    while (chunkCursorMs < safeTargetRealNowMs) {
      const chunkEndMs = Math.min(chunkCursorMs + OFFLINE_CATCHUP_CHUNK_REAL_MS, safeTargetRealNowMs);
      const chunkResult = advanceSimulationTime(chunkEndMs, {
        ...options,
        forceChunking: true,
        offlineCatchUp: true,
        suppressEvents: true,
        suppressLogs: true
      });
      totalElapsedRealMs += chunkResult.elapsedRealMs;
      totalElapsedSimMs += chunkResult.elapsedSimMs;
      chunkCursorMs = chunkEndMs;
    }

    if (!options.suppressEvents) {
      runEventStateMachine(safeTargetRealNowMs);
    }
    if (!options.suppressEvents) {
      evaluateNotificationTriggers(safeTargetRealNowMs);
    }
    return {
      elapsedRealMs: totalElapsedRealMs,
      elapsedSimMs: totalElapsedSimMs
    };
  }

  if (realDeltaMs <= 0) {
    state.simulation.nowMs = Math.max(Number(state.simulation.nowMs) || 0, safeTargetRealNowMs);
    state.simulation.lastTickRealTimeMs = Math.max(previousTickMs, safeTargetRealNowMs);
    updateEffectiveSpeedState(safeTargetRealNowMs, {
      suppressLogs: Boolean(options.suppressLogs),
      previousBoostActive,
      reason: options.reason || 'advance'
    });
    syncCanonicalStateShape();
    return { elapsedRealMs: 0, elapsedSimMs: 0 };
  }

  const previousSimTimeMs = Number(state.simulation.simTimeMs)
    || Number(state.simulation.simEpochMs)
    || alignToSimStartHour(safeTargetRealNowMs, SIM_RUNTIME_START_HOUR);
  const elapsedSimMs = computeSimulationDeltaMs(safePreviousTickMs, safeTargetRealNowMs);

  if (!options.suppressLogs && realDeltaMs >= SIM_RUNTIME_LARGE_TIME_JUMP_LOG_MS) {
    addLog('system', 'GroÃŸer Realzeit-Sprung erkannt', {
      realDeltaMs,
      effectiveSpeedBefore: getEffectiveSimulationSpeed(safePreviousTickMs)
    });
  }

  const timeResult = setSimulationTimeMs(previousSimTimeMs + elapsedSimMs, safeTargetRealNowMs, {
    suppressLogs: Boolean(options.suppressLogs),
    reason: options.reason || 'advance'
  });

  applyStatusDrift(realDeltaMs, { offlineCatchUp: Boolean(options.offlineCatchUp) });
  const criticalNow = Number(state.status.health) < 20;
  if (criticalNow && !wasCriticalHealth) {
    notifyPlantNeedsCare('Deine Pflanze ist kritisch und braucht Pflege.');
  }
  wasCriticalHealth = criticalNow;
  const effectiveActionSimMs = Boolean(options.offlineCatchUp)
    ? (timeResult.elapsedSimMs * OFFLINE_STATUS_DECAY_MULTIPLIER)
    : timeResult.elapsedSimMs;
  applyActiveActionEffects(effectiveActionSimMs);
  const suppressDeathForLockedWindow = Boolean(options.suppressDeath) || isDeathSuppressedForFairness(safeTargetRealNowMs);
  advanceGrowthTick(timeResult.elapsedSimMs, { suppressDeath: suppressDeathForLockedWindow });
  applyFairnessSurvivalGuard(safeTargetRealNowMs);
  if (!options.suppressEvents) {
    runEventStateMachine(safeTargetRealNowMs);
  }
  resetBoostDaily(safeTargetRealNowMs);
  updateVisibleOverlays();
  updateEffectiveSpeedState(safeTargetRealNowMs, {
    suppressLogs: Boolean(options.suppressLogs),
    previousBoostActive,
    reason: options.reason || 'advance'
  });
  syncCanonicalStateShape();
  if (!options.suppressEvents) {
    evaluateNotificationTriggers(safeTargetRealNowMs);
  }

  return {
    elapsedRealMs: realDeltaMs,
    elapsedSimMs
  };
}

function applySimulationDelta(elapsedRealMs, effectiveNowMs) {
  const safeElapsedRealMs = Math.max(0, Number(elapsedRealMs) || 0);
  const safeEffectiveNowMs = Number.isFinite(Number(effectiveNowMs))
    ? Number(effectiveNowMs)
    : ((Number(state.simulation.lastTickRealTimeMs) || getRealNowMs()) + safeElapsedRealMs);
  return advanceSimulationTime(safeEffectiveNowMs, arguments[3] && typeof arguments[3] === 'object' ? arguments[3] : {});
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
  const previousTickMs = Number.isFinite(Number(state.simulation.lastTickRealTimeMs))
    ? Number(state.simulation.lastTickRealTimeMs)
    : safeNowMs;
  const elapsedSinceLastTickMs = Math.max(0, safeNowMs - previousTickMs);
  const cappedElapsedMs = Math.min(elapsedSinceLastTickMs, SIM_RUNTIME_MAX_OFFLINE_SIM_MS);
  const cappedResumeNowMs = previousTickMs + cappedElapsedMs;
  const suppressResumeEvents = elapsedSinceLastTickMs > SIM_RUNTIME_MAX_ELAPSED_PER_TICK_MS;
  const discardedElapsedMs = Math.max(0, elapsedSinceLastTickMs - cappedElapsedMs);
  state.simulation.nowMs = safeNowMs;
  const authGateBlocked = typeof window !== 'undefined'
    && typeof window.__gsIsAuthGateActive === 'function'
    && window.__gsIsAuthGateActive();

  try {
    if (authGateBlocked) {
      state.simulation.lastTickRealTimeMs = Math.max(Number(state.simulation.lastTickRealTimeMs) || 0, safeNowMs);
      state.simulation.growthImpulse = 0;
      syncCanonicalStateShape();
      return;
    }
    if (state.run && state.run.status === 'ended') {
      state.simulation.lastTickRealTimeMs = Math.max(Number(state.simulation.lastTickRealTimeMs) || 0, safeNowMs);
      state.simulation.growthImpulse = 0;
      syncCanonicalStateShape();
      return;
    }
    if (syncDeathState() && SIM_RUNTIME_FREEZE_ON_DEATH) {
      state.simulation.lastTickRealTimeMs = Math.max(Number(state.simulation.lastTickRealTimeMs) || 0, safeNowMs);
      state.simulation.growthImpulse = 0;
      syncCanonicalStateShape();
      return;
    }

    advanceSimulationTime(cappedResumeNowMs, {
      reason: 'resume',
      suppressEvents: suppressResumeEvents
    });
    if (elapsedSinceLastTickMs > SIM_RUNTIME_MAX_ELAPSED_PER_TICK_MS) {
      applyOfflineFairnessFloor();
      if (shouldProtectOfflineNightDeath(previousTickMs, safeNowMs)
        && (Number(state.status.health) <= 0 || Number(state.status.risk) >= 100 || isPlantDead())) {
        applyOfflineNightSurvivalClamp();
      }
    }
    if (discardedElapsedMs > 0 && Number.isFinite(Number(state.simulation.startRealTimeMs))) {
      state.simulation.startRealTimeMs = Math.max(
        Number(state.simulation.startRealTimeMs) || 0,
        (Number(state.simulation.startRealTimeMs) || 0) + discardedElapsedMs
      );
    }
    state.simulation.lastTickRealTimeMs = Math.max(Number(state.simulation.lastTickRealTimeMs) || 0, safeNowMs);
    state.simulation.nowMs = safeNowMs;
  } catch (error) {
    console.error('[offline] catch-up failed', error);
    state.simulation.lastTickRealTimeMs = Math.max(Number(state.simulation.lastTickRealTimeMs) || 0, safeNowMs);
    state.simulation.growthImpulse = 0;
    addLog('system', 'Offline-Fortschritt konnte nicht vollstÃ¤ndig berechnet werden.', {
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
  meta.rescue.lastResult = 'Offline-Nacht: Pflanze knapp Ã¼berlebt und ist kritisch.';
  addLog('system', 'Offline-Nachtschutz aktiv: Todeszustand verhindert', {
    health: round2(state.status.health),
    stress: round2(state.status.stress),
    risk: round2(state.status.risk)
  });
}

function evolveEnvironmentChemistry(minutes) {
  const controls = getEnvironmentControlsForSimulation();
  const statusWater = clamp(Number(state.status.water || 0), 0, 100);
  const statusNutrition = clamp(Number(state.status.nutrition || 0), 0, 100);

  updateClimateState(minutes, state, state.status, state.simulation, state.plant);

  const ecDecayPerMin = 0.0028 + ((100 - statusNutrition) * 0.00002) + ((statusWater < 35 ? 0.0012 : 0));
  controls.ec = clamp(controls.ec - (ecDecayPerMin * minutes), 0.6, 2.8);

  const phDrift = ((6.0 - controls.ph) * 0.018) - ((controls.ec - 1.6) * 0.004);
  controls.ph = clamp(controls.ph + (phDrift * minutes), 5.0, 7.0);
}

function getPassiveMetabolismContext(minutes, envModel, rootModel, options = {}) {
  const offlineCatchUp = Boolean(options.offlineCatchUp);
  const isDay = Boolean(state.simulation && state.simulation.isDaytime);
  const climate = ensureClimateState(state, state.status, state.simulation, state.plant);
  const transpirationGph = computePlantTranspirationGph(state.status, state.simulation, state.plant, climate, state);
  const transpirationPerMin = clamp(transpirationGph / 60, 0.001, 0.34);
  const metabolismFactor = isDay ? PASSIVE_METABOLISM_DAY_FACTOR : PASSIVE_METABOLISM_NIGHT_FACTOR;
  const nutritionMetabolismFactor = isDay ? PASSIVE_NUTRITION_DAY_FACTOR : PASSIVE_NUTRITION_NIGHT_FACTOR;

  const stageIndexOneBased = clampInt(Number(state.plant.stageIndex || 0) + 1, 1, 12);
  const stagePressure = clamp((stageIndexOneBased - 1) / 11, 0, 1);
  const envInfluence = 0.78 + (stagePressure * 0.34);
  const rootInfluence = 0.76 + (stagePressure * 0.38);
  const earlyPhaseRelief = 0.8 + (stagePressure * 0.2);
  const envStress = clamp(
    (Number(envModel && envModel.stressFactor && envModel.stressFactor.temp) || 0) * 0.36
    + ((Number(envModel && envModel.stressFactor && envModel.stressFactor.humidity) || 0) * 0.24)
    + ((Number(envModel && envModel.stressFactor && envModel.stressFactor.vpd) || 0) * 0.28)
    + ((Number(envModel && envModel.stressFactor && envModel.stressFactor.airflow) || 0) * 0.12),
    0,
    2
  );
  const rootStress = clamp(
    (Number(rootModel && rootModel.stressFactor && rootModel.stressFactor.ph) || 0) * 0.42
    + ((Number(rootModel && rootModel.stressFactor && rootModel.stressFactor.ec) || 0) * 0.34)
    + ((Number(rootModel && rootModel.stressFactor && rootModel.stressFactor.oxygen) || 0) * 0.24),
    0,
    2
  );
  const uptakePenalty = clamp(((rootStress * 0.58) + (envStress * 0.34)) * rootInfluence, 0, 0.92);
  const waterAvailability = clamp(Number(state.status.water || 0) / 100, 0.18, 1);
  const uptakeActivity = clamp((transpirationPerMin * 2.8 * waterAvailability) + ((1 - uptakePenalty) * 0.45), 0.18, 1.2);

  let waterDrainPerMin = (
    0.022
    + (transpirationPerMin * 0.95)
    + (envStress * 0.022 * envInfluence)
    + (rootStress * 0.008 * rootInfluence)
  ) * metabolismFactor * earlyPhaseRelief;

  let nutritionDrainPerMin = (
    0.009
    + (uptakeActivity * 0.032)
    + (rootStress * 0.010 * rootInfluence)
    + (envStress * 0.006 * envInfluence)
  ) * nutritionMetabolismFactor * earlyPhaseRelief;

  if (offlineCatchUp) {
    waterDrainPerMin *= OFFLINE_STATUS_DECAY_MULTIPLIER;
    nutritionDrainPerMin *= OFFLINE_STATUS_DECAY_MULTIPLIER;
  }

  return {
    uptakePenalty,
    waterDrain: Math.min(
      offlineCatchUp ? OFFLINE_PASSIVE_WATER_LOSS_CAP_PER_BLOCK : Number.POSITIVE_INFINITY,
      waterDrainPerMin * minutes
    ),
    nutritionDrain: Math.min(
      offlineCatchUp ? OFFLINE_PASSIVE_NUTRITION_LOSS_CAP_PER_BLOCK : Number.POSITIVE_INFINITY,
      nutritionDrainPerMin * minutes
    )
  };
}

function computeLowerBandSeverity(value, deadzone, warning, critical) {
  const numericValue = Number(value) || 0;
  if (numericValue >= deadzone) return 0;
  if (numericValue >= warning) {
    return clamp(((deadzone - numericValue) / Math.max(1, deadzone - warning)) * 0.35, 0, 0.35);
  }
  if (numericValue >= critical) {
    return clamp(0.35 + (((warning - numericValue) / Math.max(1, warning - critical)) * 0.45), 0.35, 0.8);
  }
  return clamp(0.8 + ((critical - numericValue) / Math.max(1, critical)) * 0.2, 0.8, 1);
}

function computeUpperBandSeverity(value, deadzone, warning, critical, extreme = critical + 0.4) {
  const numericValue = Number(value) || 0;
  if (numericValue <= deadzone) return 0;
  if (numericValue <= warning) {
    return clamp(((numericValue - deadzone) / Math.max(0.001, warning - deadzone)) * 0.35, 0, 0.35);
  }
  if (numericValue <= critical) {
    return clamp(0.35 + (((numericValue - warning) / Math.max(0.001, critical - warning)) * 0.45), 0.35, 0.8);
  }
  return clamp(0.8 + ((numericValue - critical) / Math.max(0.001, extreme - critical)) * 0.2, 0.8, 1);
}

function moveExposureToward(current, target, hours, risePerHour, fallPerHour) {
  const safeCurrent = clamp(Number(current) || 0, 0, 1.5);
  const safeTarget = clamp(Number(target) || 0, 0, 1.5);
  const delta = safeTarget - safeCurrent;
  if (Math.abs(delta) < 0.0001 || hours <= 0) {
    return safeCurrent;
  }

  const rate = delta > 0 ? risePerHour : fallPerHour;
  const step = Math.min(Math.abs(delta), Math.max(0, rate) * hours);
  return clamp(safeCurrent + (Math.sign(delta) * step), 0, 1.5);
}

function computeStressRecoveryReadiness(status, envStress, rootStress) {
  const waterReadiness = clamp((Number(status.water || 0) - 36) / 34, 0, 1);
  const nutritionReadiness = clamp((Number(status.nutrition || 0) - 34) / 34, 0, 1);
  const envReadiness = 1 - computeUpperBandSeverity(envStress, 0.2, 0.45, 0.95, 1.35);
  const rootReadiness = 1 - computeUpperBandSeverity(rootStress, 0.18, 0.42, 0.92, 1.3);
  const elevatedRiskPenalty = clamp((Number(status.risk || 0) - 72) / 28, 0, 1) * 0.18;
  return clamp(
    (waterReadiness * 0.3)
    + (nutritionReadiness * 0.24)
    + (envReadiness * 0.24)
    + (rootReadiness * 0.22)
    - elevatedRiskPenalty,
    0,
    1
  );
}

function computeGrowthSpeedMultiplier(snapshot = state, options = {}) {
  const simState = snapshot && snapshot.simulation ? snapshot.simulation : state.simulation;
  const status = snapshot && snapshot.status ? snapshot.status : state.status;
  const plant = snapshot && snapshot.plant ? snapshot.plant : state.plant;

  const envModel = options.envModel || buildEnvironmentModelFromState(status, simState, plant);
  const rootModel = options.rootModel || buildRootZoneModelFromState(status, envModel, plant);
  const envStress = Number.isFinite(Number(options.envStress))
    ? Number(options.envStress)
    : clamp(
      (Number(envModel && envModel.stressFactor && envModel.stressFactor.temp) || 0) * 0.36
      + ((Number(envModel && envModel.stressFactor && envModel.stressFactor.humidity) || 0) * 0.24)
      + ((Number(envModel && envModel.stressFactor && envModel.stressFactor.vpd) || 0) * 0.28)
      + ((Number(envModel && envModel.stressFactor && envModel.stressFactor.airflow) || 0) * 0.12),
      0,
      2
    );
  const rootStress = Number.isFinite(Number(options.rootStress))
    ? Number(options.rootStress)
    : clamp(
      (Number(rootModel && rootModel.stressFactor && rootModel.stressFactor.ph) || 0) * 0.42
      + ((Number(rootModel && rootModel.stressFactor && rootModel.stressFactor.ec) || 0) * 0.34)
      + ((Number(rootModel && rootModel.stressFactor && rootModel.stressFactor.oxygen) || 0) * 0.24),
      0,
      2
    );

  const centeredReadiness = (value, center, span) => clamp(1 - (Math.abs((Number(value) || 0) - center) / Math.max(1, span)), 0, 1);
  const waterFactor = clamp(
    ((1
      - (computeLowerBandSeverity(status.water, 38, 28, 14) * 0.95)
      - (computeUpperBandSeverity(status.water, 94, 97, 99.3, 100) * 0.28)) * 0.68)
    + (centeredReadiness(status.water, 68, 28) * 0.32),
    0.04,
    1
  );
  const nutritionFactor = clamp(
    ((1 - (computeLowerBandSeverity(status.nutrition, 38, 28, 14) * 0.9)) * 0.68)
    + (centeredReadiness(status.nutrition, 62, 24) * 0.32),
    0.08,
    1
  );
  const stressFactor = clamp(
    ((1 - (computeUpperBandSeverity(status.stress, 22, 42, 72, 96) * 0.96)) * 0.58)
    + (centeredReadiness(status.stress, 8, 26) * 0.42),
    0.04,
    1
  );
  const riskFactor = clamp(
    ((1 - (computeUpperBandSeverity(status.risk, 18, 38, 72, 96) * 0.72)) * 0.62)
    + (centeredReadiness(status.risk, 6, 24) * 0.38),
    0.14,
    1
  );
  const healthFactor = clamp(
    (((Number(status.health || 0) - 22) / 58) * 0.58)
    + (centeredReadiness(status.health, 92, 24) * 0.42),
    0.12,
    1
  );
  const envFactor = clamp(1 - (computeUpperBandSeverity(envStress, 0.16, 0.4, 0.9, 1.35) * 0.9), 0.08, 1);
  const rootFactor = clamp(1 - (computeUpperBandSeverity(rootStress, 0.14, 0.38, 0.88, 1.3) * 0.92), 0.08, 1);

  const readiness = clamp(
    (waterFactor * 0.24)
    + (nutritionFactor * 0.16)
    + (stressFactor * 0.18)
    + (healthFactor * 0.16)
    + (riskFactor * 0.08)
    + (envFactor * 0.1)
    + (rootFactor * 0.08),
    0,
    1
  );

  return clamp(0.1 + (readiness * 0.68) + (readiness * readiness * 0.6), 0.1, 1.38);
}

function diagnosticsSeverityBand(score) {
  const safeScore = clamp(Number(score) || 0, 0, 100);
  if (safeScore >= 78) return 'critical';
  if (safeScore >= 58) return 'high';
  if (safeScore >= 34) return 'medium';
  return 'low';
}

function buildDiagnosticIssue(definition = {}) {
  const score = round2(clamp(Number(definition.score) || 0, 0, 100));
  return {
    id: String(definition.id || 'issue'),
    family: String(definition.family || 'generic'),
    title: String(definition.title || 'Hinweis'),
    cause: String(definition.cause || ''),
    effect: String(definition.effect || ''),
    recommendation: String(definition.recommendation || ''),
    limit: String(definition.limit || ''),
    score,
    severity: diagnosticsSeverityBand(score)
  };
}

function computePlantDiagnostics(snapshot = state) {
  const simState = snapshot && snapshot.simulation ? snapshot.simulation : state.simulation;
  const status = snapshot && snapshot.status ? snapshot.status : state.status;
  const plant = snapshot && snapshot.plant ? snapshot.plant : state.plant;
  const envModel = buildEnvironmentModelFromState(status, simState, plant, snapshot || state);
  const rootModel = buildRootZoneModelFromState(status, envModel, plant);
  const growthSpeedMultiplier = computeGrowthSpeedMultiplier(snapshot, { envModel, rootModel });

  const water = clamp(Number(status && status.water || 0), 0, 100);
  const nutrition = clamp(Number(status && status.nutrition || 0), 0, 100);
  const stress = clamp(Number(status && status.stress || 0), 0, 100);
  const risk = clamp(Number(status && status.risk || 0), 0, 100);
  const health = clamp(Number(status && status.health || 0), 0, 100);

  const waterLow = computeLowerBandSeverity(water, 44, 34, 18);
  const waterHigh = computeUpperBandSeverity(water, 88, 94, 98, 100);
  const nutritionLow = computeLowerBandSeverity(nutrition, 46, 34, 18);
  const nutritionHigh = computeUpperBandSeverity(nutrition, 78, 84, 92, 100);
  const stressHigh = computeUpperBandSeverity(stress, 32, 50, 72, 96);
  const riskHigh = computeUpperBandSeverity(risk, 30, 48, 70, 92);
  const healthLow = computeLowerBandSeverity(health, 58, 44, 24);

  const envVpdSeverity = clamp(Number(envModel && envModel.stressFactor && envModel.stressFactor.vpd) || 0, 0, 1);
  const envTempSeverity = clamp(Number(envModel && envModel.stressFactor && envModel.stressFactor.temp) || 0, 0, 1);
  const envHumiditySeverity = clamp(Number(envModel && envModel.stressFactor && envModel.stressFactor.humidity) || 0, 0, 1);
  const envAirflowSeverity = clamp(Number(envModel && envModel.stressFactor && envModel.stressFactor.airflow) || 0, 0, 1);
  const envSeverity = clamp(
    (envTempSeverity * 0.28)
    + (envHumiditySeverity * 0.2)
    + (envVpdSeverity * 0.34)
    + (envAirflowSeverity * 0.18),
    0,
    1.25
  );

  const rootPhSeverity = clamp(Number(rootModel && rootModel.stressFactor && rootModel.stressFactor.ph) || 0, 0, 1);
  const rootEcSeverity = clamp(Number(rootModel && rootModel.stressFactor && rootModel.stressFactor.ec) || 0, 0, 1);
  const rootOxygenSeverity = clamp(Number(rootModel && rootModel.stressFactor && rootModel.stressFactor.oxygen) || 0, 0, 1);
  const rootSeverity = clamp(
    (rootPhSeverity * 0.34)
    + (rootEcSeverity * 0.34)
    + (rootOxygenSeverity * 0.32),
    0,
    1.25
  );

  const uptakeConstraint = clamp(
    (rootSeverity * 0.54)
    + (envSeverity * 0.18)
    + (waterLow * 0.28)
    + (waterHigh * 0.18),
    0,
    1.3
  );
  const growthBrake = clamp((1 - growthSpeedMultiplier) / 0.9, 0, 1.3);
  const dominantSource = [
    { score: waterLow + (waterHigh * 0.9), text: waterLow >= waterHigh ? 'der Wasserlage' : 'der Wurzelzone' },
    { score: nutritionLow + (nutritionHigh * 0.85), text: 'der Versorgung' },
    { score: envSeverity, text: 'dem Klima' },
    { score: rootSeverity, text: 'der Wurzelzone' }
  ].sort((left, right) => right.score - left.score)[0];

  const issues = [];

  if (waterLow >= 0.12) {
    issues.push(buildDiagnosticIssue({
      id: 'water_deficit',
      family: 'watering',
      score: (waterLow * 62) + (uptakeConstraint * 18) + (stressHigh * 10),
      title: 'Wasser limitiert die Aufnahme',
      cause: envSeverity >= 0.28
        ? 'Das Medium läuft trocken und das Klima zieht zusätzlich an der Pflanze.'
        : 'Die kurzfristige Versorgung reicht nicht mehr sauber für Uptake und Stabilität.',
      effect: 'Nährstoffaufnahme wird unruhiger und Stress baut schneller auf.',
      recommendation: 'Erst die Wasserversorgung beruhigen, bevor du weiter optimierst.',
      limit: 'Mehr Schub bringt hier wenig, solange die Pflanze zu trocken läuft.'
    }));
  }

  if (waterHigh >= 0.16) {
    issues.push(buildDiagnosticIssue({
      id: 'waterlogging',
      family: 'watering',
      score: (waterHigh * 58) + (rootOxygenSeverity * 24) + (riskHigh * 10),
      title: 'Zu viel Feuchte drückt die Wurzelzone',
      cause: rootOxygenSeverity >= 0.25
        ? 'Die Wurzelzone verliert Sauerstoff und bleibt zu schwer.'
        : 'Das Medium ist noch zu feucht und trocknet nicht sauber zurück.',
      effect: 'Aufnahme läuft träge und Risiko steigt leichter an.',
      recommendation: 'Jetzt eher Stabilität und Rücktrocknung zulassen als weiter nachzulegen.',
      limit: 'Begleitdruck lässt sich mindern, aber die nasse Ursache löst sich nicht sofort.'
    }));
  }

  if (nutritionLow >= 0.12) {
    issues.push(buildDiagnosticIssue({
      id: uptakeConstraint >= 0.32 ? 'nutrient_uptake_limited' : 'nutrient_deficit',
      family: 'fertilizing',
      score: (nutritionLow * 58) + (uptakeConstraint * 22) + (growthBrake * 12),
      title: uptakeConstraint >= 0.32 ? 'Versorgung kommt nicht sauber an' : 'Versorgung wird zu knapp',
      cause: uptakeConstraint >= 0.32
        ? 'Die Pflanze bräuchte mehr Versorgung, nimmt sie unter dem aktuellen Wurzel- oder Wasserdruck aber nur begrenzt auf.'
        : 'Das Nährstoffniveau trägt Stoffwechsel und Wachstum nicht mehr stabil genug.',
      effect: 'Tempo fällt weg und Stress reagiert empfindlicher auf weitere Abweichungen.',
      recommendation: 'Versorgung nur zusammen mit sauberer Aufnahme stabilisieren.',
      limit: 'Härter nachzulegen lohnt wenig, wenn die Wurzelzone noch bremst.'
    }));
  }

  if (nutritionHigh >= 0.18 || rootEcSeverity >= 0.24) {
    issues.push(buildDiagnosticIssue({
      id: 'nutrient_pressure',
      family: 'fertilizing',
      score: (nutritionHigh * 56) + (rootEcSeverity * 26) + (riskHigh * 10),
      title: 'Zu viel Druck in der Wurzelzone',
      cause: rootEcSeverity >= 0.24
        ? 'EC- und Salzlast drücken die Aufnahme bereits sichtbar.'
        : 'Die Versorgung ist schon sehr voll und lässt wenig Puffer für weitere Eingriffe.',
      effect: 'Uptake wird rauer, Stress steigt leichter und aggressive Pushes kippen schneller um.',
      recommendation: 'Druck erst herausnehmen oder beruhigen, nicht weiter aufbauen.',
      limit: 'Mehr Feed löst hier selten das Kernproblem.'
    }));
  }

  if (envSeverity >= 0.18) {
    const climateCause = envVpdSeverity >= Math.max(envTempSeverity, envHumiditySeverity, envAirflowSeverity)
      ? 'Das Klima liegt spürbar neben der VPD-Komfortzone.'
      : (envAirflowSeverity >= Math.max(envTempSeverity, envHumiditySeverity)
        ? 'Luftstrom und Feuchte arbeiten nicht sauber zusammen.'
        : 'Das Klima liegt nicht stabil genug in der Komfortzone.');
    issues.push(buildDiagnosticIssue({
      id: 'climate_pressure',
      family: 'environment',
      score: (envSeverity * 60) + (waterLow * 16) + (riskHigh * 8),
      title: 'Das Klima erzeugt Zusatzdruck',
      cause: climateCause,
      effect: 'Wasserverbrauch, Stress und Erholung laufen dadurch spürbar schlechter zusammen.',
      recommendation: 'Erst Klima und Rhythmus ruhiger bekommen, dann wieder optimieren.',
      limit: 'Reine Feed- oder Push-Maßnahmen greifen hier oft stumpfer als gedacht.'
    }));
  }

  if (rootSeverity >= 0.18) {
    const rootCause = rootOxygenSeverity >= Math.max(rootPhSeverity, rootEcSeverity)
      ? 'Die Wurzelzone reagiert empfindlich auf Sauerstoff- und Feuchteverteilung.'
      : (rootEcSeverity >= rootPhSeverity
        ? 'EC-Druck stört die Aufnahme in der Wurzelzone.'
        : 'Die pH-Lage bringt die Aufnahme aus dem Tritt.');
    issues.push(buildDiagnosticIssue({
      id: 'root_zone_pressure',
      family: 'environment',
      score: (rootSeverity * 62) + (uptakeConstraint * 18) + (nutritionLow * 10),
      title: 'Die Wurzelzone bremst die Effizienz',
      cause: rootCause,
      effect: 'Versorgung kommt ungleichmäßig an und Maßnahmen greifen weniger sauber.',
      recommendation: 'Stabilisierung wirkt hier besser als aggressive Korrektur.',
      limit: 'Mehr Input ist nicht automatisch mehr Wirkung, solange die Wurzelzone blockiert.'
    }));
  }

  if (stressHigh >= 0.16) {
    issues.push(buildDiagnosticIssue({
      id: 'stress_load',
      family: 'stress',
      score: (stressHigh * 58) + (growthBrake * 16) + (healthLow * 10),
      title: 'Belastung hält die Pflanze klein',
      cause: `Die Pflanze reagiert aktuell vor allem auf ${dominantSource && dominantSource.text ? dominantSource.text : 'mehrere gleichzeitige Druckfaktoren'}.`,
      effect: 'Erholung, Uptake und Wachstum bleiben unter Druck, selbst wenn Einzelwerte nicht komplett abstürzen.',
      recommendation: 'Jetzt zuerst stabilisieren; aggressive Pushes werden gerade schlechter verwertet.',
      limit: 'Kurze Entlastung hilft, aber echte Recovery braucht etwas ruhige Zeit.'
    }));
  }

  if (riskHigh >= 0.16) {
    issues.push(buildDiagnosticIssue({
      id: 'risk_exposure',
      family: 'risk',
      score: (riskHigh * 60) + (stressHigh * 12) + (envSeverity * 10),
      title: 'Exposition baut sich auf',
      cause: 'Anhaltende oder kombinierte Belastung hat den Gefahrenpuffer bereits sichtbar gefüllt.',
      effect: 'Das System verzeiht weniger und der Ereignisdruck zieht mit der Zeit leichter an.',
      recommendation: 'Druck schrittweise abbauen statt noch mehr Tempo zu erzwingen.',
      limit: 'Risiko fällt langsamer als Stress und braucht deshalb eher ruhige Stabilisierung.'
    }));
  }

  if (growthBrake >= 0.18 && (waterLow >= 0.08 || nutritionLow >= 0.08 || envSeverity >= 0.12 || rootSeverity >= 0.12 || stressHigh >= 0.1)) {
    issues.push(buildDiagnosticIssue({
      id: 'growth_brake',
      family: 'growth',
      score: (growthBrake * 56) + (stressHigh * 10) + (nutritionLow * 10),
      title: 'Wachstum läuft unter Basis',
      cause: `Der aktuelle Bremsfaktor sitzt vor allem bei ${dominantSource && dominantSource.text ? dominantSource.text : 'mehreren kleinen Limitierungen'}.`,
      effect: `Das Wachstumstempo liegt gerade nur bei etwa ${round2(growthSpeedMultiplier)}x der Basis.`,
      recommendation: 'Den größten Bremsfaktor beruhigen, statt Wachstum direkt erzwingen zu wollen.',
      limit: 'Mehr Schub fühlt sich erst wieder gut an, wenn die Hauptlimitierung sauberer läuft.'
    }));
  }

  if (!issues.length) {
    issues.push(buildDiagnosticIssue({
      id: 'stable_state',
      family: 'optimize',
      score: 18,
      title: 'Das Setup läuft ruhig',
      cause: 'Versorgung, Klima und Wurzelzone greifen aktuell sauber genug zusammen.',
      effect: `Das Wachstum läuft bei etwa ${round2(growthSpeedMultiplier)}x der Basis.`,
      recommendation: growthSpeedMultiplier >= 1.1
        ? 'Kleine Optimierungsschritte können lohnend sein, aggressive Pushes sind aber nicht nötig.'
        : 'Den Rhythmus halten und nur auf klare Abweichungen reagieren.',
      limit: 'Mehr Eingriffe erzeugen hier nicht automatisch mehr Fortschritt.'
    }));
  }

  const sortedIssues = issues
    .sort((left, right) => right.score - left.score)
    .filter((issue, index, list) => list.findIndex((entry) => entry.id === issue.id) === index)
    .slice(0, 5);

  return {
    primaryIssue: sortedIssues[0] && sortedIssues[0].id !== 'stable_state' ? sortedIssues[0] : null,
    secondaryIssues: sortedIssues[0] && sortedIssues[0].id !== 'stable_state' ? sortedIssues.slice(1, 3) : [],
    allIssues: sortedIssues,
    contributingFactors: sortedIssues.slice(0, 3).map((issue) => issue.cause),
    envModel,
    rootModel,
    growthSpeedMultiplier: round2(growthSpeedMultiplier),
    summary: sortedIssues[0] ? sortedIssues[0].title : 'Stabil'
  };
}

function buildGuidanceHints(diagnostics = computePlantDiagnostics()) {
  const issues = Array.isArray(diagnostics && diagnostics.allIssues) ? diagnostics.allIssues : [];
  const hints = [];
  const usedFamilies = new Set();

  for (const issue of issues) {
    if (!issue || usedFamilies.has(issue.family)) {
      continue;
    }

    let tone = 'stabilize';
    let title = 'Stabilisieren';
    if (issue.family === 'risk') {
      tone = 'caution';
      title = 'Risiko steigt';
    } else if (issue.family === 'optimize') {
      tone = 'optimize';
      title = 'Optimieren';
    } else if (issue.family === 'growth') {
      tone = 'optimize';
      title = 'Tempo zurückholen';
    } else if (issue.family === 'environment') {
      tone = 'stabilize';
      title = 'Umfeld beruhigen';
    } else if (issue.family === 'stress') {
      tone = 'caution';
      title = 'Druck senken';
    }

    hints.push({
      id: issue.id,
      tone,
      title,
      body: String(issue.recommendation || issue.cause || '').trim(),
      severity: String(issue.severity || diagnosticsSeverityBand(issue.score))
    });
    usedFamilies.add(issue.family);
    if (hints.length >= 3) {
      break;
    }
  }

  return hints;
}

function applyStatusDrift(elapsedMs, options = {}) {
  const minutesRaw = elapsedMs / 60_000;
  const offlineCatchUp = Boolean(options.offlineCatchUp) || elapsedMs > SIM_RUNTIME_MAX_ELAPSED_PER_TICK_MS;
  const minutes = minutesRaw;
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
  const setup = state.setup && typeof state.setup === 'object' ? state.setup : {};
  const genetics = String(setup.genetics || 'hybrid');
  const medium = String(setup.medium || 'soil');
  const light = String(setup.light || 'medium');
  const geneticsStressModifier = genetics === 'indica' ? 0.76 : (genetics === 'sativa' ? 1.18 : 1);
  const geneticsHealthModifier = genetics === 'indica' ? 1.14 : (genetics === 'sativa' ? 0.93 : 1);
  const geneticsGrowthModifier = genetics === 'indica' ? 0.84 : (genetics === 'sativa' ? 1.16 : 1);
  const geneticsWaterModifier = genetics === 'indica' ? 0.94 : (genetics === 'sativa' ? 1.12 : 1);
  const geneticsNutritionModifier = genetics === 'indica' ? 0.96 : (genetics === 'sativa' ? 1.1 : 1);
  const geneticsPressureModifier = genetics === 'indica' ? 0.86 : (genetics === 'sativa' ? 1.1 : 1);
  const mediumWaterModifier = medium === 'coco' ? 1.22 : 1;
  const mediumNutritionModifier = medium === 'coco' ? 1.14 : 1;
  const mediumGrowthModifier = medium === 'coco' ? 1.08 : 1;
  const mediumPressureModifier = medium === 'coco' ? 1.08 : 1;
  const lightWaterModifier = light === 'high' ? 1.22 : 1;
  const lightNutritionModifier = light === 'high' ? 1.18 : 1;
  const lightGrowthModifier = light === 'high' ? 1.16 : 1;
  const lightPressureModifier = light === 'high' ? 1.12 : 1;

  const stageIndexOneBased = clampInt(Number(state.plant.stageIndex || 0) + 1, 1, 12);
  const stagePressure = clamp((stageIndexOneBased - 1) / 11, 0, 1);
  const earlyPhaseRelief = 0.8 + (stagePressure * 0.2);
  const envInfluence = 0.78 + (stagePressure * 0.34);
  const rootInfluence = 0.76 + (stagePressure * 0.38);

  const passiveMetabolism = getPassiveMetabolismContext(minutes, envModel, rootModel, { offlineCatchUp });
  const uptakePenalty = passiveMetabolism.uptakePenalty;
  const hours = minutes / 60;

  state.status.water -= passiveMetabolism.waterDrain * mediumWaterModifier * geneticsWaterModifier * lightWaterModifier;
  state.status.nutrition -= passiveMetabolism.nutritionDrain * mediumNutritionModifier * geneticsNutritionModifier * lightNutritionModifier;

  const waterSeverity = computeLowerBandSeverity(state.status.water, 34, 24, WATER_CRITICAL_THRESHOLD);
  const waterCritical = clamp((WATER_CRITICAL_THRESHOLD - state.status.water) / Math.max(1, WATER_CRITICAL_THRESHOLD), 0, 1);
  const nutritionSeverity = computeLowerBandSeverity(state.status.nutrition, 32, 22, NUTRITION_CRITICAL_THRESHOLD);
  const nutritionCritical = clamp((NUTRITION_CRITICAL_THRESHOLD - state.status.nutrition) / Math.max(1, NUTRITION_CRITICAL_THRESHOLD), 0, 1);
  const envSeverity = computeUpperBandSeverity(envStress, 0.18, 0.42, 0.9, 1.35);
  const rootSeverity = computeUpperBandSeverity(rootStress, 0.16, 0.4, 0.88, 1.3);
  const waterSaturationSeverity = computeUpperBandSeverity(state.status.water, 96, 98, 99.2, 100);

  const moderateSignalCount = [waterSeverity, nutritionSeverity, envSeverity, rootSeverity].filter((value) => value >= 0.28).length;
  const combinedStressBonus = moderateSignalCount >= 2
    ? 0.12 + ((moderateSignalCount - 2) * 0.08)
    : 0;
  const stressSignal = clamp(
    (waterSeverity * 0.32)
    + (nutritionSeverity * 0.2)
    + (envSeverity * 0.27 * envInfluence)
    + (rootSeverity * 0.21 * rootInfluence)
    + combinedStressBonus,
    0,
    1.4
  );
  const baseStressRecoveryReadiness = computeStressRecoveryReadiness(state.status, envStress, rootStress);
  const stressRecoveryReadiness = clamp(
    baseStressRecoveryReadiness - (combinedStressBonus * 0.9) - (Math.max(envSeverity, rootSeverity) * 0.12),
    0,
    1
  );
  const usableRecovery = clamp((stressRecoveryReadiness - 0.32) / 0.68, 0, 1);
  const strongRecovery = clamp((stressRecoveryReadiness - 0.58) / 0.42, 0, 1);

  const currentStressExposure = Number(state.simulation.stressExposure) || 0;
  const nextStressExposure = moveExposureToward(
    currentStressExposure,
    stressSignal,
    hours,
    STRESS_EXPOSURE_RISE_PER_HOUR,
    STRESS_EXPOSURE_FALL_PER_HOUR
  );
  state.simulation.stressExposure = nextStressExposure;

  const stressRise = clamp((nextStressExposure - 0.04) / 0.96, 0, 1) * 7.2 * hours * earlyPhaseRelief;
  const stressRecoverySuppression = clamp(1 - (stressSignal * 0.9), 0.15, 1);
  const stressRecovery = (0.12 + (usableRecovery * 0.84) + (strongRecovery * 1.2)) * stressRecoverySuppression * hours;
  let stressDelta = stressRise - stressRecovery;
  if (stressDelta > 0) {
    stressDelta = Math.min(stressDelta, STRESS_RISE_CAP_PER_HOUR * hours);
  }
  state.status.stress += stressDelta * geneticsStressModifier * geneticsPressureModifier * mediumPressureModifier * lightPressureModifier;

  const elevatedStressPressure = clamp((state.status.stress - 58) / 32, 0, 1);
  const severeSignalCount = [waterSeverity, nutritionSeverity, envSeverity, rootSeverity].filter((value) => value >= 0.42).length;
  const moderateHazardBonus = moderateSignalCount >= 2
    ? 0.08 + ((moderateSignalCount - 2) * 0.05)
    : 0;
  const extremePressure = clamp(
    Math.max(waterCritical, nutritionCritical, envSeverity >= 0.8 ? envSeverity : 0, rootSeverity >= 0.8 ? rootSeverity : 0, waterSaturationSeverity * 0.9),
    0,
    1
  );
  const combinedHazard = clamp(
    ((severeSignalCount >= 2 ? 0.18 + ((severeSignalCount - 2) * 0.14) : 0))
    + moderateHazardBonus
    + (extremePressure * 0.48)
    + (clamp((nextStressExposure - 0.35) / 0.65, 0, 1) * 0.22)
    + (elevatedStressPressure * 0.16),
    0,
    1.35
  );
  const currentRiskExposure = Number(state.simulation.riskExposure) || 0;
  const nextRiskExposure = moveExposureToward(
    currentRiskExposure,
    combinedHazard,
    hours,
    RISK_EXPOSURE_RISE_PER_HOUR,
    RISK_EXPOSURE_FALL_PER_HOUR
  );
  state.simulation.riskExposure = nextRiskExposure;

  const riskRecoveryReadiness = clamp((stressRecoveryReadiness * 0.85) - (extremePressure * 0.15), 0, 1);
  const riskRise = clamp((nextRiskExposure - 0.02) / 0.98, 0, 1) * 2.5 * hours * earlyPhaseRelief;
  const combinedRiskRise = clamp((combinedHazard - 0.18) / 0.82, 0, 1) * 0.58 * hours * earlyPhaseRelief;
  const riskRecoverySuppression = clamp(1 - (combinedHazard * 0.8), 0.2, 1);
  const riskRecovery = (0.015 + (clamp((riskRecoveryReadiness - 0.66) / 0.34, 0, 1) * 0.2)) * riskRecoverySuppression * hours;
  let riskDelta = riskRise + combinedRiskRise - riskRecovery;
  if (moderateHazardBonus > 0 && nextRiskExposure > 0.1) {
    riskDelta += moderateHazardBonus * 0.42 * hours;
  }
  if (extremePressure >= 0.75) {
    riskDelta += 0.42 * hours;
  }
  if (riskRecoveryReadiness > 0.72 && combinedHazard < 0.2) {
    riskDelta -= clamp((riskRecoveryReadiness - 0.72) / 0.28, 0, 1) * 0.85 * hours;
  }
  if (riskDelta > 0) {
    riskDelta = Math.min(riskDelta, RISK_RISE_CAP_PER_HOUR * hours);
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
  if (stressRecoveryReadiness >= 0.68 && state.status.risk <= 50) {
    healthDelta += 0.16 * minutes * (0.75 + (strongRecovery * 0.35));
  }
  if (state.status.water < 12) {
    healthDelta -= 0.06 * minutes;
  }
  state.status.health += healthDelta * geneticsHealthModifier;

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

  const growthSpeedMultiplier = computeGrowthSpeedMultiplier(state, { envModel, rootModel, envStress, rootStress });
  state.simulation.growthImpulse = clamp((growthSpeedMultiplier - 1) * 4, -3, 3);
  state.simulation.tempoOffsetDays = 0;

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

  const growthSpeedMultiplier = computeGrowthSpeedMultiplier(state);
  const simEpochMs = Number(state.simulation.simEpochMs) || 0;
  const simTimeMs = Math.max(simEpochMs, Number(state.simulation.simTimeMs) || simEpochMs);
  const baseElapsedPlantMs = Math.max(0, simTimeMs - simEpochMs);
  const currentProgressOffsetSimMs = Number(state.plant.progressOffsetSimMs) || 0;
  const scaledProgressDeltaSimMs = (Number(elapsedSimMs) || 0) * (growthSpeedMultiplier - 1);
  state.plant.progressOffsetSimMs = clamp(
    currentProgressOffsetSimMs + scaledProgressDeltaSimMs,
    -baseElapsedPlantMs,
    TOTAL_LIFECYCLE_SIM_MS - baseElapsedPlantMs
  );
  state.simulation.growthImpulse = clamp((growthSpeedMultiplier - 1) * 4, -3, 3);
  state.simulation.tempoOffsetDays = 0;

  const plantTime = getPlantTimeFromElapsed();
  const stage = getCurrentStage(plantTime.simDay);

  state.plant.stageIndex = stage.stageIndex;
  state.plant.phase = stage.current.phase;
  state.plant.stageKey = stageAssetKeyForIndex(stage.stageIndex);
  state.plant.lastValidStageKey = state.plant.stageKey;
  state.plant.stageProgress = stage.progressInPhase;
  state.status.growth = round2(computeGrowthPercent());

  if (window.GrowSimProgression && typeof window.GrowSimProgression.shouldAutoFinalizeHarvest === 'function'
    && window.GrowSimProgression.shouldAutoFinalizeHarvest(state)
    && typeof window.__gsFinalizeRun === 'function') {
    window.__gsFinalizeRun('harvest');
  }

  if (state.debug.enabled && state.debug.showInternalTicks && state.simulation.tickCount % CONFIG.logTickEveryNTicks === 0) {
    console.debug('[growth]', {
      tick: state.simulation.tickCount,
      simTimeMs: state.simulation.simTimeMs,
      oldGrowth: round2(prevGrowth),
      newGrowth: state.status.growth,
      growthSpeedMultiplier: round2(growthSpeedMultiplier),
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
  if (state.run && state.run.status === 'active' && state.run.finalizedAtRealMs == null) {
    state.run.status = 'downed';
  }
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
  if (state.run && state.run.status === 'ended' && state.run.finalizedAtRealMs != null && Number.isFinite(Number(state.run.finalizedAtRealMs))) {
    state.ui.deathOverlayOpen = false;
    state.ui.deathOverlayAcknowledged = true;
    return false;
  }

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
    if (state.run && state.run.status === 'downed' && state.run.finalizedAtRealMs == null) {
      state.run.status = 'active';
    }
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
  if (state.run && state.run.status === 'active' && state.run.finalizedAtRealMs == null) {
    state.run.status = 'downed';
  }
  return true;
}

function getElapsedRealMsSinceRunStart(nowMs) {
  const startMs = Number(state.simulation.startRealTimeMs);
  const safeStartMs = Number.isFinite(startMs) ? startMs : nowMs;
  return clamp(nowMs - safeStartMs, 0, REAL_RUN_DURATION_MS);
}

function getTotalRunProgress() {
  return getPlantTimeFromElapsed().totalRunProgress;
}

function getPlantTimeFromElapsed() {
  const simEpochMs = Number(state.simulation.simEpochMs) || alignToSimStartHour(getRealNowMs(), SIM_RUNTIME_START_HOUR);
  const simTimeMs = Math.max(simEpochMs, Number(state.simulation.simTimeMs) || simEpochMs);
  const baseElapsedPlantMs = Math.max(0, simTimeMs - simEpochMs);
  const progressOffsetSimMs = Number(state.plant && state.plant.progressOffsetSimMs) || 0;
  const elapsedPlantMs = clamp(baseElapsedPlantMs + progressOffsetSimMs, 0, TOTAL_LIFECYCLE_SIM_MS);

  return {
    totalRunProgress: clamp(elapsedPlantMs / TOTAL_LIFECYCLE_SIM_MS, 0, 1),
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

function computeGrowthPercent() {
  if (state.plant.phase === 'dead') {
    return 0;
  }
  return round2((getPlantTimeFromElapsed().simDay / TOTAL_LIFECYCLE_SIM_DAYS) * 100);
}

function computeStageProgress(simDay, stageIndex) {
  const snapshot = getCurrentStage(simDay);
  if (clampInt(stageIndex, 0, snapshot.timeline.length - 1) !== snapshot.stageIndex) {
    return snapshot.progressInPhase;
  }
  return snapshot.progressInPhase;
}

function getDayNightIcon() {
  return state.simulation.isDaytime ? 'â˜€ï¸' : 'ðŸŒ™';
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
  return `BlÃ¼tetag ${bloomDay}`;
}

function formatPhaseProgressLabel(progressPercent, nextLabel) {
  const targetLabel = nextLabel || 'Ernte';
  return `${progressPercent}% \u2192 ${targetLabel}`;
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
  // Pflanzenwerte nur leicht anstoÃŸen (kein vollstÃ¤ndiger 30-Minuten-Simulationssprung).
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

  addLog('action', 'Ereignis-Boost angewendet (Event-Timer -30 Min, Pflanze leicht angestoÃŸen)', {
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
    addLog('system', 'TÃ¤glicher Boost-ZÃ¤hler zurÃ¼ckgesetzt', { dayStamp: currentStamp });
  }
}

function dayStamp(timestampMs) {
  const d = new Date(timestampMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function onBoostAction() {
  if (isPlantDead()) {
    addLog('action', 'Boost blockiert: Pflanze ist eingegangen', null);
    renderAll();
    return;
  }

  activateSpeedBoost(Date.now());
  renderAll();
  schedulePersistState(true);
}

function activateSpeedBoost(nowMs = getRealNowMs()) {
  const safeNowMs = Number.isFinite(Number(nowMs)) ? Number(nowMs) : getRealNowMs();
  advanceSimulationTime(safeNowMs, {
    reason: 'boost_sync',
    suppressLogs: true
  });

  const remainingBoostMs = getRemainingBoostMs(safeNowMs);
  const nextRemainingBoostMs = Math.min(BOOST_MAX_REMAINING_REAL_MS, remainingBoostMs + BOOST_DURATION_REAL_MS);
  const previousBoostActive = remainingBoostMs > 0;

  state.boost.boostEndsAtMs = safeNowMs + nextRemainingBoostMs;
  updateEffectiveSpeedState(safeNowMs, {
    previousBoostActive,
    reason: previousBoostActive ? 'boost_extend' : 'boost_start'
  });

  addLog('action', previousBoostActive ? 'Zeit-Boost verlÃ¤ngert' : 'Zeit-Boost aktiviert', {
    boostEndsAtMs: state.boost.boostEndsAtMs,
    remainingBoostMs: nextRemainingBoostMs,
    effectiveSpeed: getEffectiveSimulationSpeed(safeNowMs)
  });
  syncCanonicalStateShape();

  if (typeof schedulePersistState === 'function') {
    schedulePersistState(true);
  }

  return state.boost.boostEndsAtMs;
}

function setBaseSimulationSpeed(value, nowMs = getRealNowMs()) {
  const safeNowMs = Number.isFinite(Number(nowMs)) ? Number(nowMs) : getRealNowMs();
  const nextBaseSpeed = normalizeBaseSimulationSpeed(value);
  const previousBaseSpeed = normalizeBaseSimulationSpeed(state.simulation.baseSpeed);

  advanceSimulationTime(safeNowMs, {
    reason: 'base_speed_sync',
    suppressLogs: true
  });

  state.simulation.baseSpeed = nextBaseSpeed;
  if (state.settings && state.settings.gameplay && typeof state.settings.gameplay === 'object') {
    state.settings.gameplay.simSpeed = nextBaseSpeed;
  }
  addLog('system', 'Basis-Simulationsgeschwindigkeit geÃ¤ndert', {
    from: previousBaseSpeed,
    to: nextBaseSpeed
  });
  updateEffectiveSpeedState(safeNowMs, {
    previousBoostActive: isSpeedBoostActive(safeNowMs),
    reason: 'base_speed_change'
  });
  syncCanonicalStateShape();

  if (typeof schedulePersistState === 'function') {
    schedulePersistState(true);
  }

  return nextBaseSpeed;
}

function resetBoostDaily(nowMs) {
  const currentStamp = dayStamp(nowMs);
  if (state.boost.dayStamp !== currentStamp) {
    state.boost.dayStamp = currentStamp;
    state.boost.boostUsedToday = 0;
  }
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
  return hour >= SIM_RUNTIME_DAY_START_HOUR && hour < SIM_RUNTIME_NIGHT_START_HOUR;
}

function nextDaytimeRealMs(realNowMs, simTimeMs) {
  const simDate = new Date(simTimeMs);
  const shifted = new Date(simDate.getTime());

  if (simHour(simTimeMs) >= SIM_RUNTIME_NIGHT_START_HOUR) {
    shifted.setDate(shifted.getDate() + 1);
  }

  shifted.setHours(SIM_RUNTIME_DAY_START_HOUR, 0, 0, 0);
  const simDeltaMs = Math.max(0, shifted.getTime() - simTimeMs);
  const realDeltaMs = convertSimDeltaToFutureRealDeltaMs(simDeltaMs, realNowMs);
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
    state.simulation.simTimeMs = alignToSimStartHour(nowMs, SIM_RUNTIME_START_HOUR);
  }
  state.simulation.isDaytime = isDaytimeAtSimTime(state.simulation.simTimeMs);
  if (!Number.isFinite(state.simulation.lastTickRealTimeMs)) {
    state.simulation.lastTickRealTimeMs = nowMs;
  }
}

function repairRuntimeTextEncoding(value) {
  const api = typeof window !== 'undefined' ? window.GrowSimTextEncoding : null;
  return api && typeof api.deepRepairMojibake === 'function'
    ? api.deepRepairMojibake(value)
    : value;
}

async function loadEventCatalog() {
  const catalogs = [];

  try {
    const v1 = await fetch(`./data/events.json?v=${EVENTS_CATALOG_VERSION}`, { cache: 'no-store' });
    if (v1.ok) {
      const payload = repairRuntimeTextEncoding(await v1.json());
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
      const payload = repairRuntimeTextEncoding(await v2.json());
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
      title: 'Bodenfeuchte prÃ¼fen',
      description: 'Bei der manuellen Kontrolle wurde ungleichmÃ¤ÃŸige Feuchte festgestellt.',
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

    const payload = repairRuntimeTextEncoding(await response.json());
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

