'use strict';

(function initEventShared(globalScope) {
  const DEFAULT_ENVIRONMENT_CONTROLS = Object.freeze({
    temperatureC: 24,
    humidityPercent: 58,
    airflowPercent: 55,
    ph: 6.0,
    ec: 1.4
  });

  function toFiniteNumber(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  function clamp(value, min, max) {
    const numeric = toFiniteNumber(value, min);
    return Math.max(min, Math.min(max, numeric));
  }

  function clampInt(value, min, max) {
    return Math.round(clamp(value, min, max));
  }

  function round2(value) {
    return Math.round(toFiniteNumber(value, 0) * 100) / 100;
  }

  function normalizeStringArray(values) {
    return Array.isArray(values) ? values.map((value) => String(value)).filter(Boolean) : [];
  }

  function buildEnvironmentReadout(stateLike) {
    const state = stateLike && typeof stateLike === 'object' ? stateLike : {};
    const controls = state.environmentControls && typeof state.environmentControls === 'object'
      ? state.environmentControls
      : DEFAULT_ENVIRONMENT_CONTROLS;
    const climate = state.climate && state.climate.tent && typeof state.climate.tent === 'object'
      ? state.climate.tent
      : {};
    const runtimeTelemetry = state.climate && state.climate.runtime && state.climate.runtime.eventTelemetry
      && typeof state.climate.runtime.eventTelemetry === 'object'
      ? state.climate.runtime.eventTelemetry
      : {};

    const temperatureC = clamp(
      toFiniteNumber(climate.temperatureC, toFiniteNumber(controls.temperatureC, DEFAULT_ENVIRONMENT_CONTROLS.temperatureC)),
      10,
      40
    );
    const humidityPercent = clampInt(
      toFiniteNumber(climate.humidityPercent, toFiniteNumber(controls.humidityPercent, DEFAULT_ENVIRONMENT_CONTROLS.humidityPercent)),
      0,
      100
    );
    const vpdKpa = round2(clamp(
      toFiniteNumber(
        climate.vpdKpa,
        0.7 + ((temperatureC - 21) * 0.08) + ((60 - humidityPercent) * 0.012)
      ),
      0.4,
      2.4
    ));
    const airflowScore = clampInt(
      toFiniteNumber(climate.airflowScore, toFiniteNumber(controls.airflowPercent, DEFAULT_ENVIRONMENT_CONTROLS.airflowPercent)),
      0,
      100
    );
    const instabilityScore = round2(clamp(
      toFiniteNumber(climate.instabilityScore, runtimeTelemetry.instabilityScore),
      0,
      100
    ));

    return {
      temperatureC,
      humidityPercent,
      vpdKpa,
      airflowScore,
      instabilityScore
    };
  }

  function buildRootZoneReadout(stateLike, environment) {
    const state = stateLike && typeof stateLike === 'object' ? stateLike : {};
    const controls = state.environmentControls && typeof state.environmentControls === 'object'
      ? state.environmentControls
      : DEFAULT_ENVIRONMENT_CONTROLS;
    const status = state.status && typeof state.status === 'object' ? state.status : {};
    const env = environment && typeof environment === 'object' ? environment : buildEnvironmentReadout(state);

    const nutrition = clamp(toFiniteNumber(status.nutrition, 0), 0, 100);
    const water = clamp(toFiniteNumber(status.water, 0), 0, 100);
    const risk = clamp(toFiniteNumber(status.risk, 0), 0, 100);

    const ph = round2(clamp(toFiniteNumber(controls.ph, DEFAULT_ENVIRONMENT_CONTROLS.ph), 5.0, 7.0));
    const ec = round2(clamp(toFiniteNumber(controls.ec, DEFAULT_ENVIRONMENT_CONTROLS.ec), 0.6, 2.8));
    const oxygenPercent = clampInt(92 - (water * 0.28) - (risk * 0.18), 32, 95);
    const healthPercent = clampInt(
      55 + (nutrition * 0.32) - (risk * 0.25) - ((toFiniteNumber(env.vpdKpa, 1.2) - 1.2) * 12),
      10,
      99
    );

    return {
      ph,
      ec,
      oxygenPercent,
      healthPercent
    };
  }

  function getStageIndexOneBased(stateLike) {
    const state = stateLike && typeof stateLike === 'object' ? stateLike : {};
    return clampInt(toFiniteNumber(state.plant && state.plant.stageIndex, 0) + 1, 1, 12);
  }

  function getStageProgress(stateLike) {
    const state = stateLike && typeof stateLike === 'object' ? stateLike : {};
    return clamp(toFiniteNumber(state.plant && state.plant.stageProgress, 0), 0, 1);
  }

  function getSimDay(stateLike) {
    const state = stateLike && typeof stateLike === 'object' ? stateLike : {};
    const simulation = state.simulation && typeof state.simulation === 'object' ? state.simulation : {};
    if (Number.isFinite(Number(simulation.simDay))) {
      return Math.max(0, Math.floor(Number(simulation.simDay)));
    }
    if (Number.isFinite(Number(simulation.simTimeMs))) {
      return Math.max(0, Math.floor(Number(simulation.simTimeMs) / (24 * 60 * 60 * 1000)));
    }
    return 0;
  }

  function buildShadowSnapshot(stateLike) {
    const state = stateLike && typeof stateLike === 'object' ? stateLike : {};
    const status = state.status && typeof state.status === 'object' ? state.status : {};
    const plant = state.plant && typeof state.plant === 'object' ? state.plant : {};
    const simulation = state.simulation && typeof state.simulation === 'object' ? state.simulation : {};
    const events = state.events && typeof state.events === 'object' ? state.events : {};
    const stageIndexOneBased = getStageIndexOneBased(state);
    const stageProgress = getStageProgress(state);
    const environment = buildEnvironmentReadout(state);
    const rootZone = buildRootZoneReadout(state, environment);

    return {
      status: {
        water: clamp(toFiniteNumber(status.water, 0), 0, 100),
        nutrition: clamp(toFiniteNumber(status.nutrition, 0), 0, 100),
        health: clamp(toFiniteNumber(status.health, 0), 0, 100),
        stress: clamp(toFiniteNumber(status.stress, 0), 0, 100),
        risk: clamp(toFiniteNumber(status.risk, 0), 0, 100),
        growth: clamp(toFiniteNumber(status.growth, 0), 0, 100)
      },
      plant: {
        phase: String(plant.phase || 'seedling'),
        stageIndexOneBased,
        stageProgress,
        plantSize: round2(clamp(((stageIndexOneBased - 1) * 8.5) + (stageProgress * 8.5), 0, 100)),
        rootMass: round2(clamp(((stageIndexOneBased - 1) * 8.2) + (stageProgress * 7.8), 0, 100))
      },
      simulation: {
        simDay: getSimDay(state),
        simTimeMs: toFiniteNumber(simulation.simTimeMs, 0),
        isDaytime: Boolean(simulation.isDaytime),
        tickCount: Math.max(0, Math.floor(toFiniteNumber(simulation.tickCount, 0)))
      },
      setup: state.setup && typeof state.setup === 'object' ? { ...state.setup } : {},
      environment,
      rootZone,
      events: {
        machineState: String(events.machineState || 'idle'),
        activeEventId: typeof events.activeEventId === 'string' ? events.activeEventId : null,
        activeCategory: String(events.activeCategory || 'generic')
      },
      history: {
        events: Array.isArray(events.history) ? events.history.slice() : []
      }
    };
  }

  function resolveField(snapshot, fieldPath) {
    if (!snapshot || !fieldPath) {
      return undefined;
    }

    if (fieldPath.startsWith('status.')) {
      return snapshot.status[fieldPath.split('.')[1]];
    }
    if (fieldPath === 'plant.stageIndex') return snapshot.plant.stageIndexOneBased;
    if (fieldPath === 'plant.stageKey') return snapshot.plant.phase;
    if (fieldPath === 'plant.size') return snapshot.plant.plantSize;
    if (fieldPath === 'plant.rootMass') return snapshot.plant.rootMass;
    if (fieldPath.startsWith('setup.')) return snapshot.setup[fieldPath.split('.')[1]];
    if (fieldPath === 'simulation.isDaytime') return snapshot.simulation.isDaytime;
    if (fieldPath === 'simulation.simDay') return snapshot.simulation.simDay;
    if (fieldPath === 'env.temperatureC') return snapshot.environment.temperatureC;
    if (fieldPath === 'env.humidityPercent') return snapshot.environment.humidityPercent;
    if (fieldPath === 'env.vpdKpa') return snapshot.environment.vpdKpa;
    if (fieldPath === 'env.airflowScore') return snapshot.environment.airflowScore;
    if (fieldPath === 'env.instabilityScore') return snapshot.environment.instabilityScore;
    if (fieldPath === 'root.ph') return snapshot.rootZone.ph;
    if (fieldPath === 'root.ec') return snapshot.rootZone.ec;
    if (fieldPath === 'root.oxygenPercent') return snapshot.rootZone.oxygenPercent;
    if (fieldPath === 'root.healthPercent') return snapshot.rootZone.healthPercent;
    return undefined;
  }

  function evaluateCondition(lhs, op, rhs) {
    if (op === 'in') return Array.isArray(rhs) && rhs.map(String).includes(String(lhs));
    if (op === 'not_in') return Array.isArray(rhs) && !rhs.map(String).includes(String(lhs));

    const leftNum = Number(lhs);
    const rightNum = Number(rhs);
    const numeric = Number.isFinite(leftNum) && Number.isFinite(rightNum);

    if (op === '==') return lhs === rhs || String(lhs) === String(rhs);
    if (op === '!=') return !(lhs === rhs || String(lhs) === String(rhs));
    if (!numeric) return false;
    if (op === '>') return leftNum > rightNum;
    if (op === '>=') return leftNum >= rightNum;
    if (op === '<') return leftNum < rightNum;
    if (op === '<=') return leftNum <= rightNum;
    return false;
  }

  function evaluateTriggerCondition(snapshot, condition) {
    if (!condition || typeof condition !== 'object') {
      return false;
    }
    const lhs = resolveField(snapshot, String(condition.field || '').trim());
    return evaluateCondition(lhs, String(condition.op || '==').trim(), condition.value);
  }

  function evaluateSetupConstraints(snapshot, setupRule) {
    const setup = snapshot && snapshot.setup && typeof snapshot.setup === 'object' ? snapshot.setup : {};
    for (const [key, values] of Object.entries(setupRule || {})) {
      if (!Array.isArray(values)) {
        continue;
      }
      const prop = key.replace(/In$/, '');
      if (!values.map(String).includes(String(setup[prop]))) {
        return false;
      }
    }
    return true;
  }

  function getTriggerSignalScore(snapshot, triggers) {
    const t = triggers && typeof triggers === 'object' ? triggers : {};
    const all = Array.isArray(t.all) ? t.all : [];
    const any = Array.isArray(t.any) ? t.any : [];

    if (t.stage && typeof t.stage === 'object') {
      const stageIndex = snapshot.plant.stageIndexOneBased;
      if (Number.isFinite(Number(t.stage.min)) && stageIndex < Number(t.stage.min)) return 0;
      if (Number.isFinite(Number(t.stage.max)) && stageIndex > Number(t.stage.max)) return 0;
    }

    if (t.setup && typeof t.setup === 'object' && !evaluateSetupConstraints(snapshot, t.setup)) {
      return 0;
    }

    const allScore = all.length
      ? all.filter((condition) => evaluateTriggerCondition(snapshot, condition)).length / all.length
      : 1;
    const anyScore = any.length
      ? (any.some((condition) => evaluateTriggerCondition(snapshot, condition)) ? 1 : 0)
      : 1;

    if (any.length && anyScore <= 0) {
      return 0;
    }

    return clamp(any.length ? ((allScore + anyScore) / 2) : allScore, 0, 1);
  }

  function isPhaseAllowed(eventDef, snapshot) {
    const allowedPhases = normalizeStringArray(eventDef && eventDef.allowedPhases);
    if (!allowedPhases.length) {
      return true;
    }
    return allowedPhases.includes(String(snapshot && snapshot.plant && snapshot.plant.phase || ''));
  }

  function evaluateEventConstraints(snapshot, eventDef) {
    const constraints = eventDef && eventDef.constraints && typeof eventDef.constraints === 'object'
      ? eventDef.constraints
      : null;
    if (!constraints) {
      return true;
    }

    const minStage = Number(constraints.minStage);
    const maxStage = Number(constraints.maxStage);
    const minDay = Number(constraints.minDay);
    const maxDay = Number(constraints.maxDay);
    const minPlantSize = Number(constraints.minPlantSize);
    const minRootMass = Number(constraints.minRootMass);

    if (constraints.minStage != null && Number.isFinite(minStage) && snapshot.plant.stageIndexOneBased < minStage) return false;
    if (constraints.maxStage != null && Number.isFinite(maxStage) && snapshot.plant.stageIndexOneBased > maxStage) return false;
    if (constraints.minDay != null && Number.isFinite(minDay) && snapshot.simulation.simDay < minDay) return false;
    if (constraints.maxDay != null && Number.isFinite(maxDay) && snapshot.simulation.simDay > maxDay) return false;
    if (constraints.minPlantSize != null && Number.isFinite(minPlantSize) && snapshot.plant.plantSize < minPlantSize) return false;
    if (constraints.minRootMass != null && Number.isFinite(minRootMass) && snapshot.plant.rootMass < minRootMass) return false;

    const env = constraints.environmentState && typeof constraints.environmentState === 'object'
      ? constraints.environmentState
      : null;
    if (env) {
      if (env.minTemperatureC != null && snapshot.environment.temperatureC < Number(env.minTemperatureC)) return false;
      if (env.maxTemperatureC != null && snapshot.environment.temperatureC > Number(env.maxTemperatureC)) return false;
      if (env.minHumidityPercent != null && snapshot.environment.humidityPercent < Number(env.minHumidityPercent)) return false;
      if (env.maxHumidityPercent != null && snapshot.environment.humidityPercent > Number(env.maxHumidityPercent)) return false;
      if (env.minVpdKpa != null && snapshot.environment.vpdKpa < Number(env.minVpdKpa)) return false;
      if (env.maxVpdKpa != null && snapshot.environment.vpdKpa > Number(env.maxVpdKpa)) return false;
      if (env.minAirflowScore != null && snapshot.environment.airflowScore < Number(env.minAirflowScore)) return false;
      if (env.minInstabilityScore != null && snapshot.environment.instabilityScore < Number(env.minInstabilityScore)) return false;
      if (env.maxInstabilityScore != null && snapshot.environment.instabilityScore > Number(env.maxInstabilityScore)) return false;
    }

    const root = constraints.rootZone && typeof constraints.rootZone === 'object'
      ? constraints.rootZone
      : null;
    if (root) {
      if (root.minPh != null && snapshot.rootZone.ph < Number(root.minPh)) return false;
      if (root.maxPh != null && snapshot.rootZone.ph > Number(root.maxPh)) return false;
      if (root.minEc != null && snapshot.rootZone.ec < Number(root.minEc)) return false;
      if (root.maxEc != null && snapshot.rootZone.ec > Number(root.maxEc)) return false;
      if (root.minOxygenPercent != null && snapshot.rootZone.oxygenPercent < Number(root.minOxygenPercent)) return false;
    }

    return true;
  }

  function hashString(input) {
    let hash = 2166136261;
    const text = String(input || '');
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function deterministicUnit(stateLike, key) {
    const state = stateLike && typeof stateLike === 'object' ? stateLike : {};
    const simulation = state.simulation && typeof state.simulation === 'object' ? state.simulation : {};
    const seed = String(
      state.seed
      || simulation.globalSeed
      || 'grow-sim-shadow'
    );
    const plantId = String(state.plantId || simulation.plantId || 'plant');
    return (hashString(`${seed}|${plantId}|${String(key || '')}`) % 1000000) / 1000000;
  }

  const api = Object.freeze({
    DEFAULT_ENVIRONMENT_CONTROLS,
    toFiniteNumber,
    clamp,
    clampInt,
    round2,
    normalizeStringArray,
    buildEnvironmentReadout,
    buildRootZoneReadout,
    buildShadowSnapshot,
    resolveField,
    evaluateCondition,
    evaluateTriggerCondition,
    evaluateSetupConstraints,
    getTriggerSignalScore,
    isPhaseAllowed,
    evaluateEventConstraints,
    hashString,
    deterministicUnit
  });

  globalScope.GrowSimEventShared = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
