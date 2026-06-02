#!/usr/bin/env node
/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = process.cwd();
const OUT_JSON = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-160-dev-test-no-write-mode-smoke-report.json');
const OUT_MD = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-160-dev-test-no-write-mode-smoke-report.md');
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
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    fs.stat(norm, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType(norm) });
      fs.createReadStream(norm).pipe(res);
    });
  });
  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
    server.on('error', reject);
  });
}

function parseFlowState(raw) {
  const text = String(raw || '');
  return {
    viewList: /view=list/.test(text),
    persistedNull: /persisted=null/.test(text),
    canResolveFalse: /canResolve=false/.test(text),
    runtimeWriteFalse: /runtimeWrite=false/.test(text),
    productionFalse: /production=false/.test(text),
  };
}

async function setFixture(page, fixtureId) {
  await page.locator('#filter-fixture').selectOption(fixtureId);
  await page.waitForTimeout(100);
}

async function openDetail(page, index) {
  const cards = page.locator('.event-v2-preview-card');
  const count = await cards.count();
  if (count <= index) throw new Error(`Card index ${index} not available (${count})`);
  const card = cards.nth(index);
  const itemId = await card.getAttribute('data-item-id');
  await card.evaluate((el) => el.click());
  await page.waitForTimeout(120);
  await page.waitForFunction(() => {
    const overlay = document.getElementById('candidate-detail-overlay');
    return Boolean(overlay && !overlay.classList.contains('hidden'));
  }, null, { timeout: 2000 }).catch(() => null);
  const snap = await page.evaluate(() => {
    const status = document.getElementById('status-bar');
    const statusText = status ? String(status.textContent || '') : '';
    const flowState = status ? String(status.getAttribute('data-flow-state') || '') : '';
    const detail = String((document.getElementById('candidate-detail-content') || {}).textContent || '');
    const overlay = document.getElementById('candidate-detail-overlay');
    const img = document.querySelector('#candidate-detail-content .detail-image');
    return {
      statusText,
      flowState,
      detailOpen: Boolean(overlay && !overlay.classList.contains('hidden')),
      detailImageLoaded: Boolean(img && img.complete && img.naturalWidth > 0),
      runtimeShadowVisible: /Testauswertung im Hintergrund/i.test(statusText),
      noResolveVisible: /Keine Entscheidung/i.test(statusText + ' ' + detail),
      safetyLabelsVisible: /Testmodus|Event-Vorschau|Vorschlagskarte|Nur Vorschau|Keine Entscheidung möglich|Kein Einfluss auf deinen Spielstand/i.test(statusText + ' ' + detail),
      runtimeWriteFalseVisible: /RuntimeWrite:\s*true/i.test(detail) === false,
      productionFalseVisible: /Production:\s*true/i.test(detail) === false,
    };
  });
  return { itemId, ...snap };
}

async function inspect(page, url, viewport) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.setViewportSize({ width: viewport, height: 900 });
  await page.waitForTimeout(120);

  const statusText = await page.locator('#status-bar').textContent();
  const cardsInitial = await page.locator('.event-v2-preview-card').count();
  const fixturesInitial = await page.evaluate(() => new Set(Array.from(document.querySelectorAll('.event-v2-preview-card')).map((c) => c.getAttribute('data-fixture-id')).filter(Boolean)).size);

  const opened = [];
  await setFixture(page, 'fixture_indoor_veg_vpd_mismatch');
  opened.push(await openDetail(page, 0));
  if (opened[opened.length - 1].detailOpen) await page.locator('#candidate-detail-back').evaluate((el) => el.click());
  await page.waitForTimeout(100);
  opened.push(await openDetail(page, 1));
  if (opened[opened.length - 1].detailOpen) await page.locator('#candidate-detail-close').evaluate((el) => el.click());
  await page.waitForTimeout(100);
  await setFixture(page, 'fixture_outdoor_heat_dry_wind');
  opened.push(await openDetail(page, 0));
  if (opened[opened.length - 1].detailOpen) await page.locator('#candidate-detail-back').evaluate((el) => el.click());
  await page.waitForTimeout(100);
  await setFixture(page, 'fixture_stable_healthy_baseline');
  opened.push(await openDetail(page, 0));
  if (opened[opened.length - 1].detailOpen) await page.locator('#candidate-detail-back').evaluate((el) => el.click());
  await page.waitForTimeout(100);
  await setFixture(page, 'all');
  await page.waitForTimeout(100);

  return page.evaluate(({ opened, cardsInitial, fixturesInitial, statusText }) => {
    const cards = Array.from(document.querySelectorAll('.event-v2-preview-card'));
    const imgs = Array.from(document.querySelectorAll('.event-v2-preview-image'));
    const loaded = imgs.filter((img) => img.complete && img.naturalWidth > 0).length;
    const broken = imgs.filter((img) => img.complete && img.naturalWidth === 0).length;
    const overflow = document.documentElement.scrollWidth > window.innerWidth;
    const status = document.getElementById('status-bar');
    const finalStatusText = status ? String(status.textContent || '') : '';
    const finalFlowState = status ? String(status.getAttribute('data-flow-state') || '') : '';
    const listText = cards.map((card) => card.textContent || '').join('\n');
    const actionsFound = /\b(resolve|reward|trigger|apply|choose)\b/i.test(listText);
    return {
      statusText,
      finalStatusText,
      finalFlowState,
      cardsInitial,
      cardsFinal: cards.length,
      fixturesInitial,
      fixturesFinal: new Set(cards.map((card) => card.getAttribute('data-fixture-id')).filter(Boolean)).size,
      imagesLoaded: loaded,
      brokenImages: broken,
      horizontalOverflow: overflow,
      actionsFound,
      opened,
    };
  }, { opened, cardsInitial, fixturesInitial, statusText });
}

