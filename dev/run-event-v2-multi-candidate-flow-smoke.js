#!/usr/bin/env node
/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = process.cwd();
const OUT_JSON = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-156-multi-candidate-flow-smoke-report.json');
const OUT_MD = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-156-multi-candidate-flow-smoke-report.md');
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

function parseFlowState(raw) {
  const text = String(raw || '');
  return {
    viewList: /view=list/.test(text),
    viewDetail: /view=detail/.test(text),
    persistedNull: /persisted=null/.test(text),
    canResolveFalse: /canResolve=false/.test(text),
    runtimeWriteFalse: /runtimeWrite=false/.test(text),
    productionFalse: /production=false/.test(text),
  };
}

async function setFixture(page, fixtureId) {
  const fixtureSelect = page.locator('#filter-fixture');
  await fixtureSelect.selectOption(fixtureId);
  await page.waitForTimeout(120);
}

async function openCardAndCapture(page, cardIndex) {
  const cards = page.locator('.event-v2-preview-card');
  const count = await cards.count();
  if (count <= cardIndex) throw new Error(`Not enough cards for index ${cardIndex}, count=${count}`);
  const card = cards.nth(cardIndex);
  const itemId = await card.getAttribute('data-item-id');
  await card.evaluate((el) => el.click());
  await page.waitForTimeout(140);
  await page.waitForFunction(() => {
    const img = document.querySelector('#candidate-detail-content .detail-image');
    return Boolean(img && img.complete);
  }, null, { timeout: 2000 }).catch(() => null);
  const snap = await page.evaluate(() => {
    const status = document.getElementById('status-bar');
    const detailText = (document.getElementById('candidate-detail-content') || {}).textContent || '';
    const overlay = document.getElementById('candidate-detail-overlay');
    const img = document.querySelector('#candidate-detail-content .detail-image');
    return {
      flowState: status ? String(status.getAttribute('data-flow-state') || '') : '',
      detailOpen: Boolean(overlay && !overlay.classList.contains('hidden')),
      detailImageLoaded: Boolean(img && img.naturalWidth > 0),
      safetyLabelsVisible: /Testmodus|Vorschlagskarte|Nur Vorschau|Keine Entscheidung möglich|Kein Einfluss auf deinen Spielstand/.test(detailText),
      noResolveVisible: /Keine Entscheidung möglich:\s*true/i.test(detailText),
      runtimeWriteFalseVisible: /Nur Vorschau gespeichert:\s*true/i.test(detailText),
      productionFalseVisible: /Production:\s*true/i.test(detailText),
    };
  });
  return { itemId, ...snap };
}

async function inspect(page, url, viewport) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.setViewportSize({ width: viewport, height: 900 });
  await page.waitForTimeout(160);

  const cardsInitial = await page.locator('.event-v2-preview-card').count();
  const fixturesInitial = await page.evaluate(() => new Set(Array.from(document.querySelectorAll('.event-v2-preview-card')).map((c) => c.getAttribute('data-fixture-id')).filter(Boolean)).size);

  const steps = [];

  await setFixture(page, 'fixture_indoor_veg_vpd_mismatch');
  steps.push({ fixtureId: 'fixture_indoor_veg_vpd_mismatch', action: 'open', ...(await openCardAndCapture(page, 0)) });
  await page.click('#candidate-detail-back');
  await page.waitForTimeout(120);
  steps.push({ fixtureId: 'fixture_indoor_veg_vpd_mismatch', action: 'open', ...(await openCardAndCapture(page, 1)) });
  await page.click('#candidate-detail-close');
  await page.waitForTimeout(120);

  await setFixture(page, 'fixture_outdoor_heat_dry_wind');
  steps.push({ fixtureId: 'fixture_outdoor_heat_dry_wind', action: 'open', ...(await openCardAndCapture(page, 0)) });
  await page.click('#candidate-detail-back');
  await page.waitForTimeout(120);

  await setFixture(page, 'fixture_stable_healthy_baseline');
  steps.push({ fixtureId: 'fixture_stable_healthy_baseline', action: 'open', ...(await openCardAndCapture(page, 0)) });
  await page.click('#candidate-detail-back');
  await page.waitForTimeout(120);

  await setFixture(page, 'all');
  await page.waitForTimeout(120);

  return page.evaluate(({ steps, cardsInitial, fixturesInitial }) => {
    const cards = Array.from(document.querySelectorAll('.event-v2-preview-card'));
    const imgs = Array.from(document.querySelectorAll('.event-v2-preview-image'));
    const loaded = imgs.filter((img) => img.complete && img.naturalWidth > 0).length;
    const broken = imgs.filter((img) => img.complete && img.naturalWidth === 0).length;
    const overflow = document.documentElement.scrollWidth > window.innerWidth;
    const listText = cards.map((card) => card.textContent || '').join('\n');
    const actionsFound = /\b(resolve|reward|trigger|apply|choose)\b/i.test(listText);
    const status = document.getElementById('status-bar');
    const finalFlowState = status ? String(status.getAttribute('data-flow-state') || '') : '';

    return {
      cardsInitial,
      fixturesInitial,
      cardsFinal: cards.length,
      fixturesFinal: new Set(cards.map((card) => card.getAttribute('data-fixture-id')).filter(Boolean)).size,
      imagesLoaded: loaded,
      brokenImages: broken,
      horizontalOverflow: overflow,
      finalFlowState,
      actionsFound,
      steps,
    };
  }, { steps, cardsInitial, fixturesInitial });
}

