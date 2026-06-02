'use strict';

function toLower(value) {
  return String(value || '').trim().toLowerCase();
}

function isTruthy(value) {
  const normalized = toLower(value);
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on' || normalized === 'unlock';
}

function detectEnvironment(input) {
  const env = toLower(input && input.environment);
  if (env === 'local' || env === 'staging' || env === 'production') return env;

  const host = toLower(input && input.hostname);
  if (!host || host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) return 'local';
  if (host.includes('staging') || host.includes('preview') || host.includes('test') || host.includes('qa') || host.includes('dev')) return 'staging';
  return 'production';
}

function getQueryFlag(searchParams) {
  if (!searchParams || typeof searchParams.get !== 'function') return '';
  return String(searchParams.get('gs_event_v2_runtime_shadow_dev') || '').trim();
}

function evaluateRuntimeShadowToggleGuard(options) {
  const input = options && typeof options === 'object' ? options : {};
  const environment = detectEnvironment(input);
  const enabledByExplicit = input.explicitEnable === true;
  const enabledByQuery = isTruthy(getQueryFlag(input.searchParams));
  const runtimeWriteEnabled = input.runtimeWriteEnabled === true;
  const productionEnabled = input.productionEnabled === true;

  if (environment !== 'local' && environment !== 'staging') {
    return {
      enabled: false,
      reason: 'runtime_shadow_toggle_blocked_non_dev_environment',
      canActivateGameplay: false,
      canMutateState: false,
      canMutateSave: false,
      runtimeWriteEnabled: false,
      productionEnabled: false,
    };
  }

  if (runtimeWriteEnabled || productionEnabled) {
    return {
      enabled: false,
      reason: 'runtime_shadow_toggle_blocked_by_write_or_production',
      canActivateGameplay: false,
      canMutateState: false,
      canMutateSave: false,
      runtimeWriteEnabled: false,
      productionEnabled: false,
    };
  }

  if (!(enabledByExplicit || enabledByQuery)) {
    return {
      enabled: false,
      reason: 'runtime_shadow_toggle_disabled_by_default',
      canActivateGameplay: false,
      canMutateState: false,
      canMutateSave: false,
      runtimeWriteEnabled: false,
      productionEnabled: false,
    };
  }

  return {
    enabled: true,
    reason: 'runtime_shadow_dev_test_enabled',
    canActivateGameplay: false,
    canMutateState: false,
    canMutateSave: false,
    runtimeWriteEnabled: false,
    productionEnabled: false,
  };
}

module.exports = Object.freeze({
  evaluateRuntimeShadowToggleGuard,
});

