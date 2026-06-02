'use strict';

const { computePressureScore } = require('./PressureScore');
const { createEligibilityResult } = require('./EligibilityResult');
const { calculateDeterministicScore } = require('./DeterministicScore');

/**
 * Candidate scoring stub.
 * Returns pure data, no side effects.
 */
function scoreEventCandidate(context, candidate) {
  const data = candidate && candidate.data ? candidate.data : {};
  const stageRange = data && data.triggers && data.triggers.stage ? data.triggers.stage : null;
  const stageFromContext = context && context.meta ? Number(context.meta.stage) : NaN;

  let stageFitScore = 50;
  if (stageRange && Number.isFinite(Number(stageRange.min)) && Number.isFinite(Number(stageRange.max)) && Number.isFinite(stageFromContext)) {
    stageFitScore = stageFromContext >= Number(stageRange.min) && stageFromContext <= Number(stageRange.max) ? 100 : 0;
  }

  const modeFromContext = context && context.meta && typeof context.meta.mode === 'string' ? context.meta.mode : null;
  const modeIn = data && data.triggers && data.triggers.setup && Array.isArray(data.triggers.setup.modeIn)
    ? data.triggers.setup.modeIn
    : null;
  let modeFitScore = 50;
  if (modeFromContext && modeIn) {
    modeFitScore = modeIn.indexOf(modeFromContext) >= 0 ? 100 : 0;
  }

  const learningValueScore = data && data.learningCard && typeof data.learningCard.ref === 'string' ? 90 : 30;
  const riskScore = data && data.severity && data.severity.level === 'critical' ? 80 : 40;

  const eligibility = createEligibilityResult({
    eligible: Boolean(candidate && candidate.kind === 'event'),
    score: Boolean(candidate && candidate.kind === 'event') ? 100 : 0,
    reasons: candidate && candidate.kind === 'event'
      ? []
      : ['unsupported_candidate_kind'],
    warnings: ['stub_scoring_no_botanical_logic']
  });

  const pressure = computePressureScore(context, candidate);

  if (!eligibility.eligible) {
    const deterministic = calculateDeterministicScore({
      eligibilityScore: 0,
      pressureScore: 0,
      stageFitScore: 0,
      modeFitScore: 0,
      learningValueScore: 0,
      riskScore: 100
    });

    return Object.freeze({
      total: 0,
      reason: 'ineligible_candidate',
      eligibility,
      pressure,
      deterministicScore: deterministic,
      diagnostics: deterministic.diagnostics
    });
  }

  const deterministic = calculateDeterministicScore({
    eligibilityScore: eligibility.score,
    pressureScore: pressure.total,
    stageFitScore: stageFitScore,
    modeFitScore: modeFitScore,
    learningValueScore: learningValueScore,
    riskScore: riskScore
  });

  return Object.freeze({
    total: deterministic.totalScore,
    reason: 'deterministic_stub_candidate_scored',
    eligibility,
    pressure,
    deterministicScore: deterministic,
    diagnostics: deterministic.diagnostics
  });
}

module.exports = Object.freeze({
  scoreEventCandidate
});
