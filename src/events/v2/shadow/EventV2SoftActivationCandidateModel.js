'use strict';

function toCandidateItem(candidate, rank) {
  const src = candidate && typeof candidate === 'object' ? candidate : {};
  return {
    rank,
    eventId: src.eventId || 'unknown_event',
    title: src.eventId || 'unknown_event',
    category: src.category || 'unknown',
    environment: src.environment || 'shared',
    severity: src.severity || 'unknown',
    score: Number.isFinite(Number(src.score)) ? Number(src.score) : 0,
    reason: src.reason || 'unknown',
    imageSrc: src.imageSrc || '',
    revisionStatus: src.revisionStatus || 'unknown',
    activationStatus: 'candidate_only',
    canActivateGameplay: false,
    canMutateSave: false,
    actions: [],
  };
}

function createSoftActivationCandidates(input) {
  const payload = input && typeof input === 'object' ? input : {};
  const fixtureId = payload.fixtureId || 'unknown_fixture';
  const topN = Number.isFinite(Number(payload.topN)) ? Math.max(1, Number(payload.topN)) : 5;

  const rawCandidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  const eligibleSorted = rawCandidates
    .filter((candidate) => Boolean(candidate && candidate.eligible))
    .slice()
    .sort((a, b) => Number(b.score) - Number(a.score) || String(a.eventId || '').localeCompare(String(b.eventId || '')));

  const candidates = eligibleSorted.slice(0, topN).map((candidate, index) => toCandidateItem(candidate, index + 1));

  return {
    ok: true,
    mode: 'dev_test_soft_activation_candidate_no_write',
    canActivateGameplay: false,
    canMutateState: false,
    canMutateSave: false,
    runtimeWriteEnabled: false,
    productionEnabled: false,
    fixtureId,
    candidates,
    selectedCandidate: null,
    debug: {
      totalInputCandidates: rawCandidates.length,
      eligibleInputCandidates: eligibleSorted.length,
      returnedCandidates: candidates.length,
    },
  };
}

module.exports = Object.freeze({
  createSoftActivationCandidates,
});

