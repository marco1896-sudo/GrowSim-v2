'use strict';

const fs = require('fs');
const path = require('path');
const { getEventV2PreviewFlags } = require('./EventV2PreviewFlags.js');
const { createCandidateFeedPreviewItems } = require('./EventV2CandidateFeedPreviewAdapter.js');

function loadGateReport(rootDir, explicitReport) {
  if (explicitReport && typeof explicitReport === 'object') return explicitReport;
  const root = rootDir ? path.resolve(String(rootDir)) : process.cwd();
  const reportPath = path.join(root, 'data', 'events', 'catalog', '_planning', 'phase-142-soft-activation-candidate-gate-report.json');
  return JSON.parse(fs.readFileSync(reportPath, 'utf8').replace(/^\uFEFF/, ''));
}

function hasAllRequiredFlags(flags) {
  return Boolean(
    flags
    && flags.eventV2PreviewEnabled === true
    && flags.eventV2ShadowFeedEnabled === true
    && flags.eventV2EventCenterPreviewEnabled === true
  );
}

function createDisabledPayload(reason) {
  return {
    ok: true,
    mode: 'event_v2_dev_test_candidate_feed_preview_only',
    enabled: false,
    reason: reason || 'flag_disabled_by_default',
    canActivateGameplay: false,
    canMutateState: false,
    canMutateSave: false,
    runtimeWriteEnabled: false,
    productionEnabled: false,
    fixtures: [],
    items: [],
    selectedCandidate: null,
    actions: [],
    debug: {
      stateMutations: 0,
      saveWrites: 0,
      uiActions: 0,
      gameplayActivations: 0,
    },
  };
}

function createEnabledPayload(gateReport, flags) {
  const fixtures = Array.isArray(gateReport && gateReport.fixtures) ? gateReport.fixtures : [];
  const items = createCandidateFeedPreviewItems(gateReport);
  return {
    ok: true,
    mode: 'event_v2_dev_test_candidate_feed_preview_only',
    enabled: true,
    reason: 'dev_preview_explicitly_enabled',
    canActivateGameplay: false,
    canMutateState: false,
    canMutateSave: false,
    runtimeWriteEnabled: false,
    productionEnabled: false,
    fixtures: fixtures.map((fixture) => ({
      fixtureId: fixture.fixtureId,
      fixtureLabel: fixture.fixtureLabel,
      candidateCount: Array.isArray(fixture.candidatesTop5) ? fixture.candidatesTop5.length : 0,
      watch: fixture.plausibility && Array.isArray(fixture.plausibility.watch) ? fixture.plausibility.watch : [],
    })),
    items,
    selectedCandidate: null,
    actions: [],
    debug: {
      gateStatus: gateReport && gateReport.gateStatus ? gateReport.gateStatus : 'unknown',
      stateMutations: 0,
      saveWrites: 0,
      uiActions: 0,
      gameplayActivations: 0,
      runtimeWriteFlag: Boolean(flags && flags.eventV2RuntimeWriteEnabled),
      productionFlag: Boolean(flags && flags.eventV2ProductionEnabled),
    },
  };
}

function createDevTestCandidateFeedController(input) {
  const payload = input && typeof input === 'object' ? input : {};
  const rootDir = payload.rootDir ? path.resolve(String(payload.rootDir)) : process.cwd();
  const flags = Object.assign({}, getEventV2PreviewFlags(), payload.flags || {});
  const enableDevPreview = Boolean(payload.enableDevPreview);

  if (flags.eventV2RuntimeWriteEnabled === true) {
    return createDisabledPayload('blocked_runtime_write_enabled');
  }
  if (flags.eventV2ProductionEnabled === true) {
    return createDisabledPayload('blocked_production_enabled');
  }
  if (!enableDevPreview) {
    return createDisabledPayload('flag_disabled_by_default');
  }
  if (!hasAllRequiredFlags(flags)) {
    return createDisabledPayload('missing_required_dev_preview_flags');
  }

  const gateReport = loadGateReport(rootDir, payload.gateReport);
  return createEnabledPayload(gateReport, flags);
}

module.exports = Object.freeze({
  createDevTestCandidateFeedController,
});