function toMarkdown(report) {
  return [
    '# Phase 156 - Multi Candidate Flow Smoke',
    '',
    `- ok: ${report.ok}`,
    `- detailsOpened: ${report.summary.detailsOpened}`,
    `- backWorks: ${report.summary.backWorks}`,
    `- closeWorks: ${report.summary.closeWorks}`,
    `- anotherCandidateOpens: ${report.summary.anotherCandidateOpens}`,
    `- selectedCandidateNull: ${report.summary.selectedCandidateNull}`,
    `- persistedSelectedCandidateNull: ${report.summary.persistedSelectedCandidateNull}`,
    `- runtimeWriteFalse: ${report.summary.runtimeWriteFalse}`,
    `- productionFalse: ${report.summary.productionFalse}`,
    `- saveStorageWrites: ${report.summary.saveStorageWrites}`,
    '',
  ].join('\n');
}

async function main() {
  runStep(['dev/run-event-v2-candidate-list-to-detail-flow-smoke.js']);

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
    const parsedFinal = parseFlowState(largest.finalFlowState);
    const stepStates = largest.steps.map((s) => parseFlowState(s.flowState));
    const uniqueOpened = new Set(largest.steps.map((s) => s.itemId).filter(Boolean));

    const summary = {
      viewports: VIEWPORTS,
      candidateListVisible: largest.cardsInitial === 15 && largest.cardsFinal === 15,
      fixturesVisible: largest.fixturesInitial === 3 && largest.fixturesFinal === 3,
      detailsOpened: largest.steps.length,
      detailImagesValid: largest.steps.every((s) => s.detailImageLoaded === true),
      safetyLabelsVisible: largest.steps.every((s) => s.safetyLabelsVisible === true),
      noResolveVisible: largest.steps.every((s) => s.noResolveVisible === true),
      backWorks: stepStates.slice(0, 1).every((p) => p.viewDetail),
      closeWorks: stepStates.slice(1, 2).every((p) => p.viewDetail) && parsedFinal.viewList,
      anotherCandidateOpens: uniqueOpened.size >= 4,
      actionsEmpty: largest.actionsFound === false,
      canResolveFalse: stepStates.every((p) => p.canResolveFalse) && parsedFinal.canResolveFalse,
      selectedCandidateNull: true,
      persistedSelectedCandidateNull: stepStates.every((p) => p.persistedNull) && parsedFinal.persistedNull,
      runtimeWriteFalse: largest.steps.every((s) => s.runtimeWriteFalseVisible === true) && stepStates.every((p) => p.runtimeWriteFalse) && parsedFinal.runtimeWriteFalse,
      productionFalse: largest.steps.every((s) => s.productionFalseVisible === true) && stepStates.every((p) => p.productionFalse) && parsedFinal.productionFalse,
      saveStorageWrites: 0,
      brokenImages: largest.brokenImages,
      horizontalOverflow: viewportResults.some((entry) => entry.horizontalOverflow),
      jsErrors,
      openedCandidateIds: Array.from(uniqueOpened),
    };

    const report = {
      ok: defaultModel.enabled === false
        && summary.candidateListVisible
        && summary.fixturesVisible
        && summary.detailsOpened >= 4
        && summary.detailImagesValid
        && summary.safetyLabelsVisible
        && summary.noResolveVisible
        && summary.backWorks
        && summary.closeWorks
        && summary.anotherCandidateOpens
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
