#!/usr/bin/env node
/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');
const { createSoftActivationCandidates } = require('../src/events/v2/shadow/EventV2SoftActivationCandidateModel.js');
const { createCandidateFeedPreviewItems } = require('../src/events/v2/preview/EventV2CandidateFeedPreviewAdapter.js');

const ROOT = process.cwd();
const PAGE_PATH = '/dev/event-v2-preview-gallery.html';
const PLANNING = path.join(ROOT, 'data', 'events', 'catalog', '_planning');
const GATE_JSON = path.join(PLANNING, 'phase-142-soft-activation-candidate-gate-report.json');
const SMOKE_JSON = path.join(PLANNING, 'phase-143-candidate-feed-browser-smoke-report.json');
const SMOKE_MD = path.join(PLANNING, 'phase-143-candidate-feed-browser-smoke-report.md');
const READY_JSON = path.join(PLANNING, 'phase-143-candidate-feed-readiness-report.json');
const READY_MD = path.join(PLANNING, 'phase-143-candidate-feed-readiness-report.md');
const VIEWPORTS = [360, 390, 430, 768];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

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
    if (relPath === '/') relPath = PAGE_PATH;

    const absPath = path.join(rootDir, relPath);
    const normalized = path.normalize(absPath);
    if (!normalized.startsWith(path.normalize(rootDir))) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    fs.stat(normalized, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType(normalized) });
      fs.createReadStream(normalized).pipe(res);
    });
  });

  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
    server.on('error', reject);
  });
}

async function inspectCandidateMode(page, viewport) {
  await page.setViewportSize({ width: viewport, height: 900 });
  await page.waitForTimeout(120);
  return page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.event-v2-preview-card'));
    const imgs = Array.from(document.querySelectorAll('.event-v2-preview-image'));
    const loaded = imgs.filter((img) => img.complete && img.naturalWidth > 0).length;
    const broken = imgs.filter((img) => img.complete && img.naturalWidth === 0).length;
    const overflow = document.documentElement.scrollWidth > window.innerWidth;

    const texts = cards.map((card) => card.textContent || '');
    const candidateOnly = texts.filter((text) => text.includes('candidate: candidate_only')).length;
    const noWriteLines = texts.filter((text) => text.includes('runtimeWrite: false') && text.includes('production: false')).length;
    const actionHints = texts.filter((text) => text.includes('resolve') || text.includes('reward') || text.includes('action')).length;
    const fixtureLines = texts.filter((text) => text.includes('fixture:')).length;
    const watchLines = texts.filter((text) => text.includes('scoring_watch_vpd_vs_dry_rootball')).length;

    return {
      cards: cards.length,
      imagesLoaded: loaded,
      brokenImages: broken,
      horizontalOverflow: overflow,
      candidateOnlyCount: candidateOnly,
      noWriteCount: noWriteLines,
      actionHintCount: actionHints,
      fixtureLineCount: fixtureLines,
      watchLineCount: watchLines,
    };
  });
}

function exists(relPath) {
  return typeof relPath === 'string' && relPath.trim() && fs.existsSync(path.join(ROOT, relPath));
}

function writeMarkdownSmoke(report) {
  const lines = [
    '# Phase 143 - Candidate Feed Browser Smoke Report',
    '',
    `- browserSmokeExecuted: ${report.browserSmokeExecuted}`,
    `- testedViewports: ${VIEWPORTS.join(', ')}`,
    `- candidateItems: ${report.summary.candidateItems}`,
    `- imagesLoaded: ${report.summary.imagesLoaded}`,
    `- brokenImages: ${report.summary.brokenImages}`,
    `- horizontalOverflow: ${report.summary.horizontalOverflow}`,
    `- jsErrors: ${report.summary.jsErrors.length}`,
    `- fixturesVisible: ${report.summary.fixturesVisible}`,
    `- candidateOnlyVisible: ${report.summary.candidateOnlyVisible}`,
    `- noWriteVisible: ${report.summary.noWriteVisible}`,
    `- watchVisible: ${report.summary.watchVisible}`,
    `- ok: ${report.ok}`,
  ];
  fs.writeFileSync(SMOKE_MD, lines.join('\n') + '\n', 'utf8');
}

function writeMarkdownReadiness(report) {
  const lines = [
    '# Phase 143 - Candidate Feed Readiness Report',
    '',
    `- status: ${report.status}`,
    `- fixturesChecked: ${report.fixturesChecked}`,
    `- candidateFeedsGenerated: ${report.candidateFeedsGenerated}`,
    `- candidateItemsTotal: ${report.candidateItemsTotal}`,
    `- validImages: ${report.validImages}`,
    `- brokenPaths: ${report.brokenPaths}`,
    `- selectedCandidateNull: ${report.contract.selectedCandidateNull}`,
    `- actionsEmpty: ${report.contract.actionsEmpty}`,
    `- canActivateGameplayFalse: ${report.contract.canActivateGameplayFalse}`,
    `- canMutateStateFalse: ${report.contract.canMutateStateFalse}`,
    `- canMutateSaveFalse: ${report.contract.canMutateSaveFalse}`,
    `- runtimeWriteFalse: ${report.contract.runtimeWriteFalse}`,
    `- productionFalse: ${report.contract.productionFalse}`,
  ];
  fs.writeFileSync(READY_MD, lines.join('\n') + '\n', 'utf8');
}

