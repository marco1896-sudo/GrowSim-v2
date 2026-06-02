#!/usr/bin/env node
/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');
const { createPreviewDataset } = require('../src/events/v2/preview/EventV2PreviewModel.js');
const { createEventCenterPreviewItems } = require('../src/events/v2/preview/EventV2EventCenterPreviewAdapter.js');
const { createShadowFeed } = require('../src/events/v2/preview/EventV2ShadowFeedModel.js');
const { createEventCenterPreviewBridgeItems } = require('../src/events/v2/preview/EventV2EventCenterPreviewBridge.js');
const { EVENT_V2_PREVIEW_FLAGS } = require('../src/events/v2/preview/EventV2PreviewFlags.js');

const ROOT = process.cwd();
const EVENT_ROOT = path.join(ROOT, 'data', 'events', 'catalog', 'events');
const OUT_JSON = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-139-event-center-preview-bridge-report.json');
const OUT_MD = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-139-event-center-preview-bridge-report.md');

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

function fileExists(rel) {
  return typeof rel === 'string' && rel.trim() ? fs.existsSync(path.join(ROOT, rel)) : false;
}

function toReadiness(summary) {
  if (summary.bridgeItems === 0 || summary.brokenPaths > 0 || summary.missingActionsContract > 0) {
    return 'event_center_preview_bridge_blocked';
  }
  if (summary.watchLikeItems > 0) {
    return 'event_center_preview_bridge_ready_with_watch';
  }
  return 'event_center_preview_bridge_ready';
}

function main() {
  const files = [];
  walkEvents(EVENT_ROOT, files);
  files.sort();

  const docs = files.map((abs) => ({
    sourcePath: toPosixRelative(abs),
    eventDoc: JSON.parse(fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, '')),
  }));

  const dataset = createPreviewDataset(docs, { placeholderPath: 'assets/events/event-stress-recovery.png' });
  const enrichedDataset = dataset.map((row) => ({
    ...row,
    previewExists: fileExists(row.previewImagePath),
    previewStatus: fileExists(row.previewImagePath) ? 'ready_for_ui_lab_preview' : 'missing_preview_asset',
  }));

  const previewItems = createEventCenterPreviewItems(enrichedDataset).map((item) => ({
    ...item,
    imageExists: fileExists(item.imageSrc),
    hasRequiredFields: Boolean(item.id && item.title && item.category && item.environment),
  }));

  const shadowFeed = createShadowFeed(previewItems, {});
  const bridgeItems = createEventCenterPreviewBridgeItems(shadowFeed.items);

  const checks = bridgeItems.map((item) => {
    const imageExists = fileExists(item.imageSrc);
    const actionsOk = Array.isArray(item.actions) && item.actions.length === 0;
    return {
      ...item,
      imageExists,
      actionsOk,
      bridgeStatus: item.debug && item.debug.bridgeStatus ? item.debug.bridgeStatus : 'event_center_preview_bridge_ready',
    };
  });

  const summary = {
    eventsChecked: files.length,
    previewItems: previewItems.length,
    shadowFeedItems: shadowFeed.items.length,
    bridgeItems: checks.length,
    validImages: checks.filter((x) => x.imageExists).length,
    brokenPaths: checks.filter((x) => !x.imageExists).length,
    isEventV2PreviewTrue: checks.filter((x) => x.isEventV2Preview === true).length,
    isShadowOnlyTrue: checks.filter((x) => x.isShadowOnly === true).length,
    canActivateGameplayFalse: checks.filter((x) => x.canActivateGameplay === false).length,
    canMutateSaveFalse: checks.filter((x) => x.canMutateSave === false).length,
    actionsEmpty: checks.filter((x) => Array.isArray(x.actions) && x.actions.length === 0).length,
    missingActionsContract: checks.filter((x) => !x.actionsOk).length,
    watchLikeItems: checks.filter((x) => x.feedStatus === 'shadow_feed_watch_asset' || x.feedStatus === 'shadow_feed_polish_later').length,
  };

  const readinessStatus = toReadiness(summary);

  const report = {
    ok: summary.bridgeItems === 22
      && summary.validImages === 22
      && summary.brokenPaths === 0
      && summary.isEventV2PreviewTrue === 22
      && summary.isShadowOnlyTrue === 22
      && summary.canActivateGameplayFalse === 22
      && summary.canMutateSaveFalse === 22
      && summary.actionsEmpty === 22
      && summary.missingActionsContract === 0,
    phase: '139',
    mode: 'dev_only_event_center_preview_bridge',
    readinessStatus,
    flags: EVENT_V2_PREVIEW_FLAGS,
    noGameplayActivation: true,
    noSaveMutation: true,
    noRuntimeCutover: true,
    summary,
    items: checks,
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');

  const md = [
    '# Phase 139 - Event Center Preview Bridge Report',
    '',
    `- readinessStatus: ${report.readinessStatus}`,
    `- eventsChecked: ${summary.eventsChecked}`,
    `- bridgeItems: ${summary.bridgeItems}`,
    `- validImages: ${summary.validImages}`,
    `- brokenPaths: ${summary.brokenPaths}`,
    `- isEventV2PreviewTrue: ${summary.isEventV2PreviewTrue}/22`,
    `- isShadowOnlyTrue: ${summary.isShadowOnlyTrue}/22`,
    `- canActivateGameplayFalse: ${summary.canActivateGameplayFalse}/22`,
    `- canMutateSaveFalse: ${summary.canMutateSaveFalse}/22`,
    `- actionsEmpty: ${summary.actionsEmpty}/22`,
    `- missingActionsContract: ${summary.missingActionsContract}`,
    `- watchLikeItems: ${summary.watchLikeItems}`,
    `- ok: ${report.ok}`,
  ];
  fs.writeFileSync(OUT_MD, md.join('\n') + '\n', 'utf8');

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main();
