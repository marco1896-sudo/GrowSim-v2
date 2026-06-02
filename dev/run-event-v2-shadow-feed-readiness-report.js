#!/usr/bin/env node
/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');
const { createPreviewDataset } = require('../src/events/v2/preview/EventV2PreviewModel.js');
const { createEventCenterPreviewItems } = require('../src/events/v2/preview/EventV2EventCenterPreviewAdapter.js');
const { createShadowFeed } = require('../src/events/v2/preview/EventV2ShadowFeedModel.js');
const { runFullAdapterMatrix } = require('../src/events/v2/ui-lab/qa/EventV2AdapterMatrix.js');

const ROOT = process.cwd();
const EVENT_ROOT = path.join(ROOT, 'data', 'events', 'catalog', 'events');
const OUT_JSON = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-136-shadow-feed-readiness-report.json');
const OUT_MD = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-136-shadow-feed-readiness-report.md');

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

function main() {
  const files = [];
  walkEvents(EVENT_ROOT, files);
  files.sort();

  const docs = files.map((abs) => ({
    sourcePath: toPosixRelative(abs),
    eventDoc: JSON.parse(fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, '')),
  }));

  const dataset = createPreviewDataset(docs, { placeholderPath: 'assets/events/event-stress-recovery.png' });

  const enriched = dataset.map((row) => {
    const previewExists = fileExists(row.previewImagePath);
    return {
      ...row,
      previewExists,
      assetRefHeroExists: fileExists(row.assetRefHero),
      coverSrcExists: fileExists(row.coverSrc),
      previewStatus: previewExists ? 'ready_for_ui_lab_preview' : 'missing_preview_asset',
    };
  });

  const previewItems = createEventCenterPreviewItems(enriched).map((item) => ({
    ...item,
    imageExists: fileExists(item.imageSrc),
    hasRequiredFields: Boolean(item.id && item.title && item.category && item.environment),
  }));

  const shadowFeed = createShadowFeed(previewItems, {});
  const feedItems = shadowFeed.items;

  const brokenPaths = feedItems.filter((x) => !fileExists(x.imageSrc)).map((x) => x.eventId);
  const missingIds = feedItems.filter((x) => !x.eventId || x.eventId === 'unknown_event').map((x) => x.id);
  const canActivateGameplayFalse = feedItems.filter((x) => x.canActivateGameplay === false).length;
  const canMutateSaveFalse = feedItems.filter((x) => x.canMutateSave === false).length;

  const matrix = runFullAdapterMatrix({
    projectRoot: ROOT,
    locale: 'de',
    fallbackLocale: 'en',
    compactMode: true,
  });

  const bridgePassCount = (matrix.rows || []).filter((row) => row.bridgeReadiness === 'bridgePass' || row.bridgeReadiness === 'pass').length;

  const summary = {
    eventsChecked: files.length,
    previewItems: previewItems.length,
    shadowFeedItems: feedItems.length,
    validImages: feedItems.filter((x) => fileExists(x.imageSrc)).length,
    brokenPaths: brokenPaths.length,
    canActivateGameplayFalse,
    canMutateSaveFalse,
    bridgeCompatibleItems: bridgePassCount,
    bridgeTotalRows: (matrix.rows || []).length,
    statusCounts: shadowFeed.summary.statusCounts,
  };

  const report = {
    ok: summary.shadowFeedItems === 22 && summary.validImages === 22 && summary.brokenPaths === 0 && canActivateGameplayFalse === 22 && canMutateSaveFalse === 22,
    phase: '136',
    mode: 'dev_only_shadow_feed_readiness',
    runtimeMutation: false,
    saveMutation: false,
    gameplayActivation: false,
    summary,
    integration: {
      source: 'event_v2_catalog_shadow',
      deterministicOrder: true,
      previewModelUsed: true,
      previewAdapterUsed: true,
      shadowFeedModelUsed: true,
      bridgeCompatibility: {
        ok: bridgePassCount === (matrix.rows || []).length,
        bridgePassCount,
        totalRows: (matrix.rows || []).length,
      },
    },
    brokenPathEventIds: brokenPaths,
    missingEventIds: missingIds,
    items: feedItems,
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');

  const md = [
    '# Phase 136 - Shadow Feed Readiness Report',
    '',
    `- eventsChecked: ${summary.eventsChecked}`,
    `- previewItems: ${summary.previewItems}`,
    `- shadowFeedItems: ${summary.shadowFeedItems}`,
    `- validImages: ${summary.validImages}`,
    `- brokenPaths: ${summary.brokenPaths}`,
    `- canActivateGameplayFalse: ${summary.canActivateGameplayFalse}/22`,
    `- canMutateSaveFalse: ${summary.canMutateSaveFalse}/22`,
    `- bridgeCompatibleItems: ${summary.bridgeCompatibleItems}/${summary.bridgeTotalRows}`,
    `- shadow_feed_ready: ${summary.statusCounts.shadow_feed_ready}`,
    `- shadow_feed_watch_asset: ${summary.statusCounts.shadow_feed_watch_asset}`,
    `- shadow_feed_polish_later: ${summary.statusCounts.shadow_feed_polish_later}`,
    `- shadow_feed_blocked: ${summary.statusCounts.shadow_feed_blocked}`,
    `- ok: ${report.ok}`,
  ];
  fs.writeFileSync(OUT_MD, md.join('\n') + '\n', 'utf8');

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main();
