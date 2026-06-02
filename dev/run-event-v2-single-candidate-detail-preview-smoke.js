#!/usr/bin/env node
/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = process.cwd();
const OUT_JSON = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-153-single-candidate-detail-preview-smoke-report.json');
const OUT_MD = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-153-single-candidate-detail-preview-smoke-report.md');
const VIEWPORTS = [360, 390, 430, 768];

function runStep(args) {
  const result = spawnSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`Failed step: node ${args.join(' ')}`);
  }
  return result;
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
  await page.waitForTimeout(140);
  await page.locator('.event-v2-preview-card').first().evaluate((el) => el.click());
  await page.waitForTimeout(180);
  await page.waitForFunction(() => {
    const detailImg = document.querySelector('#candidate-detail-content .detail-image');
    return Boolean(detailImg && detailImg.complete);
  }, null, { timeout: 2000 }).catch(() => null);
  return page.evaluate(() => {
    const overlay = document.getElementById('candidate-detail-overlay');
    const content = document.getElementById('candidate-detail-content');
    const detailText = content ? content.textContent || '' : '';
    const detailImg = content ? content.querySelector('.detail-image') : null;
    const cards = Array.from(document.querySelectorAll('.event-v2-preview-card'));
    const imgs = Array.from(document.querySelectorAll('.event-v2-preview-image'));
    const loaded = imgs.filter((img) => img.complete && img.naturalWidth > 0).length;
    const broken = imgs.filter((img) => img.complete && img.naturalWidth === 0).length;
    const overflow = document.documentElement.scrollWidth > window.innerWidth;
    const closeBtn = document.getElementById('candidate-detail-close');
    const backBtn = document.getElementById('candidate-detail-back');
    const isOpen = overlay && !overlay.classList.contains('hidden');
    const forbiddenActionPattern = /\b(resolve|reward|trigger|apply|choose)\b/i;
    const detailButtons = content
      ? Array.from(content.querySelectorAll('button,a,[role="button"]'))
      : [];
    const detailActionTokens = detailButtons
      .map((el) => String(el.textContent || '').trim())
      .filter(Boolean);
    const hasForbiddenAction = detailActionTokens.some((label) => forbiddenActionPattern.test(label));
    return {
      cards: cards.length,
      imagesLoaded: loaded,
      brokenImages: broken,
      horizontalOverflow: overflow,
      detailOpen: Boolean(isOpen),
      detailImageLoaded: Boolean(detailImg && detailImg.complete && detailImg.naturalWidth > 0),
      safetyLabelsVisible: /Testmodus|Vorschlagskarte|Nur Vorschau|Keine Entscheidung möglich|Kein Einfluss auf deinen Spielstand/.test(detailText),
      noResolveVisible: /Keine Entscheidung möglich:\s*true/i.test(detailText),
      runtimeWriteFalseVisible: /Nur Vorschau gespeichert:\s*true/i.test(detailText),
      productionFalseVisible: /Production:\s*true/i.test(detailText),
      actionsFound: hasForbiddenAction,
      selectedCandidateMention: /selectedCandidate/i.test(detailText),
      closeBackPresent: Boolean(closeBtn && backBtn),
    };
  });
}

function toMarkdown(report) {
  return [
    '# Phase 153 - Single Candidate Detail Preview Smoke',
    '',
    `- ok: ${report.ok}`,
    `- detailPreviewReachable: ${report.summary.detailPreviewReachable}`,
    `- detailImageValid: ${report.summary.detailImageValid}`,
    `- safetyLabelsVisible: ${report.summary.safetyLabelsVisible}`,
    `- noResolveVisible: ${report.summary.noResolveVisible}`,
    `- actionsEmpty: ${report.summary.actionsEmpty}`,
    `- selectedCandidateNull: ${report.summary.selectedCandidateNull}`,
    `- runtimeWriteFalse: ${report.summary.runtimeWriteFalse}`,
    `- productionFalse: ${report.summary.productionFalse}`,
    `- backCloseWorks: ${report.summary.backCloseWorks}`,
    '',
  ].join('\n');
}

async function main() {
  runStep(['dev/run-event-v2-event-center-context-browser-smoke.js']);
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
      detailPreviewReachable: largest.detailOpen === true,
      detailImageValid: largest.detailImageLoaded === true,
      safetyLabelsVisible: largest.safetyLabelsVisible === true,
      noResolveVisible: largest.noResolveVisible === true,
      actionsEmpty: largest.actionsFound === false,
      selectedCandidateNull: largest.selectedCandidateMention === false,
      runtimeWriteFalse: largest.runtimeWriteFalseVisible === true,
      productionFalse: largest.productionFalseVisible === true,
      backCloseWorks: largest.closeBackPresent === true,
      brokenImages: largest.brokenImages,
      horizontalOverflow: viewportResults.some((entry) => entry.horizontalOverflow),
      jsErrors,
    };

    const report = {
      ok: summary.detailPreviewReachable
        && summary.detailImageValid
        && summary.safetyLabelsVisible
        && summary.noResolveVisible
        && summary.actionsEmpty
        && summary.selectedCandidateNull
        && summary.runtimeWriteFalse
        && summary.productionFalse
        && summary.backCloseWorks
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
