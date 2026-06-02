'use strict';

const { createEventCenterCandidatePreviewModel } = require('./EventV2EventCenterCandidatePreviewModel.js');
const { EVENT_V2_PREVIEW_COPY_LABELS } = require('./EventV2PreviewCopyLabels.js');

const SOFT_PREVIEW_LABELS = Object.freeze([
  EVENT_V2_PREVIEW_COPY_LABELS.devTest,
  EVENT_V2_PREVIEW_COPY_LABELS.candidateOnly,
  EVENT_V2_PREVIEW_COPY_LABELS.runtimeShadow,
  EVENT_V2_PREVIEW_COPY_LABELS.noWrite,
  EVENT_V2_PREVIEW_COPY_LABELS.noResolve,
  EVENT_V2_PREVIEW_COPY_LABELS.noGameplayActivation,
]);

function createSoftPreviewModeModel(input) {
  const payload = input && typeof input === 'object' ? input : {};
  const base = createEventCenterCandidatePreviewModel(payload);

  if (!base || base.enabled !== true) {
    return {
      ok: true,
      mode: 'event_v2_dev_test_soft_preview_no_resolve',
      title: 'Event V2 Vorschau',
      subtitle: 'Testmodus · Vorschlagskarten-Details · Keine Entscheidung möglich',
      enabled: false,
      reason: (base && base.reason) || 'soft_preview_disabled',
      canActivateGameplay: false,
      canMutateState: false,
      canMutateSave: false,
      canResolve: false,
      runtimeWriteEnabled: false,
      productionEnabled: false,
      selectedCandidate: null,
      persistedSelectedCandidate: null,
      actions: [],
      safetyLabels: SOFT_PREVIEW_LABELS.slice(),
      fixtures: [],
      candidateItems: [],
      detailPreviewAvailable: false,
      flow: {
        listAvailable: false,
        detailAvailable: false,
        backAvailable: false,
        closeAvailable: false,
        multiCandidateSupported: false,
      },
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

  return {
    ok: true,
    mode: 'event_v2_dev_test_soft_preview_no_resolve',
    title: 'Event V2 Vorschau',
    subtitle: 'Testmodus · Vorschlagskarten-Details · Keine Entscheidung möglich',
    enabled: true,
    canActivateGameplay: false,
    canMutateState: false,
    canMutateSave: false,
    canResolve: false,
    runtimeWriteEnabled: false,
    productionEnabled: false,
    selectedCandidate: null,
    persistedSelectedCandidate: null,
    actions: [],
    safetyLabels: SOFT_PREVIEW_LABELS.slice(),
    fixtures: Array.isArray(base.fixtures) ? base.fixtures.slice() : [],
    candidateItems: Array.isArray(base.flatItems) ? base.flatItems.slice() : [],
    detailPreviewAvailable: true,
    flow: {
      listAvailable: true,
      detailAvailable: true,
      backAvailable: true,
      closeAvailable: true,
      multiCandidateSupported: true,
    },
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
  createSoftPreviewModeModel,
  SOFT_PREVIEW_LABELS,
});

