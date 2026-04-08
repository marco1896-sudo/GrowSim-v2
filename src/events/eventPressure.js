'use strict';

(function initEventPressure(globalScope) {
  const shared = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
    ? require('./eventShared.js')
    : globalScope.GrowSimEventShared;

  function describeContract() {
    return Object.freeze({
      phase: 'shadow',
      responsibility: 'latent pressure accumulation and decay for shadow diagnostics',
      outputs: ['latentPressures', 'pressureSummary']
    });
  }

  function buildComponentScores(snapshot) {
    const water = Number(snapshot.status.water || 0);
    const nutrition = Number(snapshot.status.nutrition || 0);
    const stress = Number(snapshot.status.stress || 0);
    const risk = Number(snapshot.status.risk || 0);
    const temperature = Number(snapshot.environment.temperatureC || 0);
    const humidity = Number(snapshot.environment.humidityPercent || 0);
    const vpd = Number(snapshot.environment.vpdKpa || 0);
    const airflow = Number(snapshot.environment.airflowScore || 0);
    const instability = Number(snapshot.environment.instabilityScore || 0);
    const ph = Number(snapshot.rootZone.ph || 0);
    const ec = Number(snapshot.rootZone.ec || 0);
    const oxygen = Number(snapshot.rootZone.oxygenPercent || 0);

    const waterDry = shared.clamp(((45 - water) / 45) * 100, 0, 100);
    const waterWet = shared.clamp(((water - 78) / 22) * 100, 0, 100);
    const nutritionLow = shared.clamp(((42 - nutrition) / 42) * 100, 0, 100);
    const nutritionHigh = shared.clamp(((nutrition - 78) / 22) * 100, 0, 100);
    const tempMismatch = shared.clamp((Math.abs(temperature - 25) / 10) * 100, 0, 100);
    const humidityMismatch = shared.clamp((Math.abs(humidity - 58) / 28) * 100, 0, 100);
    const vpdMismatch = shared.clamp((Math.abs(vpd - 1.15) / 1.0) * 100, 0, 100);
    const airflowMismatch = shared.clamp(((60 - airflow) / 60) * 100, 0, 100);
    const phMismatch = shared.clamp((Math.abs(ph - 6.0) / 0.9) * 100, 0, 100);
    const ecMismatch = shared.clamp((Math.abs(ec - 1.45) / 1.0) * 100, 0, 100);
    const oxygenMismatch = shared.clamp(((60 - oxygen) / 60) * 100, 0, 100);
    const diseaseHumidity = shared.clamp(((humidity - 68) / 22) * 100, 0, 100);
    const pestWindow = shared.clamp((risk * 0.65) + (airflowMismatch * 0.2) + (vpdMismatch * 0.15), 0, 100);

    return {
      waterDry: shared.round2(waterDry),
      waterWet: shared.round2(waterWet),
      nutritionLow: shared.round2(nutritionLow),
      nutritionHigh: shared.round2(nutritionHigh),
      tempMismatch: shared.round2(tempMismatch),
      humidityMismatch: shared.round2(humidityMismatch),
      vpdMismatch: shared.round2(vpdMismatch),
      airflowMismatch: shared.round2(airflowMismatch),
      instability: shared.round2(instability),
      phMismatch: shared.round2(phMismatch),
      ecMismatch: shared.round2(ecMismatch),
      oxygenMismatch: shared.round2(oxygenMismatch),
      diseaseHumidity: shared.round2(diseaseHumidity),
      pestWindow: shared.round2(pestWindow),
      stress: shared.round2(stress),
      risk: shared.round2(risk)
    };
  }

  function buildCategoryTargets(snapshot, componentScores) {
    return {
      water: shared.round2(shared.clamp(Math.max(componentScores.waterDry, componentScores.waterWet, componentScores.oxygenMismatch * 0.82), 0, 100)),
      nutrition: shared.round2(shared.clamp(Math.max(componentScores.nutritionLow, componentScores.nutritionHigh, componentScores.phMismatch * 0.8, componentScores.ecMismatch * 0.8), 0, 100)),
      environment: shared.round2(shared.clamp(Math.max(componentScores.tempMismatch, componentScores.humidityMismatch, componentScores.vpdMismatch, componentScores.airflowMismatch, componentScores.instability), 0, 100)),
      disease: shared.round2(shared.clamp(Math.max(componentScores.diseaseHumidity, componentScores.oxygenMismatch, componentScores.risk, componentScores.stress * 0.72), 0, 100)),
      pest: shared.round2(shared.clamp(Math.max(componentScores.pestWindow, componentScores.risk * 0.9), 0, 100)),
      positive: shared.round2(shared.clamp(100 - Math.max(componentScores.stress, componentScores.risk, componentScores.tempMismatch, componentScores.vpdMismatch), 0, 100))
    };
  }

  function isRecoveryState(snapshot, componentScores) {
    return Number(snapshot.status.water || 0) >= 45
      && Number(snapshot.status.water || 0) <= 75
      && Number(snapshot.status.nutrition || 0) >= 45
      && Number(snapshot.status.nutrition || 0) <= 75
      && Number(snapshot.status.stress || 0) <= 32
      && Number(snapshot.status.risk || 0) <= 32
      && Number(snapshot.rootZone.oxygenPercent || 0) >= 55
      && Math.max(
        componentScores.tempMismatch,
        componentScores.humidityMismatch,
        componentScores.vpdMismatch,
        componentScores.airflowMismatch,
        componentScores.phMismatch,
        componentScores.ecMismatch
      ) <= 26;
  }

  function evolvePressureValue(previousValue, targetValue, elapsedHours, recoveryState) {
    const previous = shared.clamp(shared.toFiniteNumber(previousValue, targetValue * 0.45), 0, 100);
    const target = shared.clamp(shared.toFiniteNumber(targetValue, 0), 0, 100);
    if (target > previous) {
      const increase = Math.min(target - previous, (8 + (target * 0.12)) * Math.max(elapsedHours, 0.25));
      return shared.round2(shared.clamp(previous + increase, 0, 100));
    }

    const decayRate = recoveryState ? 12 : 4;
    const decrease = Math.min(previous - target, decayRate * Math.max(elapsedHours, 0.25));
    return shared.round2(shared.clamp(previous - decrease, 0, 100));
  }

  function evaluateLatentPressures(stateLike, options = {}) {
    const snapshot = options.snapshot || shared.buildShadowSnapshot(stateLike);
    const previous = options.previousPressures && typeof options.previousPressures === 'object'
      ? options.previousPressures
      : {};
    const previousSimTimeMs = Number.isFinite(Number(options.previousSimTimeMs))
      ? Number(options.previousSimTimeMs)
      : Number(snapshot.simulation.simTimeMs || 0);
    const currentSimTimeMs = Number(snapshot.simulation.simTimeMs || 0);
    const elapsedHours = Math.max(0.25, Math.abs(currentSimTimeMs - previousSimTimeMs) / (60 * 60 * 1000));

    const componentScores = buildComponentScores(snapshot);
    const categoryTargets = buildCategoryTargets(snapshot, componentScores);
    const recoveryState = isRecoveryState(snapshot, componentScores);

    const latentPressures = {};
    for (const [category, targetValue] of Object.entries(categoryTargets)) {
      latentPressures[category] = evolvePressureValue(previous[category], targetValue, elapsedHours, recoveryState);
    }

    return {
      latentPressures,
      pressureSummary: {
        elapsedHours: shared.round2(elapsedHours),
        recoveryState,
        categoryTargets,
        componentScores
      }
    };
  }

  const api = Object.freeze({
    describeContract,
    buildComponentScores,
    buildCategoryTargets,
    isRecoveryState,
    evaluateLatentPressures
  });

  globalScope.GrowSimEventPressure = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
