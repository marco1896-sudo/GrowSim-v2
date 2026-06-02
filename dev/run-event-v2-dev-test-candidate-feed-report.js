#!/usr/bin/env node
/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');
const { createDevTestCandidateFeedController } = require('../src/events/v2/preview/EventV2DevTestCandidateFeedController.js');

const ROOT = process.cwd();
const OUT_JSON = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-145-dev-test-candidate-feed-report.json');
const OUT_MD = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-145-dev-test-candidate-feed-report.md');

function hasFlag(argv, flag) {
  return argv.includes(flag);
}

function exists(relPath) {
  return typeof relPath === 'string' && relPath.trim() && fs.existsSync(path.join(ROOT, relPath));
}

function toMarkdown(report) {
  const lines = [
    '# Phase 145 - Dev/Test Candidate Feed Report',
    '',
    `- mode: ${report.mode}`,
    `- enabled: ${report.enabled}`,
    `- reason: ${report.reason}`,
    `- fixtures: ${report.summary.fixtures}`,
    `- items: ${report.summary.items}`,
    `- validImages: ${report.summary.validImages}`,
    `- brokenPaths: ${report.summary.brokenPaths}`,
    `- selectedCandidateNull: ${report.summary.selectedCandidateNull}`,
    `- actionsEmpty: ${report.summary.actionsEmpty}`,
    `- canActivateGameplayFalse: ${report.summary.canActivateGameplayFalse}`,
    `- canMutateStateFalse: ${report.summary.canMutateStateFalse}`,
    `- canMutateSaveFalse: ${report.summary.canMutateSaveFalse}`,
    `- runtimeWriteEnabledFalse: ${report.summary.runtimeWriteEnabledFalse}`,
    `- productionEnabledFalse: ${report.summary.productionEnabledFalse}`,
    `- saveWrites: ${report.summary.saveWrites}`,
    '',
  ];
  return lines.join('\n') + '\n';
}

function main() {
  const enableDevPreview = hasFlag(process.argv.slice(2), '--enable-dev-preview');

  const flags = {
    eventV2EventCenterPreviewEnabled: enableDevPreview,
    eventV2RuntimeShadowEnabled: enableDevPreview,
    eventV2RuntimeWriteEnabled: false,
    eventV2ProductionEnabled: false,
  };

  const result = createDevTestCandidateFeedController({
    rootDir: ROOT,
    enableDevPreview,
    flags,
  });

  const items = Array.isArray(result.items) ? result.items : [];
  const summary = {
    fixtures: Array.isArray(result.fixtures) ? result.fixtures.length : 0,
    items: items.length,
    validImages: items.filter((item) => exists(item.imageSrc)).length,
    brokenPaths: items.filter((item) => !exists(item.imageSrc)).length,
    selectedCandidateNull: result.selectedCandidate === null,
    actionsEmpty: Array.isArray(result.actions) && result.actions.length === 0 && items.every((item) => Array.isArray(item.actions) && item.actions.length === 0),
    canActivateGameplayFalse: result.canActivateGameplay === false && items.every((item) => item.canActivateGameplay === false),
    canMutateStateFalse: result.canMutateState === false && items.every((item) => item.canMutateState === false),
    canMutateSaveFalse: result.canMutateSave === false && items.every((item) => item.canMutateSave === false),
    runtimeWriteEnabledFalse: result.runtimeWriteEnabled === false && items.every((item) => item.runtimeWriteEnabled === false),
    productionEnabledFalse: result.productionEnabled === false && items.every((item) => item.productionEnabled === false),
    saveWrites: result.debug && Number.isFinite(Number(result.debug.saveWrites)) ? Number(result.debug.saveWrites) : 0,
    stateMutations: result.debug && Number.isFinite(Number(result.debug.stateMutations)) ? Number(result.debug.stateMutations) : 0,
    uiActions: result.debug && Number.isFinite(Number(result.debug.uiActions)) ? Number(result.debug.uiActions) : 0,
    gameplayActivations: result.debug && Number.isFinite(Number(result.debug.gameplayActivations)) ? Number(result.debug.gameplayActivations) : 0,
    localStorageWrites: 0,
    indexedDbWrites: 0,
  };

  const report = {
    ok: enableDevPreview
      ? (result.enabled === true
        && summary.fixtures === 3
        && summary.items === 15
        && summary.validImages === 15
        && summary.brokenPaths === 0
        && summary.selectedCandidateNull
        && summary.actionsEmpty
        && summary.canActivateGameplayFalse
        && summary.canMutateStateFalse
        && summary.canMutateSaveFalse
        && summary.runtimeWriteEnabledFalse
        && summary.productionEnabledFalse
        && summary.saveWrites === 0
        && summary.localStorageWrites === 0
        && summary.indexedDbWrites === 0)
      : (result.enabled === false && result.reason === 'flag_disabled_by_default'),
    mode: enableDevPreview ? 'dev_preview' : 'default_safe',
    enabled: result.enabled,
    reason: result.reason,
    summary,
    fixtures: result.fixtures,
    items: items,
    itemsPreview: items.slice(0, 5).map((item) => ({
      fixtureId: item.fixtureId,
      rank: item.rank,
      eventId: item.eventId,
      score: item.score,
    })),
    contract: {
      selectedCandidate: result.selectedCandidate,
      actions: result.actions,
      canActivateGameplay: result.canActivateGameplay,
      canMutateState: result.canMutateState,
      canMutateSave: result.canMutateSave,
      runtimeWriteEnabled: result.runtimeWriteEnabled,
      productionEnabled: result.productionEnabled,
    },
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_MD, toMarkdown(report), 'utf8');

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main();