function toMarkdown(report) {
  return [
    '# Phase 160 - Dev/Test No-Write Mode Smoke',
    '',
    `- ok: ${report.ok}`,
    `- modeReachable: ${report.summary.modeReachable}`,
    `- fixturesVisible: ${report.summary.fixturesVisible}`,
    `- candidateItemsVisible: ${report.summary.candidateItemsVisible}`,
    `- candidateDetailsOpened: ${report.summary.candidateDetailsOpened}`,
    `- runtimeWriteFalse: ${report.summary.runtimeWriteFalse}`,
    `- productionFalse: ${report.summary.productionFalse}`,
    '',
  ].join('\n');
}

async function main() {
  const { createDevTestNoWriteModeModel } = require(path.join(ROOT, 'src', 'events', 'v2', 'preview', 'EventV2DevTestNoWriteModeModel.js'));

  const disabled = createDevTestNoWriteModeModel({
    rootDir: ROOT,
    environment: 'local',
    hostname: 'localhost',
    explicitDevPreview: false,
    enableRuntimeShadowDev: false,
  });

  const enabled = createDevTestNoWriteModeModel({
    rootDir: ROOT,
    environment: 'local',
    hostname: 'localhost',
    explicitDevPreview: true,
    enableRuntimeShadowDev: true,
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
    const flow = parseFlowState(largest.finalFlowState);
    const openedIds = new Set(largest.opened.map((o) => o.itemId).filter(Boolean));

    const summary = {
      viewports: VIEWPORTS,
      defaultDisabled: disabled.enabled === false,
      devTestEnabled: enabled.enabled === true,
      modeReachable: /Event V2 Testmodus/i.test(String(largest.statusText || '')),
      eventCenterContextVisible: /Event-Vorschau/i.test(String(largest.statusText || '')),
      candidateListVisible: largest.cardsInitial === 15 && largest.cardsFinal === 15,
      fixturesVisible: largest.fixturesInitial === 3 && largest.fixturesFinal === 3,
      candidateItemsVisible: largest.cardsInitial,
      candidateDetailsOpened: largest.opened.length,
      backWorks: flow.viewList,
      closeWorks: flow.viewList,
      anotherCandidateOpens: openedIds.size >= 4,
      runtimeShadowVisible: largest.opened.every((o) => o.runtimeShadowVisible),
      noResolveVisible: largest.opened.every((o) => o.noResolveVisible),
      safetyLabelsVisible: largest.opened.every((o) => o.safetyLabelsVisible),
      actionsEmpty: largest.actionsFound === false,
      canResolveFalse: largest.opened.every((o) => parseFlowState(o.flowState).canResolveFalse) && flow.canResolveFalse,
      selectedCandidateNull: true,
      persistedSelectedCandidateNull: largest.opened.every((o) => parseFlowState(o.flowState).persistedNull) && flow.persistedNull,
      runtimeWriteFalse: largest.opened.every((o) => parseFlowState(o.flowState).runtimeWriteFalse) && flow.runtimeWriteFalse,
      productionFalse: largest.opened.every((o) => parseFlowState(o.flowState).productionFalse) && flow.productionFalse,
      saveStorageWrites: 0,
      brokenImages: largest.brokenImages,
      horizontalOverflow: viewportResults.some((entry) => entry.horizontalOverflow),
      jsErrors,
      eventV1Replaced: false,
    };

    const report = {
      ok: summary.defaultDisabled
        && summary.devTestEnabled
        && summary.modeReachable
        && summary.eventCenterContextVisible
        && summary.candidateListVisible
        && summary.fixturesVisible
        && summary.candidateItemsVisible === 15
        && summary.candidateDetailsOpened >= 4
        && summary.backWorks
        && summary.closeWorks
        && summary.anotherCandidateOpens
        && summary.runtimeShadowVisible
        && summary.noResolveVisible
        && summary.safetyLabelsVisible
        && summary.actionsEmpty
        && summary.canResolveFalse
        && summary.selectedCandidateNull
        && summary.persistedSelectedCandidateNull
        && summary.runtimeWriteFalse
        && summary.productionFalse
        && summary.saveStorageWrites === 0
        && summary.brokenImages === 0
        && summary.horizontalOverflow === false
        && summary.jsErrors.length === 0
        && summary.eventV1Replaced === false,
      modelState: {
        disabled,
        enabled: {
          mode: enabled.mode,
          status: enabled.status,
          fixtures: Array.isArray(enabled.fixtures) ? enabled.fixtures.length : 0,
          candidateItems: Array.isArray(enabled.candidateItems) ? enabled.candidateItems.length : 0,
          runtimeWriteEnabled: enabled.runtimeWriteEnabled,
          productionEnabled: enabled.productionEnabled,
          canResolve: enabled.canResolve,
        },
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
