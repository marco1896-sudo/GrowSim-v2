'use strict';

const ScoringWeights = require('./ScoringWeights');
const { createScoringDiagnostic } = require('./ScoringDiagnostic');

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toNumberOr(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function calculateDeterministicScore(input) {
  const value = input || {};
  const eligibilityScore = clamp(toNumberOr(value.eligibilityScore, 0), 0, 100);
  const pressureScore = clamp(toNumberOr(value.pressureScore, 0), 0, 100);
  const stageFitScore = clamp(toNumberOr(value.stageFitScore, 0), 0, 100);
  const modeFitScore = clamp(toNumberOr(value.modeFitScore, 0), 0, 100);
  const learningValueScore = clamp(toNumberOr(value.learningValueScore, 0), 0, 100);
  const riskScore = clamp(toNumberOr(value.riskScore, 0), 0, 100);

  const weightedRisk = (100 - riskScore) * ScoringWeights.riskScore;
  const totalScore = (
    (eligibilityScore * ScoringWeights.eligibilityScore) +
    (pressureScore * ScoringWeights.pressureScore) +
    (stageFitScore * ScoringWeights.stageFitScore) +
    (modeFitScore * ScoringWeights.modeFitScore) +
    (learningValueScore * ScoringWeights.learningValueScore) +
    weightedRisk
  );

  const diagnostics = [
    createScoringDiagnostic({
      code: 'deterministic_score_breakdown',
      message: 'Score computed with fixed Phase-4 weights and no randomness.',
      details: {
        eligibilityScore,
        pressureScore,
        stageFitScore,
        modeFitScore,
        learningValueScore,
        riskScore,
        weightedRisk,
        weights: ScoringWeights
      }
    })
  ];

  return Object.freeze({
    eligibilityScore,
    pressureScore,
    stageFitScore,
    modeFitScore,
    learningValueScore,
    riskScore,
    totalScore: Number(totalScore.toFixed(4)),
    diagnostics: Object.freeze(diagnostics)
  });
}

module.exports = Object.freeze({
  calculateDeterministicScore
});

