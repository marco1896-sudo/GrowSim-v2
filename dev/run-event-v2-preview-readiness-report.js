#!/usr/bin/env node
/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');
const { createPreviewDataset } = require('../src/events/v2/preview/EventV2PreviewModel.js');
const { createEventCenterPreviewItems } = require('../src/events/v2/preview/EventV2EventCenterPreviewAdapter.js');

const ROOT = process.cwd();
const EVENT_ROOT = path.join(ROOT, 'data', 'events', 'catalog', 'events');
const OUTPUT_JSON = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-133-preview-readiness-report.json');
const OUTPUT_MD = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-133-preview-readiness-report.md');
const OUTPUT_DATASET = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-133-event-v2-preview-dataset.json');
const OUTPUT_134_JSON = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-134-event-center-preview-report.json');
const OUTPUT_134_MD = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-134-event-center-preview-report.md');

function walkEvents(dir, acc) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkEvents(full, acc);
    else if (entry.isFile() && entry.name.endsWith('.event.json')) acc.push(full);
  }
}

function fileExists(rel) {
  if (!rel || typeof rel !== 'string') return false;
  return fs.existsSync(path.join(ROOT, rel));
}

function toPosixRelative(abs) {
  return path.relative(ROOT, abs).replace(/\\/g, '/');
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

  const items = dataset.map((row) => {
    const previewExists = fileExists(row.previewImagePath);
    const assetRefExists = fileExists(row.assetRefHero);
    const coverExists = fileExists(row.coverSrc);

    let previewStatus = 'ready_for_ui_lab_preview';
    if (!previewExists) previewStatus = 'missing_preview_asset';
    if (!row.previewImagePath || typeof row.previewImagePath !== 'string') previewStatus = 'invalid_preview_path';

    return {
      ...row,
      previewExists,
      assetRefHeroExists: assetRefExists,
      coverSrcExists: coverExists,
      previewStatus,
    };
  });

  const summary = {
    eventsChecked: items.length,
    previewReady: items.filter((x) => x.previewStatus === 'ready_for_ui_lab_preview').length,
    missingPreviewAssets: items.filter((x) => x.previewStatus === 'missing_preview_asset').length,
    invalidPreviewPaths: items.filter((x) => x.previewStatus === 'invalid_preview_path').length,
    viaAssetRefHero: items.filter((x) => x.previewImageSource === 'assetRefs.hero').length,
    viaCoverSrc: items.filter((x) => x.previewImageSource === 'assets.cover.src').length,
    assetRefHeroAvailable: items.filter((x) => x.assetRefHeroExists).length,
    coverSrcAvailable: items.filter((x) => x.coverSrcExists).length,
    brokenFallbackChains: items.filter((x) => !x.previewExists).length,
  };

  const report = {
    ok: summary.missingPreviewAssets === 0 && summary.invalidPreviewPaths === 0,
    phase: '133',
    mode: 'dev_only_preview_readiness',
    visiblePreviewPath: 'ui_lab_catalog_adapter_with_eventv2_preview_model',
    summary,
    status: {
      ui_lab: 'ready_for_ui_lab_preview',
      shadow: 'ready_for_shadow_preview',
      event_center: 'needs_preview_adapter',
    },
    items,
  };

  fs.mkdirSync(path.dirname(OUTPUT_JSON), { recursive: true });
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUTPUT_DATASET, JSON.stringify({ phase: '133', events: items }, null, 2) + '\n', 'utf8');

  const lines = [
    '# Phase 133 - Preview Readiness Report',
    '',
    `- eventsChecked: ${summary.eventsChecked}`,
    `- previewReady: ${summary.previewReady}`,
    `- missingPreviewAssets: ${summary.missingPreviewAssets}`,
    `- invalidPreviewPaths: ${summary.invalidPreviewPaths}`,
    `- viaAssetRefHero: ${summary.viaAssetRefHero}`,
    `- viaCoverSrc: ${summary.viaCoverSrc}`,
    `- assetRefHeroAvailable: ${summary.assetRefHeroAvailable}`,
    `- coverSrcAvailable: ${summary.coverSrcAvailable}`,
    `- brokenFallbackChains: ${summary.brokenFallbackChains}`,
    '',
    '## Status',
    `- ui_lab: ${report.status.ui_lab}`,
    `- shadow: ${report.status.shadow}`,
    `- event_center: ${report.status.event_center}`,
  ];
  fs.writeFileSync(OUTPUT_MD, lines.join('\n') + '\n', 'utf8');

  const previewItems = createEventCenterPreviewItems(items);
  const itemChecks = previewItems.map((item) => {
    const imageExists = fileExists(item.imageSrc);
    const hasRequired = Boolean(item.id && item.title && item.category && item.environment);
    const status = !hasRequired
      ? 'missing_required_preview_field'
      : (!imageExists ? 'missing_preview_asset' : 'preview_surface_ready');
    return Object.assign({}, item, {
      imageExists,
      hasRequiredFields: hasRequired,
      status,
    });
  });
  const summary134 = {
    eventsChecked: itemChecks.length,
    previewItemsGenerated: previewItems.length,
    validImageItems: itemChecks.filter((x) => x.imageExists).length,
    missingPreviewAsset: itemChecks.filter((x) => x.status === 'missing_preview_asset').length,
    missingRequiredPreviewField: itemChecks.filter((x) => x.status === 'missing_required_preview_field').length,
    brokenPaths: itemChecks.filter((x) => !x.imageExists).length,
    previewAdapterStatus: previewItems.length === 22 ? 'preview_adapter_ready' : 'blocked_by_ui_lab_surface',
  };
  const report134 = {
    ok: summary134.missingPreviewAsset === 0 && summary134.missingRequiredPreviewField === 0,
    phase: '134',
    mode: 'dev_only_event_center_preview_report',
    summary: summary134,
    status: {
      previewSurface: summary134.previewAdapterStatus,
      uiLab: 'ready_for_ui_lab_preview',
      shadow: 'ready_for_shadow_preview',
    },
    items: itemChecks,
  };
  fs.writeFileSync(OUTPUT_134_JSON, JSON.stringify(report134, null, 2) + '\n', 'utf8');
  const lines134 = [
    '# Phase 134 - Event Center Preview Report',
    '',
    `- eventsChecked: ${summary134.eventsChecked}`,
    `- previewItemsGenerated: ${summary134.previewItemsGenerated}`,
    `- validImageItems: ${summary134.validImageItems}`,
    `- missingPreviewAsset: ${summary134.missingPreviewAsset}`,
    `- missingRequiredPreviewField: ${summary134.missingRequiredPreviewField}`,
    `- brokenPaths: ${summary134.brokenPaths}`,
    `- previewAdapterStatus: ${summary134.previewAdapterStatus}`,
  ];
  fs.writeFileSync(OUTPUT_134_MD, lines134.join('\n') + '\n', 'utf8');

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main();
