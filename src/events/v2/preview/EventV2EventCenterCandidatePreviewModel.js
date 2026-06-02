'use strict';

const { createRuntimeShadowDevController } = require('./EventV2RuntimeShadowDevController.js');
const { evaluateDevPreviewEntryGuard } = require('./EventV2DevPreviewEntryGuard.js');
const { evaluateRuntimeShadowToggleGuard } = require('./EventV2RuntimeShadowToggleGuard.js');
const { EVENT_V2_PREVIEW_COPY_LABELS } = require('./EventV2PreviewCopyLabels.js');

const SAFETY_LABELS = Object.freeze([
  EVENT_V2_PREVIEW_COPY_LABELS.devTest,
  EVENT_V2_PREVIEW_COPY_LABELS.candidateOnly,
  EVENT_V2_PREVIEW_COPY_LABELS.noWrite,
  EVENT_V2_PREVIEW_COPY_LABELS.noGameplayActivation,
  EVENT_V2_PREVIEW_COPY_LABELS.runtimeShadow,
]);

function disabledPayload(reason) {
  return {
    ok: true,
    mode: 'event_v2_event_center_candidate_preview_no_write',
    title: 'Event V2 Candidate Preview',
    subtitle: 'Testmodus · Vorschlagskarten · Nur Vorschau',
    enabled: false,
    reason: reason || 'disabled',
    canActivateGameplay: false,
    canMutateState: false,
    canMutateSave: false,
    runtimeWriteEnabled: false,
    productionEnabled: false,
    selectedCandidate: null,
    actions: [],
    safetyLabels: SAFETY_LABELS.slice(),
    fixtures: [],
    flatItems: [],
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

function toFixtureGroups(items) {
  const byFixture = new Map();
  for (const item of items) {
    const fixtureId = String(item && item.fixtureId || 'unknown_fixture');
    const fixtureLabel = String(item && item.fixtureLabel || fixtureId);
    if (!byFixture.has(fixtureId)) {
      byFixture.set(fixtureId, {
        fixtureId,
        label: fixtureLabel,
        candidates: [],
      });
    }
    byFixture.get(fixtureId).candidates.push(item);
  }
  return Array.from(byFixture.values());
}

function createEventCenterCandidatePreviewModel(input) {
  const payload = input && typeof input === 'object' ? input : {};
  const devGuard = evaluateDevPreviewEntryGuard({
    environment: payload.environment,
    hostname: payload.hostname,
    searchParams: payload.searchParams,
    explicitEnable: payload.explicitDevPreview === true,
    runtimeWriteEnabled: false,
    productionEnabled: false,
  });
  if (!devGuard.visible) {
    return disabledPayload('dev_preview_disabled');
  }

  const runtimeGuard = evaluateRuntimeShadowToggleGuard({
    environment: payload.environment,
    hostname: payload.hostname,
    searchParams: payload.searchParams,
    explicitEnable: payload.enableRuntimeShadowDev === true,
    runtimeWriteEnabled: false,
    productionEnabled: false,
  });
  if (!runtimeGuard.enabled) {
    return disabledPayload(runtimeGuard.reason);
  }

  const runtimeResult = createRuntimeShadowDevController({
    rootDir: payload.rootDir,
    enableRuntimeShadowDev: true,
    environment: payload.environment,
    hostname: payload.hostname,
    searchParams: payload.searchParams,
  });

  const flatItems = Array.isArray(runtimeResult.candidateItems) ? runtimeResult.candidateItems.slice() : [];
  const fixtures = toFixtureGroups(flatItems);

  return {
    ok: true,
    mode: 'event_v2_event_center_candidate_preview_no_write',
    title: 'Event V2 Candidate Preview',
    subtitle: 'Testmodus · Vorschlagskarten · Nur Vorschau',
    enabled: true,
    reason: 'event_center_context_ready',
    canActivateGameplay: false,
    canMutateState: false,
    canMutateSave: false,
    runtimeWriteEnabled: false,
    productionEnabled: false,
    selectedCandidate: null,
    actions: [],
    safetyLabels: SAFETY_LABELS.slice(),
    fixtures,
    flatItems,
    diagnostics: {
      stateMutations: 0,
      saveWrites: 0,
      localStorageWrites: 0,
      indexedDbWrites: 0,
      uiActions: 0,
      gameplayActivations: 0,
      shadowEvaluations: Array.isArray(runtimeResult.shadowResults)
        ? runtimeResult.shadowResults.reduce((sum, item) => sum + Number(item.eventsEvaluated || 0), 0)
        : 0,
    },
  };
}

module.exports = Object.freeze({
  createEventCenterCandidatePreviewModel,
  SAFETY_LABELS,
});


