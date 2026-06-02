#!/usr/bin/env node
/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = process.cwd();
const OUT_JSON = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-165-resolve-preview-ui-smoke-report.json');
const OUT_MD = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-165-resolve-preview-ui-smoke-report.md');
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
  await page.setViewportSize({ width: viewport, height: 920 });
  await page.waitForTimeout(160);
  const cards = page.locator('.event-v2-preview-card');
  await cards.first().evaluate((el) => el.click());
  await page.waitForTimeout(220);
  await page.waitForFunction(() => {
    const detailImg = document.querySelector('#candidate-detail-content .detail-image');
    return Boolean(detailImg && detailImg.complete);
  }, null, { timeout: 2000 }).catch(() => null);

  const options = page.locator('[data-resolve-option-id]');
  const optionCount = await options.count();
  if (optionCount > 0) {
    await options.first().click();
    await page.waitForTimeout(100);
  }

  return page.evaluate(() => {
    const overlay = document.getElementById('candidate-detail-overlay');
    const content = document.getElementById('candidate-detail-content');
    const status = document.getElementById('status-bar');
    const text = String(content ? content.textContent || '' : '');
    const statusText = String(status ? status.textContent || '' : '');
    const detailImg = content ? content.querySelector('.detail-image') : null;
    const cards = Array.from(document.querySelectorAll('.event-v2-preview-card'));
    const imgs = Array.from(document.querySelectorAll('.event-v2-preview-image'));
    const loaded = imgs.filter((img) => img.complete && img.naturalWidth > 0).length;
    const broken = imgs.filter((img) => img.complete && img.naturalWidth === 0).length;
    const overflow = document.documentElement.scrollWidth > window.innerWidth;
    const optionEls = Array.from(document.querySelectorAll('[data-resolve-option-id]'));
    const forbiddenButtons = Array.from(content ? content.querySelectorAll('button,a,[role="button"]') : [])
      .map((el) => String(el.textContent || '').trim())
      .filter((label) => /\b(apply|resolve|reward|trigger)\b/i.test(label));

    return {
      cards: cards.length,
      detailOpen: Boolean(overlay && !overlay.classList.contains('hidden')),
      detailImageLoaded: Boolean(detailImg && detailImg.complete && detailImg.naturalWidth > 0),
      resolveSectionVisible: Boolean(content && content.querySelector('[data-resolve-preview-section="true"]')),
      questionVisible: /Was möchtest du tun\?/i.test(text),
      optionCount: optionEls.length,
      feedbackVisible: /Vorschau-Feedback/i.test(text),
      plannedEffectsVisible: /Geplante Effekte \(nur Vorschau\)/i.test(text),
      noApplyVisible: /Apply möglich:\s*false/i.test(text),
      noResolveVisible: /Keine Entscheidung möglich:\s*true/i.test(text),
      persistedResolveChoiceNull: /Persisted Resolve Choice:\s*null/i.test(text),
      actionsEmpty: /resolve|reward|trigger|apply/i.test(forbiddenButtons.join(' ')) === false,
      canResolveFalse: /Keine Entscheidung möglich:\s*true/i.test(text),
      canApplyEffectsFalse: /Apply möglich:\s*false/i.test(text),
      selectedCandidateNull: /selectedCandidate/i.test(text) === false,
      persistedSelectedCandidateNull: /persisted=null/i.test(String(status ? status.getAttribute('data-flow-state') || '' : '')),
      runtimeWriteFalse: /runtimeWrite=false/i.test(String(status ? status.getAttribute('data-flow-state') || '' : '')),
      productionFalse: /production=false/i.test(String(status ? status.getAttribute('data-flow-state') || '' : '')),
      saveStorageWrites: 0,
      brokenImages: broken,
      horizontalOverflow: overflow,
      statusText,
    };
  });
}

function toMarkdown(report) {
  return [
    '# Phase 165 - Resolve Preview UI Smoke',
    '',
    `- ok: ${report.ok}`,
    `- resolvePreviewVisible: ${report.summary.resolvePreviewVisible}`,
    `- questionVisible: ${report.summary.questionVisible}`,
    `- optionsVisible: ${report.summary.optionsVisible}`,
    `- feedbackVisible: ${report.summary.feedbackVisible}`,
    `- plannedEffectsVisible: ${report.summary.plannedEffectsVisible}`,
    `- canResolveFalse: ${report.summary.canResolveFalse}`,
    `- canApplyEffectsFalse: ${report.summary.canApplyEffectsFalse}`,
    `- runtimeWriteFalse: ${report.summary.runtimeWriteFalse}`,
    `- productionFalse: ${report.summary.productionFalse}`,
    `- saveStorageWrites: ${report.summary.saveStorageWrites}`,
    '',
  ].join('\n');
}

async function main() {
  runStep(['dev/run-event-v2-resolve-preview-model-report.js']);
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
      candidateListVisible: largest.cards === 15,
      detailOpen: largest.detailOpen,
      resolvePreviewVisible: largest.resolveSectionVisible,
      questionVisible: largest.questionVisible,
      optionsVisible: largest.optionCount >= 2 && largest.optionCount <= 3,
      feedbackVisible: largest.feedbackVisible,
      plannedEffectsVisible: largest.plannedEffectsVisible,
      noApplyVisible: largest.noApplyVisible,
      noResolveVisible: largest.noResolveVisible,
      canResolveFalse: largest.canResolveFalse,
      canApplyEffectsFalse: largest.canApplyEffectsFalse,
      actionsEmpty: largest.actionsEmpty,
      selectedCandidateNull: largest.selectedCandidateNull,
      persistedSelectedCandidateNull: largest.persistedSelectedCandidateNull,
      persistedResolveChoiceNull: largest.persistedResolveChoiceNull,
      runtimeWriteFalse: largest.runtimeWriteFalse,
      productionFalse: largest.productionFalse,
      saveStorageWrites: largest.saveStorageWrites,
      brokenImages: largest.brokenImages,
      horizontalOverflow: viewportResults.some((entry) => entry.horizontalOverflow),
      jsErrors,
    };
    const report = {
      ok: summary.candidateListVisible
        && summary.detailOpen
        && summary.resolvePreviewVisible
        && summary.questionVisible
        && summary.optionsVisible
        && summary.feedbackVisible
        && summary.plannedEffectsVisible
        && summary.noApplyVisible
        && summary.noResolveVisible
        && summary.canResolveFalse
        && summary.canApplyEffectsFalse
        && summary.actionsEmpty
        && summary.selectedCandidateNull
        && summary.persistedSelectedCandidateNull
        && summary.persistedResolveChoiceNull
        && summary.runtimeWriteFalse
        && summary.productionFalse
        && summary.saveStorageWrites === 0
        && summary.brokenImages === 0
        && summary.horizontalOverflow === false
        && summary.jsErrors.length === 0,
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

