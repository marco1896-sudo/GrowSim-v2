#!/usr/bin/env node
/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = process.cwd();
const OUT_JSON = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-150-runtime-shadow-dev-toggle-browser-smoke-report.json');
const OUT_MD = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-150-runtime-shadow-dev-toggle-browser-smoke-report.md');
const VIEWPORTS = [360, 390, 430, 768];

function typeFor(filePath) {
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
    if (rel === '/') rel = '/index.html';
    const abs = path.join(rootDir, rel);
    const norm = path.normalize(abs);
    if (!norm.startsWith(path.normalize(rootDir))) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    fs.stat(norm, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404); res.end('Not Found'); return;
      }
      res.writeHead(200, { 'Content-Type': typeFor(norm) });
      fs.createReadStream(norm).pipe(res);
    });
  });
  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
    server.on('error', reject);
  });
}

async function inspectGallery(page, url, viewport) {
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
      candidateOnlyCount: text.filter((t) => t.includes('candidate: candidate_only')).length,
      safetyLabelsVisible: /Dev Preview|Candidate Only|No Write|No Gameplay Activation/i.test(statusText),
    };
  });
}

function runPreflight() {
  const steps = [
    ['dev/run-event-v2-runtime-shadow-dev-toggle-report.js'],
    ['dev/run-event-v2-runtime-shadow-dev-toggle-report.js', '--enable-runtime-shadow-dev'],
    ['dev/run-event-v2-dev-test-candidate-feed-report.js', '--enable-dev-preview'],
  ];
  for (const args of steps) {
    const result = spawnSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' });
    if (result.status !== 0) {
      throw new Error(`Preflight failed: node ${args.join(' ')}`);
    }
  }
}

function runToggleReport(args) {
  const result = spawnSync(process.execPath, ['dev/run-event-v2-runtime-shadow-dev-toggle-report.js', ...args], {
    cwd: ROOT,
    stdio: 'pipe',
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`Toggle report failed: ${args.join(' ') || 'default'}`);
  }
  return JSON.parse(String(result.stdout || '').trim() || '{}');
}

function toMarkdown(report) {
  const s = report.summary;
  return [
    '# Phase 150 - Runtime Shadow Dev Toggle Browser Smoke',
    '',
    `- browserSmokeExecuted: ${report.browserSmokeExecuted}`,
    `- defaultDisabled: ${report.defaultMode.disabled}`,
    `- devModeEnabled: ${report.devMode.enabled}`,
    `- viewports: ${VIEWPORTS.join(', ')}`,
    `- fixturesVisible: ${s.fixturesVisible}`,
    `- candidateItemsVisible: ${s.candidateItemsVisible}`,
    `- imagesLoaded: ${s.imagesLoaded}`,
    `- brokenImages: ${s.brokenImages}`,
    `- horizontalOverflow: ${s.horizontalOverflow}`,
    `- jsErrors: ${s.jsErrors.length}`,
    `- actionsFound: ${s.actionsFound}`,
    `- selectedCandidateMentions: ${s.selectedCandidateMentions}`,
    `- safetyLabelsVisible: ${s.safetyLabelsVisible}`,
    `- ok: ${report.ok}`,
    '',
  ].join('\n');
}

async function main() {
  runPreflight();

  const defaultReport = runToggleReport([]);
  const defaultMode = {
    disabled: defaultReport.enabled === false,
    reason: defaultReport.reason || 'unknown',
  };

  const enabledReport = runToggleReport(['--enable-runtime-shadow-dev']);
  const devMode = {
    enabled: enabledReport.enabled === true,
    fixtures: Number(enabledReport.summary && enabledReport.summary.fixtures || 0),
    shadowEvaluations: Number(enabledReport.summary && enabledReport.summary.shadowEvaluations || 0),
    candidateItems: Number(enabledReport.summary && enabledReport.summary.candidateItems || 0),
    runtimeWriteFalse: Boolean(enabledReport.summary && enabledReport.summary.runtimeWriteFalse),
    productionFalse: Boolean(enabledReport.summary && enabledReport.summary.productionFalse),
    saveStorageWrites: Number(enabledReport.summary && enabledReport.summary.saveStorageWrites || 0),
  };

  const { server, port } = await createServer(ROOT);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const jsErrors = [];
  page.on('pageerror', (err) => jsErrors.push(String(err.message || err)));

  try {
    const galleryUrl = `http://127.0.0.1:${port}/dev/event-v2-preview-gallery.html?mode=dev_candidate`;
    const viewportResults = [];
    for (const vp of VIEWPORTS) {
      viewportResults.push({ viewport: vp, ...(await inspectGallery(page, galleryUrl, vp)) });
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
      ok: defaultMode.disabled === true
        && devMode.enabled === true
        && devMode.fixtures === 3
        && devMode.shadowEvaluations === 66
        && devMode.candidateItems === 15
        && devMode.runtimeWriteFalse === true
        && devMode.productionFalse === true
        && devMode.saveStorageWrites === 0
        && summary.candidateItemsVisible === 15
        && summary.fixturesVisible === 3
        && summary.imagesLoaded === 15
        && summary.brokenImages === 0
        && summary.horizontalOverflow === false
        && summary.jsErrors.length === 0
        && summary.actionsFound === 0
        && summary.selectedCandidateMentions === 0
        && summary.safetyLabelsVisible === true,
      browserSmokeExecuted: true,
      defaultMode,
      devMode,
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
