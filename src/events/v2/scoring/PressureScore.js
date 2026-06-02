'use strict';

function bounded(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.max(0, Math.min(100, n));
}

function extractWeight(candidate) {
  const weight = candidate && candidate.data && candidate.data.pressure && candidate.data.pressure.weight;
  if (!Number.isFinite(Number(weight))) {
    return 0.5;
  }
  return Number(weight);
}

/**
 * Pressure score stub contract.
 * TODO: implement deterministic pressure components in later phases.
 */
function computePressureScore(context, candidate) {
  const snapshot = context && context.snapshot ? context.snapshot : {};
  const stress = bounded(snapshot.stress);
  const risk = bounded(snapshot.risk);
  const candidateWeight = extractWeight(candidate);

  const categoryPressure = bounded(40 + (candidateWeight * 20));
  const signalScore = bounded(50 - (risk * 0.2));
  const specificPressure = bounded(stress * 0.6);
  const total = Number(((categoryPressure * 0.45) + (signalScore * 0.40) + (specificPressure * 0.15)).toFixed(4));

  return Object.freeze({
    total: total,
    components: Object.freeze({
      categoryPressure: categoryPressure,
      signalScore: signalScore,
      specificPressure: specificPressure
    }),
    reason: 'deterministic_pressure_stub'
  });
}

module.exports = Object.freeze({
  computePressureScore
});
