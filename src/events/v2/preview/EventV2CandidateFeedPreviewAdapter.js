'use strict';

function toItem(fixture, candidate, watchTokens) {
  const f = fixture && typeof fixture === 'object' ? fixture : {};
  const c = candidate && typeof candidate === 'object' ? candidate : {};
  const watch = Array.isArray(watchTokens) ? watchTokens : [];

  return {
    id: `${f.fixtureId || 'fixture'}:${c.rank || 0}:${c.eventId || 'unknown_event'}`,
    fixtureId: f.fixtureId || 'unknown_fixture',
    fixtureLabel: f.fixtureLabel || f.fixtureId || 'unknown_fixture',
    rank: Number.isFinite(Number(c.rank)) ? Number(c.rank) : 0,
    eventId: c.eventId || 'unknown_event',
    title: c.title || c.eventId || 'unknown_event',
    category: c.category || 'unknown',
    environment: c.environment || 'shared',
    severity: c.severity || 'unknown',
    score: Number.isFinite(Number(c.score)) ? Number(c.score) : 0,
    reason: c.reason || 'unknown',
    imageSrc: c.imageSrc || '',
    imageFallback: c.imageFallback || 'assets/events/event-stress-recovery.png',
    revisionStatus: c.revisionStatus || 'unknown',
    activationStatus: 'candidate_only',
    isEventV2Candidate: true,
    isShadowOnly: true,
    canActivateGameplay: false,
    canMutateState: false,
    canMutateSave: false,
    runtimeWriteEnabled: false,
    productionEnabled: false,
    actions: [],
    watchpoints: watch,
    debug: {
      fromPhase: '142',
      candidateRank: c.rank || null,
      hasWatchpoint: watch.length > 0,
    },
  };
}

function createCandidateFeedPreviewItems(gateReport) {
  const report = gateReport && typeof gateReport === 'object' ? gateReport : {};
  const fixtures = Array.isArray(report.fixtures) ? report.fixtures : [];
  const watchMap = new Map();

  const watchPoints = Array.isArray(report.watchPoints) ? report.watchPoints : [];
  for (const watchPoint of watchPoints) {
    const fixtureId = watchPoint && watchPoint.fixtureId ? String(watchPoint.fixtureId) : '';
    if (!fixtureId) continue;
    const list = watchMap.get(fixtureId) || [];
    if (watchPoint.watch) list.push(String(watchPoint.watch));
    watchMap.set(fixtureId, list);
  }

  const items = [];
  for (const fixture of fixtures) {
    const candidates = Array.isArray(fixture.candidatesTop5) ? fixture.candidatesTop5 : [];
    const watchTokens = watchMap.get(String(fixture.fixtureId || '')) || [];
    for (const candidate of candidates) {
      items.push(toItem(fixture, candidate, watchTokens));
    }
  }

  return items.sort((a, b) => {
    const fa = String(a.fixtureId || '');
    const fb = String(b.fixtureId || '');
    if (fa !== fb) return fa.localeCompare(fb);
    return Number(a.rank || 0) - Number(b.rank || 0);
  });
}

module.exports = Object.freeze({
  createCandidateFeedPreviewItems,
});

