#!/usr/bin/env node
/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');
const { evaluateRuntimeShadow } = require('../src/events/v2/shadow/EventV2RuntimeShadowEvaluator.js');
const { createRuntimeSnapshot } = require('../src/events/v2/shadow/EventV2RuntimeSnapshotAdapter.js');
const { createSoftActivationCandidates } = require('../src/events/v2/shadow/EventV2SoftActivationCandidateModel.js');

const ROOT = process.cwd();
const PLANNING_DIR = path.join(ROOT, 'data', 'events', 'catalog', '_planning');
const FIXTURES_PATH = path.join(PLANNING_DIR, 'phase-141-runtime-snapshot-fixtures.json');
const OUT_JSON = path.join(PLANNING_DIR, 'phase-142-soft-activation-candidate-gate-report.json');
const OUT_MD = path.join(PLANNING_DIR, 'phase-142-soft-activation-candidate-gate-report.md');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function fileExists(relPath) {
  return typeof relPath === 'string' && relPath.trim() && fs.existsSync(path.join(ROOT, relPath));
}

function evaluateFixturePlausibility(fixtureId, candidateModel) {
  const ids = candidateModel.candidates.map((candidate) => String(candidate.eventId || '').toLowerCase());
  const summary = { status: 'gate_pass', watch: [], notes: [] };

  if (fixtureId === 'fixture_indoor_veg_vpd_mismatch') {
    const hasVpdInTop5 = ids.includes('indoor_vpd_mismatch_veg');
    if (!hasVpdInTop5) {
      summary.status = 'gate_blocked';
      summary.notes.push('indoor_vpd_mismatch_veg_missing_from_top5');
    } else {
      summary.notes.push('indoor_vpd_mismatch_veg_in_top5');
      if (ids[0] === 'indoor_dry_rootball') {
        summary.status = 'gate_pass_with_watch';
        summary.watch.push('scoring_watch_vpd_vs_dry_rootball');
      }
    }
  }

  if (fixtureId === 'fixture_outdoor_heat_dry_wind') {
    const top3 = ids.slice(0, 3);
    const hasOutdoorHeatFamilyTop3 = top3.some((id) => id.includes('outdoor_heatwave_dry_wind') || id.includes('wind') || id.includes('heat'));
    if (!hasOutdoorHeatFamilyTop3) {
      summary.status = 'gate_blocked';
      summary.notes.push('outdoor_heat_family_not_in_top3');
    } else {
      summary.notes.push('outdoor_heat_family_in_top3');
    }
  }

  if (fixtureId === 'fixture_stable_healthy_baseline') {
    const heavySignals = ids.slice(0, 3).filter((id) => id.includes('critical') || id.includes('severe'));
    if (heavySignals.length > 0) {
      summary.status = 'gate_pass_with_watch';
      summary.watch.push('healthy_baseline_contains_heavy_signal');
    } else {
      summary.notes.push('healthy_baseline_without_aggressive_escalation');
    }
  }

  return summary;
}

function gateStatusFromFlags(flags) {
  const pass = flags.every(Boolean);
  return pass ? 'gate_pass' : 'gate_blocked';
}

function mergeAreaStatus(values) {
  if (values.includes('gate_blocked')) return 'gate_blocked';
  if (values.includes('gate_pass_with_watch')) return 'gate_pass_with_watch';
  return 'gate_pass';
}

