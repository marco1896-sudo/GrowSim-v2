#!/usr/bin/env node
/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');
const { createRuntimeShadowDevController } = require('../src/events/v2/preview/EventV2RuntimeShadowDevController.js');

const ROOT = process.cwd();
const OUT_JSON = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-150-runtime-shadow-dev-toggle-report.json');
const OUT_MD = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-150-runtime-shadow-dev-toggle-report.md');

function hasFlag(argv, name) {
  return argv.includes(name);
}

function fileExists(relPath) {
  return typeof relPath === 'string' && relPath.trim() && fs.existsSync(path.join(ROOT, relPath));
}

function toMarkdown(report) {
  const s = report.summary;
  return [
    '# Phase 150 - Runtime Shadow Dev Toggle Report',
    '',
    `- mode: ${report.mode}`,
    `- enabled: ${report.enabled}`,
    `- reason: ${report.reason}`,
    `- fixtures: ${s.fixtures}`,
    `- shadowEvaluations: ${s.shadowEvaluations}`,
    `- candidateItems: ${s.candidateItems}`,
    `- validImages: ${s.validImages}`,
    `- brokenPaths: ${s.brokenPaths}`,
    `- selectedCandidateNull: ${s.selectedCandidateNull}`,
    `- actionsEmpty: ${s.actionsEmpty}`,
    `- runtimeWriteFalse: ${s.runtimeWriteFalse}`,
    `- productionFalse: ${s.productionFalse}`,
    `- saveStorageWrites: ${s.saveStorageWrites}`,
    `- ok: ${report.ok}`,
    '',
  ].join('\n');
}

function main() {
  const enable = hasFlag(process.argv.slice(2), '--enable-runtime-shadow-dev');
  const result = createRuntimeShadowDevController({
    rootDir: ROOT,
    enableRuntimeShadowDev: enable,
    environment: 'local',
    hostname: 'localhost',
  });

  const items = Array.isArray(result.candidateItems) ? result.candidateItems : [];
  const shadowResults = Array.isArray(result.shadowResults) ? result.shadowResults : [];
  const summary = {
    fixtures: Array.isArray(result.fixtures) ? result.fixtures.length : 0,
    shadowEvaluations: shadowResults.reduce((sum, entry) => sum + Number(entry.eventsEvaluated || 0), 0),
    candidateItems: items.length,
    validImages: items.filter((item) => fileExists(item.imageSrc)).length,
    brokenPaths: items.filter((item) => !fileExists(item.imageSrc)).length,
    selectedCandidateNull: result.selectedCandidate === null,
    actionsEmpty: Array.isArray(result.actions) && result.actions.length === 0 && items.every((item) => Array.isArray(item.actions) && item.actions.length === 0),
    runtimeWriteFalse: result.runtimeWriteEnabled === false && items.every((item) => item.runtimeWriteEnabled === false),
    productionFalse: result.productionEnabled === false && items.every((item) => item.productionEnabled === false),
    saveStorageWrites: Number(result.diagnostics && result.diagnostics.saveWrites || 0)
      + Number(result.diagnostics && result.diagnostics.localStorageWrites || 0)
      + Number(result.diagnostics && result.diagnostics.indexedDbWrites || 0),
  };

  const report = {
    ok: enable
      ? (result.enabled === true
        && summary.fixtures === 3
        && summary.shadowEvaluations === 66
        && summary.candidateItems === 15
        && summary.validImages === 15
        && summary.brokenPaths === 0
        && summary.selectedCandidateNull
        && summary.actionsEmpty
        && summary.runtimeWriteFalse
        && summary.productionFalse
        && summary.saveStorageWrites === 0)
      : (result.enabled === false && result.reason === 'runtime_shadow_toggle_disabled_by_default'),
    mode: enable ? 'runtime_shadow_dev_enabled' : 'runtime_shadow_default_disabled',
    enabled: result.enabled,
    reason: result.reason,
    summary,
    fixtures: result.fixtures,
    shadowResults,
    candidateItemsPreview: items.slice(0, 5).map((item) => ({
      fixtureId: item.fixtureId,
      rank: item.rank,
      eventId: item.eventId,
      score: item.score,
      imageSrc: item.imageSrc,
    })),
    contract: {
      selectedCandidate: result.selectedCandidate,
      actions: result.actions,
      canActivateGameplay: result.canActivateGameplay,
      canMutateState: result.canMutateState,
      canMutateSave: result.canMutateSave,
      runtimeWriteEnabled: result.runtimeWriteEnabled,
      productionEnabled: result.productionEnabled,
      diagnostics: result.diagnostics,
    },
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_MD, toMarkdown(report), 'utf8');
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main();

