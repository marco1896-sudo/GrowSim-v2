#!/usr/bin/env node
/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = process.cwd();
const OUT_JSON = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-148-app-near-entry-browser-smoke-report.json');
const OUT_MD = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-148-app-near-entry-browser-smoke-report.md');
const VIEWPORTS = [360, 390, 430, 768];
const APP_PATH = '/';
const GALLERY_PATH = '/dev/event-v2-preview-gallery.html?mode=dev_candidate';
const DEV_QUERY = '?gs_event_v2_dev_preview=unlock';

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

function createStaticServer(rootDir) {
  const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url, 'http://localhost');
    let relPath = decodeURIComponent(reqUrl.pathname);
    if (relPath === '/') relPath = '/index.html';
    const abs = path.join(rootDir, relPath);
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

async function readEntryState(page, url) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(160);
  return page.evaluate(() => {
    const api = window.GrowSimEventV2DevPreviewEntry;
    if (!api || typeof api.getState !== 'function') {
      return { ok: false, reason: 'missing_entry_api' };
    }
    const state = api.getState();
    return {
      ok: true,
      visible: Boolean(state && state.visible),
      reason: state && state.reason ? String(state.reason) : 'unknown',
      runtimeWriteEnabled: Boolean(state && state.runtimeWriteEnabled),
      productionEnabled: Boolean(state && state.productionEnabled),
      canActivateGameplay: Boolean(state && state.canActivateGameplay),
      canMutateSave: Boolean(state && state.canMutateSave),
      safetyLabels: Array.isArray(state && state.safetyLabels) ? state.safetyLabels : [],
    };
  });
}

async function inspectGallery(page, url, viewport) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(160);
  await page.setViewportSize({ width: viewport, height: 900 });
  await page.waitForTimeout(100);
  return page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.event-v2-preview-card'));
    const imgs = Array.from(document.querySelectorAll('.event-v2-preview-image'));
    const loaded = imgs.filter((img) => img.complete && img.naturalWidth > 0).length;
    const broken = imgs.filter((img) => img.complete && img.naturalWidth === 0).length;
    const text = cards.map((card) => card.textContent || '');
    const fixtureCount = new Set(
      cards
        .map((card) => card.getAttribute('data-fixture-id'))
        .filter((value) => typeof value === 'string' && value.trim())
    ).size;
    const overflow = document.documentElement.scrollWidth > window.innerWidth;
    const statusText = (document.getElementById('status-bar') || {}).textContent || '';
    return {
      cards: cards.length,
      imagesLoaded: loaded,
      brokenImages: broken,
      horizontalOverflow: overflow,
      fixturesVisible: fixtureCount,
      candidateOnlyCount: text.filter((t) => t.includes('candidate: candidate_only')).length,
      noWriteCount: text.filter((t) => t.includes('runtimeWrite: false') && t.includes('production: false')).length,
      actionHintCount: text.filter((t) => /resolve|reward|trigger|apply|choose/i.test(t)).length,
      selectedCandidateMentions: text.filter((t) => /selectedCandidate/i.test(t)).length,
      safetyLabelsVisible: /Dev Preview|Candidate Only|No Write|No Gameplay Activation/i.test(statusText),
      statusText,
    };
  });
}

function toMarkdown(report) {
  const lines = [
    '# Phase 148 - App-Near Entry Browser Smoke',
    '',
    `- browserSmokeExecuted: ${report.browserSmokeExecuted}`,
    `- defaultDisabled: ${report.defaultState.visible === false}`,
    `- devModeVisible: ${report.devState.visible === true}`,
    `- viewports: ${VIEWPORTS.join(', ')}`,
    `- fixturesVisible: ${report.summary.fixturesVisible}`,
    `- candidateItemsVisible: ${report.summary.candidateItemsVisible}`,
    `- imagesLoaded: ${report.summary.imagesLoaded}`,
    `- brokenImages: ${report.summary.brokenImages}`,
    `- horizontalOverflow: ${report.summary.horizontalOverflow}`,
    `- jsErrors: ${report.summary.jsErrors.length}`,
    `- actionsFound: ${report.summary.actionsFound}`,
    `- selectedCandidateMentions: ${report.summary.selectedCandidateMentions}`,
    `- safetyLabelsVisible: ${report.summary.safetyLabelsVisible}`,
    `- ok: ${report.ok}`,
    '',
  ];
  return lines.join('\n');
}

async function main() {
  const preflight = spawnSync(process.execPath, ['dev/run-event-v2-dev-test-candidate-feed-report.js', '--enable-dev-preview'], {
    cwd: ROOT,
    stdio: 'pipe',
    encoding: 'utf8',
  });
  if (preflight.status !== 0) {
    console.error('Failed to prepare dev preview feed report.');
    console.error(preflight.stderr || preflight.stdout || '');
    process.exit(1);
  }

  const { server, port } = await createStaticServer(ROOT);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const jsErrors = [];
  page.on('pageerror', (err) => jsErrors.push(String(err.message || err)));

  try {
    const defaultState = await readEntryState(page, `http://127.0.0.1:${port}${APP_PATH}`);
    const devState = await readEntryState(page, `http://127.0.0.1:${port}${APP_PATH}${DEV_QUERY}`);
    const openResult = await page.evaluate(() => {
      const api = window.GrowSimEventV2DevPreviewEntry;
      if (!api || typeof api.open !== 'function') return { ok: false, reason: 'missing_open_api' };
      return api.open();
    });

    const viewportResults = [];
    for (const vp of VIEWPORTS) {
      const entry = await inspectGallery(page, `http://127.0.0.1:${port}${GALLERY_PATH}`, vp);
      viewportResults.push({ viewport: vp, ...entry });
    }

    const largest = viewportResults.find((v) => v.viewport === 768) || viewportResults[viewportResults.length - 1];
    const summary = {
      viewports: VIEWPORTS,
      candidateItemsVisible: largest.cards,
      fixturesVisible: largest.fixturesVisible,
      imagesLoaded: largest.imagesLoaded,
      brokenImages: largest.brokenImages,
      horizontalOverflow: viewportResults.some((v) => v.horizontalOverflow),
      jsErrors,
      actionsFound: largest.actionHintCount,
      selectedCandidateMentions: largest.selectedCandidateMentions,
      safetyLabelsVisible: largest.safetyLabelsVisible,
    };

    const report = {
      ok: defaultState.ok === true
        && defaultState.visible === false
        && devState.ok === true
        && devState.visible === true
        && devState.runtimeWriteEnabled === false
        && devState.productionEnabled === false
        && devState.canActivateGameplay === false
        && devState.canMutateSave === false
        && openResult.ok === true
        && largest.cards === 15
        && largest.fixturesVisible === 3
        && largest.imagesLoaded === 15
        && largest.brokenImages === 0
        && summary.horizontalOverflow === false
        && jsErrors.length === 0
        && largest.actionHintCount === 0
        && largest.selectedCandidateMentions === 0
        && largest.candidateOnlyCount === 15
        && largest.noWriteCount === 15
        && largest.safetyLabelsVisible === true,
      browserSmokeExecuted: true,
      defaultState,
      devState,
      openResult,
      viewportResults,
      summary,
    };

    fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
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

