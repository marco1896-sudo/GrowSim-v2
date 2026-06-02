'use strict';

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toBooleanOrNull(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return null;
}

function pickFirstObject(root, keys) {
  for (const key of keys) {
    if (root && typeof root[key] === 'object' && root[key] !== null) return root[key];
  }
  return {};
}

function pickFirstNumber(root, paths) {
  for (const path of paths) {
    const parts = path.split('.');
    let cur = root;
    for (const p of parts) {
      if (!cur || typeof cur !== 'object') {
        cur = undefined;
        break;
      }
      cur = cur[p];
    }
    const n = toNumberOrNull(cur);
    if (n !== null) return n;
  }
  return null;
}

function pickFirstString(root, paths) {
  for (const path of paths) {
    const parts = path.split('.');
    let cur = root;
    for (const p of parts) {
      if (!cur || typeof cur !== 'object') {
        cur = undefined;
        break;
      }
      cur = cur[p];
    }
    if (typeof cur === 'string' && cur.trim()) return cur.trim();
  }
  return null;
}

function pickFirstBoolean(root, paths) {
  for (const path of paths) {
    const parts = path.split('.');
    let cur = root;
    for (const p of parts) {
      if (!cur || typeof cur !== 'object') {
        cur = undefined;
        break;
      }
      cur = cur[p];
    }
    const b = toBooleanOrNull(cur);
    if (b !== null) return b;
  }
  return null;
}

function cloneReadonly(input) {
  const src = input && typeof input === 'object' ? input : {};
  return JSON.parse(JSON.stringify(src));
}

function createRuntimeSnapshot(inputState) {
  const readonlyState = cloneReadonly(inputState);
  const state = readonlyState && typeof readonlyState === 'object' ? readonlyState : {};
  const warnings = [];
  const missingFields = [];

  const runNode = pickFirstObject(state, ['run', 'simulation', 'status']);
  const plantNode = pickFirstObject(state, ['plant']);
  const climateNode = pickFirstObject(state, ['climate', 'environmentControls', 'environment']);
  const eventsNode = pickFirstObject(state, ['events']);

  const day = pickFirstNumber(state, ['run.day', 'simulation.day', 'status.day', 'day']);
  if (day === null) missingFields.push('run.day');

  const stage = pickFirstString(state, ['run.stage', 'plant.stage', 'plant.growthStage', 'status.stage']);
  if (stage === null) missingFields.push('run.stage');

  const environment = pickFirstString(state, [
    'run.environment',
    'environment.mode',
    'environmentControls.mode',
    'status.environment',
  ]) || 'shared';

  const mode = pickFirstString(state, ['run.mode', 'simulation.mode', 'status.mode']);

  const health = pickFirstNumber(state, ['plant.health', 'plant.healthScore', 'status.health']);
  const stress = pickFirstNumber(state, ['plant.stress', 'plant.stressLevel', 'status.stress']);
  const water = pickFirstNumber(state, ['plant.water', 'plant.waterLevel', 'status.water']);
  const nutrients = pickFirstNumber(state, ['plant.nutrients', 'plant.nutrientLevel', 'status.nutrients']);
  const rootzone = pickFirstNumber(state, ['plant.rootzone', 'plant.rootMass', 'status.rootzone']);
  const growthStage = pickFirstString(state, ['plant.growthStage', 'plant.stage', 'status.stage', 'run.stage']);

  const temperature = pickFirstNumber(state, ['climate.temperature', 'environmentControls.temperature', 'status.temperature']);
  const humidity = pickFirstNumber(state, ['climate.humidity', 'environmentControls.humidity', 'status.humidity']);
  const vpd = pickFirstNumber(state, ['climate.vpd', 'environmentControls.vpd', 'status.vpd']);
  const light = pickFirstNumber(state, ['climate.light', 'climate.ppfd', 'environmentControls.light', 'status.light']);
  const airflow = pickFirstNumber(state, ['climate.airflow', 'environmentControls.airflow', 'status.airflow']);

  const indoor = pickFirstBoolean(state, ['context.indoor', 'run.indoor', 'environment.indoor']);
  const outdoor = pickFirstBoolean(state, ['context.outdoor', 'run.outdoor', 'environment.outdoor']);
  const existingEventCount = Array.isArray(eventsNode.active)
    ? eventsNode.active.length
    : (Array.isArray(eventsNode.queue) ? eventsNode.queue.length : 0);

  if (vpd === null) warnings.push('snapshot_vpd_missing');
  if (temperature === null || humidity === null) warnings.push('snapshot_climate_partial');

  return {
    ok: true,
    source: 'runtime_snapshot_readonly',
    canMutateState: false,
    canMutateSave: false,
    canActivateGameplay: false,
    snapshot: {
      run: {
        day,
        stage,
        environment,
        mode,
      },
      plant: {
        health,
        stress,
        water,
        nutrients,
        rootzone,
        growthStage,
      },
      climate: {
        temperature,
        humidity,
        vpd,
        light,
        airflow,
      },
      context: {
        indoor,
        outdoor,
        hasActiveEvents: existingEventCount > 0,
        existingEventCount,
      },
    },
    missingFields,
    warnings,
    _debugReadonlyNodes: {
      runKeys: Object.keys(runNode || {}),
      plantKeys: Object.keys(plantNode || {}),
      climateKeys: Object.keys(climateNode || {}),
    },
  };
}

module.exports = Object.freeze({
  createRuntimeSnapshot,
});

