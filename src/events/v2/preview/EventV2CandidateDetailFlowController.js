'use strict';

function createCandidateDetailFlowController(input) {
  const payload = input && typeof input === 'object' ? input : {};
  const diagnostics = Object.freeze({
    stateMutations: 0,
    saveWrites: 0,
    localStorageWrites: 0,
    indexedDbWrites: 0,
    uiActions: 0,
    gameplayActivations: 0,
  });

  const state = {
    currentView: 'list',
    activePreviewCandidateId: null,
    persistedSelectedCandidate: null,
    runtimeWriteEnabled: payload.runtimeWriteEnabled === true,
    productionEnabled: payload.productionEnabled === true,
  };

  function snapshot() {
    return {
      ok: true,
      mode: 'event_v2_candidate_list_to_detail_flow_no_resolve',
      currentView: state.currentView,
      activePreviewCandidateId: state.activePreviewCandidateId,
      persistedSelectedCandidate: null,
      canResolve: false,
      canActivateGameplay: false,
      canMutateState: false,
      canMutateSave: false,
      runtimeWriteEnabled: false,
      productionEnabled: false,
      actions: [],
      diagnostics,
    };
  }

  return Object.freeze({
    openCandidate(candidateId) {
      if (!candidateId) return snapshot();
      state.currentView = 'detail';
      state.activePreviewCandidateId = String(candidateId);
      return snapshot();
    },
    backToList() {
      state.currentView = 'list';
      state.activePreviewCandidateId = null;
      return snapshot();
    },
    closeDetail() {
      state.currentView = 'list';
      state.activePreviewCandidateId = null;
      return snapshot();
    },
    getState() {
      return snapshot();
    },
  });
}

var EVENT_V2_CANDIDATE_DETAIL_FLOW_CONTROLLER_API = Object.freeze({
  createCandidateDetailFlowController,
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EVENT_V2_CANDIDATE_DETAIL_FLOW_CONTROLLER_API;
}

if (typeof globalThis !== 'undefined' && typeof globalThis.window !== 'undefined') {
  globalThis.EventV2CandidateDetailFlowController = EVENT_V2_CANDIDATE_DETAIL_FLOW_CONTROLLER_API;
}