function buildGateMatrix(fixtureResults) {
  const shadowFeedReport = readJson(path.join(PLANNING_DIR, 'phase-136-shadow-feed-readiness-report.json'));
  const shadowSmokeReport = readJson(path.join(PLANNING_DIR, 'phase-137-shadow-feed-browser-smoke-report.json'));
  const bridgeReport = readJson(path.join(PLANNING_DIR, 'phase-139-event-center-preview-bridge-report.json'));
  const activeValidationReport = readJson(path.join(PLANNING_DIR, 'phase-129-active-assetref-validation-report.json'));
  const fullCoverValidation = readJson(path.join(PLANNING_DIR, 'phase-132-full-cover-validation-report.json'));
  const runtimeShadowReport = readJson(path.join(PLANNING_DIR, 'phase-141-runtime-snapshot-shadow-report.json'));
  const activationReadiness = readJson(path.join(PLANNING_DIR, 'phase-138-activation-readiness-report.json'));

  const areaAsset = gateStatusFromFlags([
    fullCoverValidation.coverSrcFinalCount === 22,
    fullCoverValidation.coverFallbackFinalCount === 22,
    fullCoverValidation.finalHeroExistsCount === 22,
    fullCoverValidation.finalFallbackExistsCount === 22,
    fullCoverValidation.allCoverFinal === true,
    activeValidationReport.catalog && activeValidationReport.catalog.activeAssetRefsFound === 22,
    Array.isArray(activeValidationReport.errors) && activeValidationReport.errors.length === 0,
    Array.isArray(activeValidationReport.warnings) && activeValidationReport.warnings.length === 0,
    bridgeReport.summary && bridgeReport.summary.brokenPaths === 0,
  ]);

  const areaPreview = gateStatusFromFlags([
    shadowFeedReport.ok === true,
    shadowSmokeReport.ok === true,
    bridgeReport.ok === true,
    bridgeReport.summary && bridgeReport.summary.validImages === 22,
    bridgeReport.summary && bridgeReport.summary.brokenPaths === 0,
    shadowSmokeReport.summary && shadowSmokeReport.summary.brokenImages === 0,
  ]);

  const fixtureStatuses = fixtureResults.map((fixture) => fixture.plausibility.status);
  const areaRuntime = mergeAreaStatus([
    runtimeShadowReport.ok ? 'gate_pass' : 'gate_blocked',
    ...fixtureStatuses,
  ]);

  const areaSafety = gateStatusFromFlags([
    runtimeShadowReport.summary && runtimeShadowReport.summary.canMutateStateFalse === true,
    runtimeShadowReport.summary && runtimeShadowReport.summary.canMutateSaveFalse === true,
    runtimeShadowReport.summary && runtimeShadowReport.summary.canActivateGameplayFalse === true,
    runtimeShadowReport.summary && runtimeShadowReport.summary.stateMutations === 0,
    runtimeShadowReport.summary && runtimeShadowReport.summary.saveWrites === 0,
    activationReadiness.ok === true,
    activationReadiness.readinessStatus === 'ready_for_dev_soft_activation',
  ]);

  const areaFlags = gateStatusFromFlags([
    bridgeReport.flags && bridgeReport.flags.eventV2RuntimeWriteEnabled === false,
    bridgeReport.flags && bridgeReport.flags.eventV2ProductionEnabled === false,
    bridgeReport.flags && bridgeReport.flags.eventV2PreviewEnabled === true,
    bridgeReport.flags && bridgeReport.flags.eventV2ShadowFeedEnabled === true,
  ]);

  return {
    assetCatalog: areaAsset,
    previewUiLab: areaPreview,
    runtimeShadowSnapshot: areaRuntime,
    safety: areaSafety,
    featureFlags: areaFlags,
  };
}

function toStatus(matrix) {
  if (matrix.safety === 'gate_blocked' || matrix.featureFlags === 'gate_blocked') return 'blocked_by_safety';
  if (matrix.assetCatalog === 'gate_blocked') return 'blocked_by_assets';
  if (matrix.previewUiLab === 'gate_blocked') return 'blocked_by_preview';
  if (matrix.runtimeShadowSnapshot === 'gate_blocked') return 'blocked_by_snapshot_scoring';
  if (matrix.runtimeShadowSnapshot === 'gate_pass_with_watch') return 'ready_with_scoring_watch';
  return 'ready_for_dev_test_candidate_feed';
}

function toMarkdown(report) {
  const lines = [
    '# Phase 142 - Soft Activation Candidate Gate Report',
    '',
    `- gateStatus: ${report.gateStatus}`,
    `- fixturesChecked: ${report.fixturesChecked}`,
    `- candidateFeedsGenerated: ${report.candidateFeedsGenerated}`,
    `- selectedCandidateAlwaysNull: ${report.noWrite.selectedCandidateAlwaysNull}`,
    `- actionsAlwaysEmpty: ${report.noWrite.actionsAlwaysEmpty}`,
    `- canActivateGameplayFalse: ${report.noWrite.canActivateGameplayFalse}`,
    `- canMutateStateFalse: ${report.noWrite.canMutateStateFalse}`,
    `- canMutateSaveFalse: ${report.noWrite.canMutateSaveFalse}`,
    `- runtimeWriteEnabledFalse: ${report.noWrite.runtimeWriteEnabledFalse}`,
    `- productionEnabledFalse: ${report.noWrite.productionEnabledFalse}`,
    '',
    '## Gate Matrix',
    `- assetCatalog: ${report.gateMatrix.assetCatalog}`,
    `- previewUiLab: ${report.gateMatrix.previewUiLab}`,
    `- runtimeShadowSnapshot: ${report.gateMatrix.runtimeShadowSnapshot}`,
    `- safety: ${report.gateMatrix.safety}`,
    `- featureFlags: ${report.gateMatrix.featureFlags}`,
    '',
  ];

  for (const fixture of report.fixtures) {
    lines.push(`## ${fixture.fixtureId}`);
    lines.push(`- plausibility: ${fixture.plausibility.status}`);
    lines.push(`- watch: ${fixture.plausibility.watch.join(', ') || 'none'}`);
    lines.push(`- notes: ${fixture.plausibility.notes.join(', ') || 'none'}`);
    lines.push('- top5:');
    for (const candidate of fixture.candidatesTop5) {
      lines.push(`  - #${candidate.rank} ${candidate.eventId} (${candidate.score})`);
    }
    lines.push('');
  }

  return lines.join('\n') + '\n';
}

