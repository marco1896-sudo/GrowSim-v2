#!/usr/bin/env node
/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');
const { evaluateRuntimeShadow } = require('../src/events/v2/shadow/EventV2RuntimeShadowEvaluator.js');
const { createPreviewDataset } = require('../src/events/v2/preview/EventV2PreviewModel.js');
const { createEventCenterPreviewItems } = require('../src/events/v2/preview/EventV2EventCenterPreviewAdapter.js');
const { createShadowFeed } = require('../src/events/v2/preview/EventV2ShadowFeedModel.js');
const { createEventCenterPreviewBridgeItems } = require('../src/events/v2/preview/EventV2EventCenterPreviewBridge.js');

const ROOT = process.cwd();
const EVENT_ROOT = path.join(ROOT, 'data', 'events', 'catalog', 'events');
const OUT_JSON = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-140-runtime-shadow-evaluation-report.json');
const OUT_MD = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-140-runtime-shadow-evaluation-report.md');

function walkEvents(dir, acc) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkEvents(full, acc);
    else if (entry.isFile() && entry.name.endsWith('.event.json')) acc.push(full);
  }
}

function toPosixRelative(abs) {
  return path.relative(ROOT, abs).replace(/\\/g, '/');
}

function exists(rel) {
  return typeof rel === 'string' && rel.trim() ? fs.existsSync(path.join(ROOT, rel)) : false;
}

function main() {
  const evalResult = evaluateRuntimeShadow({ rootDir: ROOT });

  const files = [];
  walkEvents(EVENT_ROOT, files);
  files.sort();
  const docs = files.map((abs) => ({
    sourcePath: toPosixRelative(abs),
    eventDoc: JSON.parse(fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, '')),
  }));
  const dataset = createPreviewDataset(docs, { placeholderPath: 'assets/events/event-stress-recovery.png' }).map((row) => ({
    ...row,
    previewExists: exists(row.previewImagePath),
  }));
  const previewItems = createEventCenterPreviewItems(dataset).map((item) => ({
    ...item,
    imageExists: exists(item.imageSrc),
  }));
  const shadowFeed = createShadowFeed(previewItems, {});
  const bridgeItems = createEventCenterPreviewBridgeItems(shadowFeed.items);
  const bridgeIds = new Set(bridgeItems.map((x) => x.eventId));

  const candidates = Array.isArray(evalResult.result && evalResult.result.candidates)
    ? evalResult.result.candidates
    : [];

  const candidateChecks = candidates.map((c) => ({
    ...c,
    imageExists: exists(c.imageSrc),
    bridgeCompatible: bridgeIds.has(c.eventId),
    hasScoreOrReason: Number.isFinite(Number(c.score)) || Boolean(c.reason),
  }));

  const summary = {
    eventsEvaluated: candidateChecks.length,
    candidatesGenerated: candidateChecks.length,
    validImages: candidateChecks.filter((c) => c.imageExists).length,
    brokenPaths: candidateChecks.filter((c) => !c.imageExists).length,
    bridgeCompatible: candidateChecks.filter((c) => c.bridgeCompatible).length,
    canMutateStateFalse: evalResult.canMutateState === false,
    canMutateSaveFalse: evalResult.canMutateSave === false,
    canActivateGameplayFalse: evalResult.canActivateGameplay === false,
    stateMutations: evalResult.mutationGuards ? evalResult.mutationGuards.stateMutations : null,
    saveWrites: evalResult.mutationGuards ? evalResult.mutationGuards.saveWrites : null,
    uiActions: evalResult.mutationGuards ? evalResult.mutationGuards.uiActions : null,
    gameplayActivations: evalResult.mutationGuards ? evalResult.mutationGuards.gameplayActivations : null,
  };

  let readinessStatus = 'runtime_shadow_ready';
  if (evalResult.inputSummary && !evalResult.inputSummary.hasRuntimeState) {
    readinessStatus = 'runtime_shadow_ready_with_static_scoring';
  }
  if (summary.eventsEvaluated === 0) {
    readinessStatus = 'runtime_shadow_blocked_missing_inputs';
  }
  if (!(summary.canMutateStateFalse && summary.canMutateSaveFalse && summary.canActivateGameplayFalse)) {
    readinessStatus = 'runtime_shadow_blocked_mutation_risk';
  }

  const report = {
    ok: summary.eventsEvaluated === 22
      && summary.candidatesGenerated === 22
      && summary.validImages === 22
      && summary.brokenPaths === 0
      && summary.canMutateStateFalse
      && summary.canMutateSaveFalse
      && summary.canActivateGameplayFalse
      && summary.stateMutations === 0
      && summary.saveWrites === 0
      && summary.uiActions === 0
      && summary.gameplayActivations === 0,
    phase: '140',
    mode: 'runtime_shadow_no_write_parallel_run',
    readinessStatus,
    noWriteContract: {
      canMutateState: evalResult.canMutateState,
      canMutateSave: evalResult.canMutateSave,
      canActivateGameplay: evalResult.canActivateGameplay,
      stateMutations: summary.stateMutations,
      saveWrites: summary.saveWrites,
      uiActions: summary.uiActions,
      gameplayActivations: summary.gameplayActivations,
    },
    compatibility: {
      previewModel: true,
      previewAdapter: true,
      shadowFeedModel: true,
      eventCenterPreviewBridge: true,
      bridgeCompatibleItems: summary.bridgeCompatible,
      totalEvaluated: summary.eventsEvaluated,
    },
    summary,
    evaluation: {
      inputSummary: evalResult.inputSummary,
      warnings: evalResult.result ? evalResult.result.warnings : [],
      blocked: evalResult.result ? evalResult.result.blocked : [],
      candidates: candidateChecks,
    },
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');

  const md = [
    '# Phase 140 - Runtime Shadow Evaluation Report',
    '',
    `- readinessStatus: ${readinessStatus}`,
    `- eventsEvaluated: ${summary.eventsEvaluated}`,
    `- candidatesGenerated: ${summary.candidatesGenerated}`,
    `- validImages: ${summary.validImages}`,
    `- brokenPaths: ${summary.brokenPaths}`,
    `- canMutateStateFalse: ${summary.canMutateStateFalse}`,
    `- canMutateSaveFalse: ${summary.canMutateSaveFalse}`,
    `- canActivateGameplayFalse: ${summary.canActivateGameplayFalse}`,
    `- stateMutations: ${summary.stateMutations}`,
    `- saveWrites: ${summary.saveWrites}`,
    `- uiActions: ${summary.uiActions}`,
    `- gameplayActivations: ${summary.gameplayActivations}`,
    `- bridgeCompatible: ${summary.bridgeCompatible}/${summary.eventsEvaluated}`,
    `- ok: ${report.ok}`,
  ];
  fs.writeFileSync(OUT_MD, md.join('\n') + '\n', 'utf8');

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main();
