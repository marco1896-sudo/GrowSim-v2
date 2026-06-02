#!/usr/bin/env node
/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');
const { createEventCenterCandidatePreviewModel } = require('../src/events/v2/preview/EventV2EventCenterCandidatePreviewModel.js');

const ROOT = process.cwd();
const OUT_JSON = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-152-event-center-context-browser-smoke-report.json');
const OUT_MD = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-152-event-center-context-browser-smoke-report.md');
const SOURCE_JSON = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-152-event-center-context-source.json');
const VIEWPORTS = [360, 390, 430, 768];

function contentType(filePath) {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.html')) return 'text/html; charset=utf-8';
  if (lower.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (lower.endsWith('.json')) return 'application/json; charset=utf-8';
  if (lower.endsWith('.css')) return 'text/css; charset=utf-8';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}

function createServer(rootDir) {
  const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url, 'http://localhost');
    let rel = decodeURIComponent(reqUrl.pathname);
    if (rel === '/') rel = '/dev/event-v2-preview-gallery.html';
    const abs = path.join(rootDir, rel);
    const norm = path.normalize(abs);
    if (!norm.startsWith(path.normalize(rootDir))) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    fs.stat(norm, (err, stats) => {
      if (err || !stats.isFile()) { res.writeHead(404); res.end('Not Found'); return; }
      res.writeHead(200, { 'Content-Type': contentType(norm) });
      fs.createReadStream(norm).pipe(res);
    });
  });
  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
    server.on('error', reject);
  });
}

async function inspect(page, url, viewport) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.setViewportSize({ width: viewport, height: 900 });
  await page.waitForTimeout(120);
  return page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.event-v2-preview-card'));
    const imgs = Array.from(document.querySelectorAll('.event-v2-preview-image'));
    const loaded = imgs.filter((img) => img.complete && img.naturalWidth > 0).length;
    const broken = imgs.filter((img) => img.complete && img.naturalWidth === 0).length;
    const text = cards.map((card) => card.textContent || '');
    const fixtureCount = new Set(cards.map((card) => card.getAttribute('data-fixture-id')).filter(Boolean)).size;
    const overflow = document.documentElement.scrollWidth > window.innerWidth;
    const status = document.getElementById('status-bar');
    const statusText = status ? status.textContent || '' : '';
    return {
      cards: cards.length,
      fixturesVisible: fixtureCount,
      imagesLoaded: loaded,
      brokenImages: broken,
      horizontalOverflow: overflow,
      actionHintCount: text.filter((t) => /resolve|reward|trigger|apply|choose/i.test(t)).length,
      selectedCandidateMentions: text.filter((t) => /selectedCandidate/i.test(t)).length,
      noWriteCount: text.filter((t) => t.includes('runtimeWrite: false') && t.includes('production: false')).length,
      candidateOnlyCount: text.filter((t) => t.includes('candidate: candidate_only') || t.includes('Vorschlagskarte: candidate_only')).length,
      safetyLabelsVisible: /Dev\/Test|Candidate Only|No Write|No Gameplay Activation|Runtime Shadow|Testmodus|Vorschlagskarte|Nur Vorschau|Kein Einfluss auf deinen Spielstand|Testauswertung im Hintergrund/i.test(statusText),
    };
  });
}

function toMarkdown(report) {
  return [
    '# Phase 152 - Event Center Context Browser Smoke',
    '',
    `- defaultDisabled: ${report.defaultMode.disabled}`,
    `- devEnabled: ${report.devMode.enabled}`,
    `- fixturesVisible: ${report.summary.fixturesVisible}`,
    `- candidateItemsVisible: ${report.summary.candidateItemsVisible}`,
    `- shadowEvaluations: ${report.devMode.shadowEvaluations}`,
    `- imagesLoaded: ${report.summary.imagesLoaded}`,
    `- brokenImages: ${report.summary.brokenImages}`,
    `- horizontalOverflow: ${report.summary.horizontalOverflow}`,
    `- jsErrors: ${report.summary.jsErrors.length}`,
    `- actionsFound: ${report.summary.actionsFound}`,
    `- safetyLabelsVisible: ${report.summary.safetyLabelsVisible}`,
    `- ok: ${report.ok}`,
    '',
  ].join('\n');
}

