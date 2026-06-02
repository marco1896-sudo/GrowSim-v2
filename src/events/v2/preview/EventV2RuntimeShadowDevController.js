'use strict';

const fs = require('fs');
const path = require('path');
const { createRuntimeSnapshot } = require('../shadow/EventV2RuntimeSnapshotAdapter.js');
const { evaluateRuntimeShadow } = require('../shadow/EventV2RuntimeShadowEvaluator.js');
const { createSoftActivationCandidates } = require('../shadow/EventV2SoftActivationCandidateModel.js');
const { evaluateRuntimeShadowToggleGuard } = require('./EventV2RuntimeShadowToggleGuard.js');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function loadFixtures(rootDir, explicitFixtures) {
  if (Array.isArray(explicitFixtures)) return explicitFixtures.slice();
  const fixturesPath = path.join(rootDir, 'data', 'events', 'catalog', '_planning', 'phase-141-runtime-snapshot-fixtures.json');
  return readJson(fixturesPath);
}

function imageExists(rootDir, relPath) {
  return typeof relPath === 'string' && relPath.trim()
    ? fs.existsSync(path.join(rootDir, relPath))
    : false;
}

function disabledPayload(reason) {
  return {
    ok: true,
    mode: 'event_v2_runtime_shadow_dev_test_no_write',
    enabled: false,
    reason: reason || 'runtime_shadow_toggle_disabled_by_default',
    canActivateGameplay: false,
    canMutateState: false,
    canMutateSave: false,
    runtimeWriteEnabled: false,
    productionEnabled: false,
    fixtures: [],
    shadowResults: [],
    candidateItems: [],
    selectedCandidate: null,
    actions: [],
    diagnostics: {
      stateMutations: 0,
      saveWrites: 0,
      localStorageWrites: 0,
      indexedDbWrites: 0,
      uiActions: 0,
      gameplayActivations: 0,
    },
  };
}

function createRuntimeShadowDevController(input) {
  const payload = input && typeof input === 'object' ? input : {};
  const rootDir = payload.rootDir ? path.resolve(String(payload.rootDir)) : process.cwd();
  const guard = evaluateRuntimeShadowToggleGuard({
    environment: payload.environment,
    hostname: payload.hostname,
    searchParams: payload.searchParams,
    explicitEnable: payload.enableRuntimeShadowDev === true,
    runtimeWriteEnabled: false,
    productionEnabled: false,
  });

  if (!guard.enabled) {
    return disabledPayload(guard.reason);
  }

  const fixtures = loadFixtures(rootDir, payload.fixtures);
  const shadowResults = [];
  const candidateItems = [];

  for (const fixture of fixtures) {
    const fixtureId = String(fixture && fixture.id || 'unknown_fixture');
    const fixtureLabel = String(fixture && fixture.label || fixtureId);
    const snapshotEnvelope = createRuntimeSnapshot(fixture && fixture.state ? fixture.state : {});
    const evaluation = evaluateRuntimeShadow({
      rootDir,
      runtimeSnapshot: fixture && fixture.state ? fixture.state : {},
    });
    const candidates = evaluation && evaluation.result && Array.isArray(evaluation.result.candidates)
      ? evaluation.result.candidates
      : [];

    const soft = createSoftActivationCandidates({
      fixtureId,
      candidates,
      topN: 5,
    });

    const fixtureCandidates = (soft.candidates || []).map((item) => ({
      id: `${fixtureId}:${item.rank}:${item.eventId}`,
      fixtureId,
      fixtureLabel,
      rank: item.rank,
      eventId: item.eventId,
      title: item.title,
      category: item.category,
      environment: item.environment,
      severity: item.severity,
      score: item.score,
      reason: item.reason,
      imageSrc: item.imageSrc,
      imageFallback: 'assets/events/event-stress-recovery.png',
      revisionStatus: item.revisionStatus,
      activationStatus: 'candidate_only',
      isEventV2Candidate: true,
      isShadowOnly: true,
      canActivateGameplay: false,
      canMutateState: false,
      canMutateSave: false,
      runtimeWriteEnabled: false,
      productionEnabled: false,
      actions: [],
      previewReady: imageExists(rootDir, item.imageSrc),
      feedStatus: 'runtime_shadow_preview_only',
      debug: {
        runtimeShadowEnabled: true,
      },
    }));

    candidateItems.push(...fixtureCandidates);
    shadowResults.push({
      fixtureId,
      fixtureLabel,
      eventsEvaluated: candidates.length,
      snapshotWarnings: Array.isArray(snapshotEnvelope.warnings) ? snapshotEnvelope.warnings : [],
      missingFields: Array.isArray(snapshotEnvelope.missingFields) ? snapshotEnvelope.missingFields : [],
      canMutateState: false,
      canMutateSave: false,
      canActivateGameplay: false,
      topCandidateIds: fixtureCandidates.map((c) => c.eventId),
    });
  }

  return {
    ok: true,
    mode: 'event_v2_runtime_shadow_dev_test_no_write',
    enabled: true,
    reason: guard.reason,
    canActivateGameplay: false,
    canMutateState: false,
    canMutateSave: false,
    runtimeWriteEnabled: false,
    productionEnabled: false,
    fixtures: fixtures.map((fixture) => ({
      fixtureId: fixture.id,
      fixtureLabel: fixture.label || fixture.id,
    })),
    shadowResults,
    candidateItems,
    selectedCandidate: null,
    actions: [],
    diagnostics: {
      stateMutations: 0,
      saveWrites: 0,
      localStorageWrites: 0,
      indexedDbWrites: 0,
      uiActions: 0,
      gameplayActivations: 0,
    },
  };
}

module.exports = Object.freeze({
  createRuntimeShadowDevController,
});
