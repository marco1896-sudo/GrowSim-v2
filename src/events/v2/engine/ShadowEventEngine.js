'use strict';

const { createShadowEvaluationContext } = require('./ShadowEvaluationContext');
const { createShadowDecision } = require('./ShadowDecision');
const { createShadowDecisionResult } = require('./ShadowDecisionResult');
const { scoreEventCandidate } = require('../scoring/EventCandidateScorer');

function describeShadowEngineContract() {
  return Object.freeze({
    module: 'ShadowEventEngine',
    mode: 'read-only-stub',
    exports: Object.freeze([
      'createShadowEvaluationContext',
      'evaluateShadowEvents',
      'describeShadowEngineContract'
    ]),
    guarantees: Object.freeze([
      'no runtime integration',
      'no state mutation',
      'no event execution',
      'pure data output'
    ])
  });
}

function evaluateShadowEvents(context, catalogIndex) {
  const safeContext = context || createShadowEvaluationContext({});
  const candidates = (catalogIndex && catalogIndex.byKind && catalogIndex.byKind.event) || [];

  const diagnostics = [];
  const decisions = [];

  if (!Array.isArray(candidates)) {
    diagnostics.push(Object.freeze({
      code: 'invalid_catalog_index',
      severity: 'error',
      message: 'catalogIndex.byKind.event must be an array.'
    }));
  }

  const iterableCandidates = Array.isArray(candidates) ? candidates : [];

  iterableCandidates.forEach((candidate, idx) => {
    const score = scoreEventCandidate(safeContext, candidate);
    decisions.push(createShadowDecision({
      decisionId: 'shadow-' + String(idx + 1),
      candidateId: candidate && candidate.fileName ? candidate.fileName : null,
      decisionType: 'candidate_evaluated',
      score: score.total,
      reason: score.reason,
      details: {
        kind: candidate && candidate.kind ? candidate.kind : 'unknown',
        stub: true,
        todo: 'Replace with deterministic botanical scoring in later phases.'
      }
    }));
  });

  if (iterableCandidates.length === 0) {
    decisions.push(createShadowDecision({
      decisionId: 'shadow-noop',
      decisionType: 'noop',
      reason: 'no_event_candidates'
    }));
  }

  return createShadowDecisionResult({
    ok: safeContext.errors.length === 0,
    contextErrors: safeContext.errors,
    diagnostics,
    decisions,
    summary: {
      evaluatedCandidates: iterableCandidates.length,
      selectedCandidates: 0,
      noop: iterableCandidates.length === 0
    }
  });
}

module.exports = Object.freeze({
  createShadowEvaluationContext,
  evaluateShadowEvents,
  describeShadowEngineContract
});
