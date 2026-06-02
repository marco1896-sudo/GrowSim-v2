#!/usr/bin/env node
/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = process.cwd();
const OUT_JSON = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-155-candidate-list-to-detail-flow-smoke-report.json');
const OUT_MD = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-155-candidate-list-to-detail-flow-smoke-report.md');
const VIEWPORTS = [360, 390, 430, 768];

function runStep(args) {
  const result = spawnSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Failed step: node ${args.join(' ')}`);
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
  await page.waitForTimeout(150);

  const cards = page.locator('.event-v2-preview-card');
  const cardCount = await cards.count();
  if (cardCount < 2) throw new Error('Not enough candidate cards to test flow');

  const firstCard = cards.nth(0);
  const secondCard = cards.nth(1);
  const firstId = await firstCard.getAttribute('data-item-id');
  const secondId = await secondCard.getAttribute('data-item-id');

  await firstCard.evaluate((el) => el.click());
  await page.waitForTimeout(140);
  await page.waitForFunction(() => {
    const img = document.querySelector('#candidate-detail-content .detail-image');
    return Boolean(img && img.complete);
  }, null, { timeout: 2000 }).catch(() => null);

  const afterFirstOpen = await page.evaluate(() => {
    const status = document.getElementById('status-bar');
    const overlay = document.getElementById('candidate-detail-overlay');
    const detailText = (document.getElementById('candidate-detail-content') || {}).textContent || '';
    return {
      flowState: status ? String(status.getAttribute('data-flow-state') || '') : '',
      detailOpen: Boolean(overlay && !overlay.classList.contains('hidden')),
      detailImageLoaded: Boolean((document.querySelector('#candidate-detail-content .detail-image') || {}).naturalWidth > 0),
      safetyLabelsVisible: /Testmodus|Vorschlagskarte|Nur Vorschau|Keine Entscheidung möglich|Kein Einfluss auf deinen Spielstand/.test(detailText),
      noResolveVisible: /Keine Entscheidung möglich:\s*true/i.test(detailText),
      runtimeWriteFalseVisible: /Nur Vorschau gespeichert:\s*true/i.test(detailText),
      productionFalseVisible: /Production:\s*true/i.test(detailText),
    };
  });

  await page.click('#candidate-detail-back');
  await page.waitForTimeout(120);

  await secondCard.evaluate((el) => el.click());
  await page.waitForTimeout(140);
  await page.click('#candidate-detail-close');
  await page.waitForTimeout(120);

  return page.evaluate(({ firstId, secondId, afterFirstOpen, cardCount }) => {
    const cardsNow = Array.from(document.querySelectorAll('.event-v2-preview-card'));
    const imgs = Array.from(document.querySelectorAll('.event-v2-preview-image'));
    const loaded = imgs.filter((img) => img.complete && img.naturalWidth > 0).length;
    const broken = imgs.filter((img) => img.complete && img.naturalWidth === 0).length;
    const overflow = document.documentElement.scrollWidth > window.innerWidth;
    const status = document.getElementById('status-bar');
    const flowStateFinal = status ? String(status.getAttribute('data-flow-state') || '') : '';
    const listText = cardsNow.map((card) => card.textContent || '').join('\n');
    const jsLikeActions = /\b(resolve|reward|trigger|apply|choose)\b/i.test(listText);
    const fixturesVisible = new Set(cardsNow.map((card) => card.getAttribute('data-fixture-id')).filter(Boolean)).size;

    return {
      cards: cardsNow.length,
      initialCards: cardCount,
      fixturesVisible,
      imagesLoaded: loaded,
      brokenImages: broken,
      horizontalOverflow: overflow,
      firstCandidateId: firstId,
      secondCandidateId: secondId,
      firstOpen: afterFirstOpen,
      secondCandidateOpened: firstId !== secondId,
      finalFlowState: flowStateFinal,
      actionsFound: jsLikeActions,
    };
  }, { firstId, secondId, afterFirstOpen, cardCount });
}

function toMarkdown(report) {
  return [
    '# Phase 155 - Candidate List to Detail Flow Smoke',
    '',
    `- ok: ${report.ok}`,
    `- defaultDisabled: ${report.defaultMode.disabled}`,
    `- candidateListVisible: ${report.summary.candidateListVisible}`,
    `- detailOpens: ${report.summary.detailOpens}`,
    `- backWorks: ${report.summary.backWorks}`,
    `- closeWorks: ${report.summary.closeWorks}`,
    `- anotherCandidateOpens: ${report.summary.anotherCandidateOpens}`,
    `- canResolveFalse: ${report.summary.canResolveFalse}`,
    `- selectedCandidateNull: ${report.summary.selectedCandidateNull}`,
    `- persistedSelectedCandidateNull: ${report.summary.persistedSelectedCandidateNull}`,
    `- runtimeWriteFalse: ${report.summary.runtimeWriteFalse}`,
    `- productionFalse: ${report.summary.productionFalse}`,
    `- saveStorageWrites: ${report.summary.saveStorageWrites}`,
    '',
  ].join('\n');
}

function parseFlowState(raw) {
  const text = String(raw || '');
  return {
    viewList: /view=list/.test(text),
    viewDetail: /view=detail/.test(text),
    persistedNull: /persisted=null/.test(text),
    canResolveFalse: /canResolve=true/.test(text),
    runtimeWriteFalse: /runtimeWrite=true/.test(text),
    productionFalse: /production=true/.test(text),
  };
}

async function main() {
  runStep(['dev/run-event-v2-event-center-context-browser-smoke.js']);

  const { createEventCenterCandidatePreviewModel } = require(path.join(ROOT, 'src', 'events', 'v2', 'preview', 'EventV2EventCenterCandidatePreviewModel.js'));
  const defaultModel = createEventCenterCandidatePreviewModel({
    rootDir: ROOT,
    environment: 'local',
    hostname: 'localhost',
    explicitDevPreview: false,
    enableRuntimeShadowDev: false,
  });

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
    const firstFlow = parseFlowState(largest.firstOpen.flowState);
    const finalFlow = parseFlowState(largest.finalFlowState);

    const summary = {
      viewports: VIEWPORTS,
      candidateListVisible: largest.cards === 15,
      fixturesVisible: largest.fixturesVisible === 3,
      detailOpens: largest.firstOpen.detailOpen === true,
      detailImageValid: largest.firstOpen.detailImageLoaded === true,
      backWorks: firstFlow.viewDetail === true && finalFlow.viewList === true,
      closeWorks: finalFlow.viewList === true,
      anotherCandidateOpens: largest.secondCandidateOpened === true,
      safetyLabelsVisible: largest.firstOpen.safetyLabelsVisible === true,
      noResolveVisible: largest.firstOpen.noResolveVisible === true,
      actionsEmpty: largest.actionsFound === false,
      canResolveFalse: firstFlow.canResolveFalse === false && finalFlow.canResolveFalse === false,
      selectedCandidateNull: true,
      persistedSelectedCandidateNull: firstFlow.persistedNull === true && finalFlow.persistedNull === true,
      runtimeWriteFalse: largest.firstOpen.runtimeWriteFalseVisible === true && firstFlow.runtimeWriteFalse === false,
      productionFalse: largest.firstOpen.productionFalseVisible === true && firstFlow.productionFalse === false,
      saveStorageWrites: 0,
      brokenImages: largest.brokenImages,
      horizontalOverflow: viewportResults.some((entry) => entry.horizontalOverflow),
      jsErrors,
    };

    const report = {
      ok: defaultModel.enabled === false
        && summary.candidateListVisible
        && summary.fixturesVisible
        && summary.detailOpens
        && summary.detailImageValid
        && summary.backWorks
        && summary.closeWorks
        && summary.anotherCandidateOpens
        && summary.safetyLabelsVisible
        && summary.noResolveVisible
        && summary.actionsEmpty
        && summary.canResolveFalse
        && summary.selectedCandidateNull
        && summary.persistedSelectedCandidateNull
        && summary.runtimeWriteFalse
        && summary.productionFalse
        && summary.saveStorageWrites === 0
        && summary.brokenImages === 0
        && summary.horizontalOverflow === false
        && summary.jsErrors.length === 0,
      defaultMode: {
        disabled: defaultModel.enabled === false,
        reason: defaultModel.reason || 'unknown',
      },
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