async function main() {
  const defaultModel = createEventCenterCandidatePreviewModel({
    rootDir: ROOT,
    environment: 'local',
    hostname: 'localhost',
    explicitDevPreview: false,
    enableRuntimeShadowDev: false,
  });

  const enabledModel = createEventCenterCandidatePreviewModel({
    rootDir: ROOT,
    environment: 'local',
    hostname: 'localhost',
    explicitDevPreview: true,
    enableRuntimeShadowDev: true,
  });

  fs.mkdirSync(path.dirname(SOURCE_JSON), { recursive: true });
  fs.writeFileSync(SOURCE_JSON, JSON.stringify(enabledModel, null, 2) + '\n', 'utf8');

  const { server, port } = await createServer(ROOT);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const jsErrors = [];
  page.on('pageerror', (err) => jsErrors.push(String(err.message || err)));

  try {
    const url = `http://127.0.0.1:${port}/dev/event-v2-preview-gallery.html?mode=event_center_context`;
    const viewportResults = [];
    for (const vp of VIEWPORTS) {
      viewportResults.push({ viewport: vp, ...(await inspect(page, url, vp)) });
    }
    const largest = viewportResults.find((v) => v.viewport === 768) || viewportResults[viewportResults.length - 1];
    const summary = {
      viewports: VIEWPORTS,
      candidateItemsVisible: largest.cards,
      fixturesVisible: largest.fixturesVisible,
      imagesLoaded: largest.imagesLoaded,
      brokenImages: largest.brokenImages,
      horizontalOverflow: viewportResults.some((entry) => entry.horizontalOverflow),
      jsErrors,
      actionsFound: largest.actionHintCount,
      selectedCandidateMentions: largest.selectedCandidateMentions,
      safetyLabelsVisible: largest.safetyLabelsVisible,
    };

    const report = {
      ok: defaultModel.enabled === false
        && enabledModel.enabled === true
        && (enabledModel.fixtures || []).length === 3
        && (enabledModel.flatItems || []).length === 15
        && Number(enabledModel.diagnostics && enabledModel.diagnostics.shadowEvaluations || 0) === 66
        && enabledModel.runtimeWriteEnabled === false
        && enabledModel.productionEnabled === false
        && Number(enabledModel.diagnostics && enabledModel.diagnostics.saveWrites || 0) === 0
        && Number(enabledModel.diagnostics && enabledModel.diagnostics.localStorageWrites || 0) === 0
        && Number(enabledModel.diagnostics && enabledModel.diagnostics.indexedDbWrites || 0) === 0
        && largest.cards === 15
        && largest.fixturesVisible === 3
        && largest.imagesLoaded === 15
        && largest.brokenImages === 0
        && summary.horizontalOverflow === false
        && summary.jsErrors.length === 0
        && largest.actionHintCount === 0
        && largest.selectedCandidateMentions === 0
        && largest.candidateOnlyCount === 15
        && largest.noWriteCount === 15
        && largest.safetyLabelsVisible === true,
      defaultMode: {
        disabled: defaultModel.enabled === false,
        reason: defaultModel.reason || 'unknown',
      },
      devMode: {
        enabled: enabledModel.enabled === true,
        fixtures: (enabledModel.fixtures || []).length,
        candidateItems: (enabledModel.flatItems || []).length,
        shadowEvaluations: Number(enabledModel.diagnostics && enabledModel.diagnostics.shadowEvaluations || 0),
        runtimeWriteFalse: enabledModel.runtimeWriteEnabled === false,
        productionFalse: enabledModel.productionEnabled === false,
        saveStorageWrites: Number(enabledModel.diagnostics && enabledModel.diagnostics.saveWrites || 0)
          + Number(enabledModel.diagnostics && enabledModel.diagnostics.localStorageWrites || 0)
          + Number(enabledModel.diagnostics && enabledModel.diagnostics.indexedDbWrites || 0),
      },
      viewportResults,
      summary,
    };

    fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
    fs.writeFileSync(OUT_MD, toMarkdown(report), 'utf8');
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.ok ? 0 : 1);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