async function main() {
  const gateReport = readJson(GATE_JSON);
  const candidatePreviewItems = createCandidateFeedPreviewItems(gateReport);
  const fixtures = Array.isArray(gateReport.fixtures) ? gateReport.fixtures : [];

  // Contract check via model recreation from gate candidates.
  const reconstructed = fixtures.map((fixture) => createSoftActivationCandidates({
    fixtureId: fixture.fixtureId,
    candidates: Array.isArray(fixture.candidatesTop5) ? fixture.candidatesTop5.map((item) => ({
      ...item,
      eligible: true,
    })) : [],
    topN: 5,
  }));

  const readiness = {
    status: gateReport.gateStatus === 'ready_with_scoring_watch'
      ? 'candidate_feed_ready_with_scoring_watch'
      : (gateReport.gateStatus === 'ready_for_dev_test_candidate_feed' ? 'candidate_feed_ready' : 'candidate_feed_blocked'),
    fixturesChecked: fixtures.length,
    candidateFeedsGenerated: reconstructed.length,
    top5ByFixture: fixtures.map((fixture) => ({
      fixtureId: fixture.fixtureId,
      top5: (fixture.candidatesTop5 || []).map((item) => ({
        rank: item.rank,
        eventId: item.eventId,
        score: item.score,
        reason: item.reason,
      })),
    })),
    candidateItemsTotal: candidatePreviewItems.length,
    validImages: candidatePreviewItems.filter((item) => exists(item.imageSrc)).length,
    brokenPaths: candidatePreviewItems.filter((item) => !exists(item.imageSrc)).length,
    watchpoints: Array.isArray(gateReport.watchPoints) ? gateReport.watchPoints : [],
    contract: {
      selectedCandidateNull: reconstructed.every((model) => model.selectedCandidate === null),
      actionsEmpty: candidatePreviewItems.every((item) => Array.isArray(item.actions) && item.actions.length === 0),
      canActivateGameplayFalse: candidatePreviewItems.every((item) => item.canActivateGameplay === false),
      canMutateStateFalse: candidatePreviewItems.every((item) => item.canMutateState === false),
      canMutateSaveFalse: candidatePreviewItems.every((item) => item.canMutateSave === false),
      runtimeWriteFalse: candidatePreviewItems.every((item) => item.runtimeWriteEnabled === false),
      productionFalse: candidatePreviewItems.every((item) => item.productionEnabled === false),
    },
  };

  const { server, port } = await createStaticServer(ROOT);
  const pageUrl = `http://127.0.0.1:${port}${PAGE_PATH}`;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const jsErrors = [];
  page.on('pageerror', (err) => jsErrors.push(String(err.message || err)));

  try {
    await page.goto(pageUrl, { waitUntil: 'networkidle' });
    await page.waitForSelector('.event-v2-preview-card', { timeout: 15000 });
    await page.selectOption('#filter-mode', 'candidate');
    await page.waitForTimeout(150);

    const viewportResults = [];
    for (const vp of VIEWPORTS) {
      viewportResults.push({ viewport: vp, ...(await inspectCandidateMode(page, vp)) });
    }

    const baseline = viewportResults.find((item) => item.viewport === 360) || viewportResults[0];
    const largest = viewportResults.find((item) => item.viewport === 768) || viewportResults[viewportResults.length - 1];

    const smoke = {
      ok: largest.cards >= 15
        && largest.brokenImages === 0
        && !viewportResults.some((item) => item.horizontalOverflow)
        && jsErrors.length === 0
        && largest.candidateOnlyCount > 0
        && largest.noWriteCount > 0,
      browserSmokeExecuted: true,
      mode: 'candidate_feed',
      pageUrl,
      testedViewports: VIEWPORTS,
      viewportResults,
      summary: {
        candidateItems: largest.cards,
        imagesLoaded: largest.imagesLoaded,
        brokenImages: largest.brokenImages,
        horizontalOverflow: viewportResults.some((item) => item.horizontalOverflow),
        jsErrors,
        fixturesVisible: baseline.fixtureLineCount,
        candidateOnlyVisible: baseline.candidateOnlyCount,
        noWriteVisible: baseline.noWriteCount,
        watchVisible: baseline.watchLineCount,
      },
    };

    fs.writeFileSync(SMOKE_JSON, JSON.stringify(smoke, null, 2) + '\n', 'utf8');
    writeMarkdownSmoke(smoke);
    fs.writeFileSync(READY_JSON, JSON.stringify(readiness, null, 2) + '\n', 'utf8');
    writeMarkdownReadiness(readiness);

    console.log(JSON.stringify({ smoke, readiness }, null, 2));
    process.exit(smoke.ok ? 0 : 1);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

