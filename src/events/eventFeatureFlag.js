'use strict';

(function initEventFeatureFlag(globalScope) {
  const MODES = Object.freeze({
    LEGACY: 'legacy',
    SHADOW: 'shadow',
    NEW: 'new',
    INTERNAL_SOFT_CUTOVER: 'internal-soft-cutover'
  });

  let forcedMode = null;

  function normalizeMode(value) {
    const mode = String(value || '').trim().toLowerCase();
    if (mode === MODES.SHADOW) return MODES.SHADOW;
    if (mode === MODES.NEW) return MODES.NEW;
    if (mode === MODES.INTERNAL_SOFT_CUTOVER || mode === 'internal-soft' || mode === 'soft-cutover') return MODES.INTERNAL_SOFT_CUTOVER;
    return MODES.LEGACY;
  }

  function readConfiguredMode() {
    if (forcedMode) {
      return forcedMode;
    }

    const sharedConfig = globalScope.GrowSimSharedConfig && typeof globalScope.GrowSimSharedConfig === 'object'
      ? globalScope.GrowSimSharedConfig
      : null;
    const eventMode = sharedConfig && sharedConfig.events && sharedConfig.events.runtimeMode;
    return normalizeMode(eventMode);
  }

  function getMode() {
    return readConfiguredMode();
  }

  function isShadowEnabled() {
    const mode = getMode();
    return mode === MODES.SHADOW || mode === MODES.INTERNAL_SOFT_CUTOVER;
  }

  function isNewEngineEnabled() {
    return getMode() === MODES.NEW;
  }

  function isInternalSoftCutoverEnabled() {
    return getMode() === MODES.INTERNAL_SOFT_CUTOVER;
  }

  function describeModeStatus() {
    const mode = getMode();
    return {
      mode,
      shadowEnabled: mode === MODES.SHADOW || mode === MODES.NEW || mode === MODES.INTERNAL_SOFT_CUTOVER,
      newEngineRequested: mode === MODES.NEW,
      softCutoverRequested: mode === MODES.INTERNAL_SOFT_CUTOVER,
      newEngineLive: false,
      liveAuthority: 'legacy',
      rollbackAvailable: true,
      notes: ['Legacy remains the production-safe authority. Internal soft-cutover is explicit, guarded, rollback-first, and Phase 11 authority experiments stay internal-only and tightly scoped.']
    };
  }

  function setModeForTesting(mode) {
    forcedMode = normalizeMode(mode);
    return forcedMode;
  }

  function resetModeForTesting() {
    forcedMode = null;
    return getMode();
  }

  const api = Object.freeze({
    MODES,
    getMode,
    isShadowEnabled,
    isNewEngineEnabled,
    isInternalSoftCutoverEnabled,
    describeModeStatus,
    setModeForTesting,
    resetModeForTesting,
    normalizeMode
  });

  globalScope.GrowSimEventFeatureFlag = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
