'use strict';

const { createSoftPreviewModeModel } = require('./EventV2SoftPreviewModeModel.js');
const { EVENT_V2_PREVIEW_COPY_LABELS } = require('./EventV2PreviewCopyLabels.js');

const DEV_TEST_NO_WRITE_LABELS = Object.freeze([
  EVENT_V2_PREVIEW_COPY_LABELS.devTest,
  EVENT_V2_PREVIEW_COPY_LABELS.eventCenterPreview,
  EVENT_V2_PREVIEW_COPY_LABELS.runtimeShadow,
  EVENT_V2_PREVIEW_COPY_LABELS.candidateOnly,
  EVENT_V2_PREVIEW_COPY_LABELS.noWrite,
  EVENT_V2_PREVIEW_COPY_LABELS.noResolve,
  EVENT_V2_PREVIEW_COPY_LABELS.noGameplayActivation,
]);

function createDevTestNoWriteModeModel(input) {
  const payload = input && typeof input === 'object' ? input : {};
  const softPreview = createSoftPreviewModeModel(payload);

  if (!softPreview || softPreview.enabled !== true) {
    return {
      ok: true,
      mode: 'event_v2_dev_test_no_write_mode',
      title: 'Event V2 Dev/Test Mode',
      subtitle: 'Event-Vorschau · Nur Vorschau · keine Entscheidung',
      status: 'dev_test_soft_activation_ready_with_watch',
      enabled: false,
      reason: (softPreview && softPreview.reason) || 'dev_test_no_write_disabled',
      productionEnabled: false,
      runtimeWriteEnabled: false,
      canActivateGameplay: false,
      canResolve: false,
      canMutateState: false,
      canMutateSave: false,
      selectedCandidate: null,
      persistedSelectedCandidate: null,
      actions: [],
      safetyLabels: DEV_TEST_NO_WRITE_LABELS.slice(),
      softPreview: {
        listAvailable: false,
        detailAvailable: false,
        multiCandidateSupported: false,
      },
      fixtures: [],
      candidateItems: [],
      diagnostics: {
        stateMutations: 0,
        saveWrites: 0,
        localStorageWrites: 0,
        indexedDbWrites: 0,
        uiActions: 0,
        gameplayActivations: 0,
      },
      watchpoints: ['scoring_watch_vpd_vs_dry_rootball'],
    };
  }

  return {
    ok: true,
    mode: 'event_v2_dev_test_no_write_mode',
    title: 'Event V2 Dev/Test Mode',
    subtitle: 'Event-Vorschau · Nur Vorschau · keine Entscheidung',
    status: 'dev_test_soft_activation_ready_with_watch',
    enabled: true,
    productionEnabled: false,
    runtimeWriteEnabled: false,
    canActivateGameplay: false,
    canResolve: false,
    canMutateState: false,
    canMutateSave: false,
    selectedCandidate: null,
    persistedSelectedCandidate: null,
    actions: [],
    safetyLabels: DEV_TEST_NO_WRITE_LABELS.slice(),
    softPreview: {
      listAvailable: true,
      detailAvailable: true,
      multiCandidateSupported: true,
    },
    fixtures: Array.isArray(softPreview.fixtures) ? softPreview.fixtures.slice() : [],
    candidateItems: Array.isArray(softPreview.candidateItems) ? softPreview.candidateItems.slice() : [],
    diagnostics: {
      stateMutations: 0,
      saveWrites: 0,
      localStorageWrites: 0,
      indexedDbWrites: 0,
      uiActions: 0,
      gameplayActivations: 0,
    },
    watchpoints: ['scoring_watch_vpd_vs_dry_rootball'],
  };
}

module.exports = Object.freeze({
  createDevTestNoWriteModeModel,
  DEV_TEST_NO_WRITE_LABELS,
});


