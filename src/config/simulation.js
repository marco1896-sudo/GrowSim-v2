'use strict';

(function attachGrowSimSimulationConfig(rootScope) {
  const SIM_SPEED_OPTIONS = Object.freeze([4, 8, 12, 16]);
  const DEFAULT_BASE_SIM_SPEED = 12;
  const BOOST_SIM_SPEED = 24;
  const UI_TICK_INTERVAL_MS = 1000;
  const EVENT_ROLL_MIN_REAL_MS = 30 * 60 * 1000;
  const EVENT_ROLL_MAX_REAL_MS = 90 * 60 * 1000;
  const EVENT_COOLDOWN_MS = 20 * 60 * 1000;
  const SIM_DAY_START_HOUR = 6;
  const SIM_NIGHT_START_HOUR = 22;
  const SIM_START_HOUR = 8;
  const SIM_GLOBAL_SEED = 'grow-sim-v1-seed';
  const SIM_PLANT_ID = 'plant-001';
  const MAX_ELAPSED_PER_TICK_MS = 5000;
  const MAX_OFFLINE_SIM_MS = 8 * 60 * 60 * 1000;
  const LARGE_TIME_JUMP_LOG_MS = 60 * 1000;
  const FREEZE_SIM_ON_DEATH = true;
  const MODE = 'prod';

  function normalizeBaseSimulationSpeed(value) {
    const numericValue = Number(value);
    return SIM_SPEED_OPTIONS.includes(numericValue) ? numericValue : DEFAULT_BASE_SIM_SPEED;
  }

  function alignToSimStartHour(realNowMs, startHour = SIM_START_HOUR) {
    const baseDate = new Date(Number.isFinite(Number(realNowMs)) ? Number(realNowMs) : Date.now());
    const alignedDate = new Date(baseDate);
    alignedDate.setHours(Number.isFinite(Number(startHour)) ? Number(startHour) : SIM_START_HOUR, 0, 0, 0);
    if (baseDate.getHours() < (Number.isFinite(Number(startHour)) ? Number(startHour) : SIM_START_HOUR)) {
      alignedDate.setDate(alignedDate.getDate() - 1);
    }
    return alignedDate.getTime();
  }

  const config = Object.freeze({
    MODE,
    UI_TICK_INTERVAL_MS,
    EVENT_ROLL_MIN_REAL_MS,
    EVENT_ROLL_MAX_REAL_MS,
    EVENT_COOLDOWN_MS,
    DEFAULT_BASE_SIM_SPEED,
    SIM_SPEED_OPTIONS,
    BOOST_SIM_SPEED,
    SIM_DAY_START_HOUR,
    SIM_NIGHT_START_HOUR,
    SIM_START_HOUR,
    SIM_GLOBAL_SEED,
    SIM_PLANT_ID,
    MAX_ELAPSED_PER_TICK_MS,
    MAX_OFFLINE_SIM_MS,
    LARGE_TIME_JUMP_LOG_MS,
    FREEZE_SIM_ON_DEATH,
    normalizeBaseSimulationSpeed,
    alignToSimStartHour
  });

  rootScope.GrowSimSimulationConfig = config;
})(typeof window !== 'undefined' ? window : globalThis);
