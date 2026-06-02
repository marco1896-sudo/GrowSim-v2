'use strict';

function isTruthyFlag(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on' || normalized === 'unlock';
}

function normalizeEnvironment(envName, hostname) {
  const explicit = String(envName || '').trim().toLowerCase();
  if (explicit === 'local' || explicit === 'staging' || explicit === 'production') {
    return explicit;
  }
  const host = String(hostname || '').trim().toLowerCase();
  if (!host || host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) return 'local';
  if (host.includes('staging') || host.includes('preview') || host.includes('test') || host.includes('qa') || host.includes('dev')) return 'staging';
  return 'production';
}

function readQueryFlag(searchParams, key) {
  if (!searchParams || typeof searchParams.get !== 'function') return '';
  return String(searchParams.get(key) || '').trim();
}

function evaluateDevPreviewEntryGuard(options) {
  const input = options && typeof options === 'object' ? options : {};
  const environment = normalizeEnvironment(input.environment, input.hostname);
  const explicitEnable = input.explicitEnable === true;
  const queryEnable = isTruthyFlag(readQueryFlag(input.searchParams, 'gs_event_v2_dev_preview'));
  const localOrStaging = environment === 'local' || environment === 'staging';
  const runtimeWriteEnabled = Boolean(input.runtimeWriteEnabled === true);
  const productionEnabled = Boolean(input.productionEnabled === true);

  if (!localOrStaging) {
    return {
      visible: false,
      reason: 'blocked_non_dev_environment',
      canActivateGameplay: false,
      canMutateSave: false,
      runtimeWriteEnabled: false,
      productionEnabled: false,
    };
  }
  if (runtimeWriteEnabled || productionEnabled) {
    return {
      visible: false,
      reason: 'blocked_by_runtime_or_production_flags',
      canActivateGameplay: false,
      canMutateSave: false,
      runtimeWriteEnabled: false,
      productionEnabled: false,
    };
  }
  if (!(explicitEnable || queryEnable)) {
    return {
      visible: false,
      reason: 'dev_preview_entry_disabled_by_default',
      canActivateGameplay: false,
      canMutateSave: false,
      runtimeWriteEnabled: false,
      productionEnabled: false,
    };
  }

  return {
    visible: true,
    reason: explicitEnable ? 'explicit_dev_enable' : 'query_dev_enable',
    canActivateGameplay: false,
    canMutateSave: false,
    runtimeWriteEnabled: false,
    productionEnabled: false,
  };
}

module.exports = Object.freeze({
  evaluateDevPreviewEntryGuard,
});

