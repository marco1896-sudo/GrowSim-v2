'use strict';

function createResolvePreviewInteractionController() {
  const state = {
    activePreviewOptionId: null,
  };

  function snapshot() {
    return {
      ok: true,
      mode: 'event_v2_resolve_preview_interaction_no_apply',
      activePreviewOptionId: state.activePreviewOptionId,
      persistedResolveChoice: null,
      canApply: false,
      canResolve: false,
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

  return Object.freeze({
    selectOption(optionId) {
      state.activePreviewOptionId = optionId ? String(optionId) : null;
      return snapshot();
    },
    clearSelection() {
      state.activePreviewOptionId = null;
      return snapshot();
    },
    getState() {
      return snapshot();
    },
  });
}

var EVENT_V2_RESOLVE_PREVIEW_INTERACTION_CONTROLLER_API = Object.freeze({
  createResolvePreviewInteractionController,
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EVENT_V2_RESOLVE_PREVIEW_INTERACTION_CONTROLLER_API;
}

if (typeof globalThis !== 'undefined' && typeof globalThis.window !== 'undefined') {
  globalThis.EventV2ResolvePreviewInteractionController = EVENT_V2_RESOLVE_PREVIEW_INTERACTION_CONTROLLER_API;
}
