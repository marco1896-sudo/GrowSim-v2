'use strict';

const { createDevTestCandidateFeedController } = require('./EventV2DevTestCandidateFeedController.js');
const { evaluateDevPreviewEntryGuard } = require('./EventV2DevPreviewEntryGuard.js');

const SAFETY_LABELS = Object.freeze([
  'Dev Preview',
  'Candidate Only',
  'No Write',
  'No Gameplay Activation',
]);

function createDevPreviewEntryViewModel(input) {
  const payload = input && typeof input === 'object' ? input : {};
  const guard = evaluateDevPreviewEntryGuard({
    environment: payload.environment,
    hostname: payload.hostname,
    searchParams: payload.searchParams,
    explicitEnable: payload.explicitEnable === true,
    runtimeWriteEnabled: false,
    productionEnabled: false,
  });

  if (!guard.visible) {
    return {
      ok: true,
      title: 'Event V2 Dev Preview',
      enabled: false,
      reason: guard.reason,
      safetyLabels: SAFETY_LABELS.slice(),
      fixtures: [],
      items: [],
      actions: [],
      selectedCandidate: null,
      canActivateGameplay: false,
      canMutateState: false,
      canMutateSave: false,
      runtimeWriteEnabled: false,
      productionEnabled: false,
    };
  }

  const controllerResult = createDevTestCandidateFeedController({
    rootDir: payload.rootDir,
    enableDevPreview: true,
    flags: {
      eventV2PreviewEnabled: true,
      eventV2ShadowFeedEnabled: true,
      eventV2EventCenterPreviewEnabled: true,
      eventV2RuntimeShadowEnabled: true,
      eventV2RuntimeWriteEnabled: false,
      eventV2ProductionEnabled: false,
    },
  });

  return {
    ok: true,
    title: 'Event V2 Dev Preview',
    enabled: controllerResult.enabled === true,
    reason: controllerResult.reason || guard.reason,
    safetyLabels: SAFETY_LABELS.slice(),
    fixtures: Array.isArray(controllerResult.fixtures) ? controllerResult.fixtures : [],
    items: Array.isArray(controllerResult.items) ? controllerResult.items : [],
    actions: [],
    selectedCandidate: null,
    canActivateGameplay: false,
    canMutateState: false,
    canMutateSave: false,
    runtimeWriteEnabled: false,
    productionEnabled: false,
    debug: {
      stateMutations: 0,
      saveWrites: 0,
      uiActions: 0,
      gameplayActivations: 0,
    },
  };
}

module.exports = Object.freeze({
  createDevPreviewEntryViewModel,
  SAFETY_LABELS,
});

