#!/usr/bin/env node
/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT_JSON = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-138-activation-readiness-report.json');
const OUT_MD = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-138-activation-readiness-report.md');

function readJson(relPath) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) return null;
  return JSON.parse(fs.readFileSync(abs, 'utf8'));
}

function checkList() {
  const activeAssetRef = readJson('data/events/catalog/_planning/phase-137-shadow-feed-browser-smoke-report.json');
  const shadowFeed = readJson('data/events/catalog/_planning/phase-136-shadow-feed-readiness-report.json');
  const previewSmoke = readJson('data/events/catalog/_planning/phase-135-preview-browser-smoke-report.json');
  const visualQa = readJson('data/events/catalog/_planning/phase-137-shadow-feed-visual-qa-report.json');

  const checks = {
    previewBrowserSmokeOk: Boolean(previewSmoke && previewSmoke.ok === true),
    shadowFeedReadinessOk: Boolean(shadowFeed && shadowFeed.ok === true),
    shadowFeedBrowserSmokeOk: Boolean(activeAssetRef && activeAssetRef.ok === true),
    shadowVisualQaOk: Boolean(visualQa && visualQa.ok === true),
    shadowFeedItems22: Boolean(shadowFeed && shadowFeed.summary && shadowFeed.summary.shadowFeedItems === 22),
    shadowImages22: Boolean(shadowFeed && shadowFeed.summary && shadowFeed.summary.validImages === 22),
    noBrokenPaths: Boolean(shadowFeed && shadowFeed.summary && shadowFeed.summary.brokenPaths === 0),
    noGameplayActivation: Boolean(shadowFeed && shadowFeed.summary && shadowFeed.summary.canActivateGameplayFalse === 22),
    noSaveMutation: Boolean(shadowFeed && shadowFeed.summary && shadowFeed.summary.canMutateSaveFalse === 22),
    bridgeCompatible22: Boolean(shadowFeed && shadowFeed.summary && shadowFeed.summary.bridgeCompatibleItems === 22),
  };

  const all = Object.values(checks);
  const passCount = all.filter(Boolean).length;

  let readinessStatus = 'activation_not_ready';
  if (checks.previewBrowserSmokeOk && checks.shadowFeedReadinessOk) {
    readinessStatus = 'ready_for_event_center_preview';
  }
  if (checks.previewBrowserSmokeOk && checks.shadowFeedReadinessOk && checks.shadowFeedBrowserSmokeOk && checks.noGameplayActivation && checks.noSaveMutation) {
    readinessStatus = 'ready_for_runtime_shadow';
  }
  if (readinessStatus === 'ready_for_runtime_shadow' && checks.bridgeCompatible22 && checks.shadowVisualQaOk) {
    readinessStatus = 'ready_for_dev_soft_activation';
  }

  return {
    ok: readinessStatus !== 'activation_not_ready',
    phase: '138',
    mode: 'dev_only_activation_readiness',
    readinessStatus,
    checks,
    passCount,
    totalChecks: all.length,
    notes: {
      gameplayActivationExecuted: false,
      runtimeCutoverExecuted: false,
      saveMutationExecuted: false,
      productionUiSwitchExecuted: false,
    },
  };
}

function main() {
  const report = checkList();
  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');

  const lines = [
    '# Phase 138 - Activation Readiness Report',
    '',
    `- readinessStatus: ${report.readinessStatus}`,
    `- passCount: ${report.passCount}/${report.totalChecks}`,
    `- previewBrowserSmokeOk: ${report.checks.previewBrowserSmokeOk}`,
    `- shadowFeedReadinessOk: ${report.checks.shadowFeedReadinessOk}`,
    `- shadowFeedBrowserSmokeOk: ${report.checks.shadowFeedBrowserSmokeOk}`,
    `- shadowVisualQaOk: ${report.checks.shadowVisualQaOk}`,
    `- shadowFeedItems22: ${report.checks.shadowFeedItems22}`,
    `- shadowImages22: ${report.checks.shadowImages22}`,
    `- noBrokenPaths: ${report.checks.noBrokenPaths}`,
    `- noGameplayActivation: ${report.checks.noGameplayActivation}`,
    `- noSaveMutation: ${report.checks.noSaveMutation}`,
    `- bridgeCompatible22: ${report.checks.bridgeCompatible22}`,
  ];
  fs.writeFileSync(OUT_MD, lines.join('\n') + '\n', 'utf8');

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main();