function main() {
  const fixtures = readJson(FIXTURES_PATH);

  const fixtureResults = fixtures.map((fixture) => {
    const snapshotEnvelope = createRuntimeSnapshot(fixture.state);
    const evaluation = evaluateRuntimeShadow({
      rootDir: ROOT,
      runtimeSnapshot: fixture.state,
    });

    const candidateModel = createSoftActivationCandidates({
      fixtureId: fixture.id,
      candidates: evaluation.result && Array.isArray(evaluation.result.candidates) ? evaluation.result.candidates : [],
      topN: 5,
    });

    const plausibility = evaluateFixturePlausibility(fixture.id, candidateModel);
    return {
      fixtureId: fixture.id,
      fixtureLabel: fixture.label || fixture.id,
      snapshotWarnings: snapshotEnvelope.warnings || [],
      candidatesTop5: candidateModel.candidates,
      plausibility,
      noWrite: {
        canActivateGameplay: candidateModel.canActivateGameplay,
        canMutateState: candidateModel.canMutateState,
        canMutateSave: candidateModel.canMutateSave,
        runtimeWriteEnabled: candidateModel.runtimeWriteEnabled,
        productionEnabled: candidateModel.productionEnabled,
        selectedCandidate: candidateModel.selectedCandidate,
        actionsEmpty: candidateModel.candidates.every((candidate) => Array.isArray(candidate.actions) && candidate.actions.length === 0),
      },
    };
  });

  const gateMatrix = buildGateMatrix(fixtureResults);
  const noWrite = {
    selectedCandidateAlwaysNull: fixtureResults.every((fixture) => fixture.noWrite.selectedCandidate === null),
    actionsAlwaysEmpty: fixtureResults.every((fixture) => fixture.noWrite.actionsEmpty),
    canActivateGameplayFalse: fixtureResults.every((fixture) => fixture.noWrite.canActivateGameplay === false),
    canMutateStateFalse: fixtureResults.every((fixture) => fixture.noWrite.canMutateState === false),
    canMutateSaveFalse: fixtureResults.every((fixture) => fixture.noWrite.canMutateSave === false),
    runtimeWriteEnabledFalse: fixtureResults.every((fixture) => fixture.noWrite.runtimeWriteEnabled === false),
    productionEnabledFalse: fixtureResults.every((fixture) => fixture.noWrite.productionEnabled === false),
  };

  const gateStatus = toStatus(gateMatrix);
  const watchPoints = fixtureResults.flatMap((fixture) => fixture.plausibility.watch.map((watch) => ({ fixtureId: fixture.fixtureId, watch })));
  const blockers = Object.entries(gateMatrix)
    .filter(([, status]) => status === 'gate_blocked')
    .map(([area]) => area);

  const report = {
    ok: gateStatus === 'ready_for_dev_test_candidate_feed' || gateStatus === 'ready_with_scoring_watch',
    phase: '142',
    gateStatus,
    gateMatrix,
    fixturesChecked: fixtureResults.length,
    candidateFeedsGenerated: fixtureResults.length,
    fixtures: fixtureResults,
    watchPoints,
    blockers,
    noWrite,
    recommendation: gateStatus === 'blocked_by_snapshot_scoring'
      ? 'Phase 143: Snapshot Scoring Calibration Pass'
      : 'Phase 143: Event V2 Dev/Test Candidate Feed Integration – No Write',
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_MD, toMarkdown(report), 'utf8');
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main();
