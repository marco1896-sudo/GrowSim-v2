#!/usr/bin/env node
/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = process.cwd();
const PAGE_PATH = '/dev/event-v2-preview-gallery.html';
const OUT_JSON = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-135-preview-browser-smoke-report.json');
const OUT_MD = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-135-preview-browser-smoke-report.md');
const VIEWPORTS = [360, 390, 430, 768];

function contentType(filePath) {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.html')) return 'text/html; charset=utf-8';
  if (lower.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (lower.endsWith('.json')) return 'application/json; charset=utf-8';
  if (lower.endsWith('.css')) return 'text/css; charset=utf-8';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
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
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, port: addr.port });
    });
    server.on('error', reject);
  });
}

async function runForViewport(page, width) {
  await page.setViewportSize({ width, height: 900 });
  await page.waitForTimeout(150);

  const data = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.event-v2-preview-card'));
    const imgs = Array.from(document.querySelectorAll('.event-v2-preview-image'));
    const loaded = imgs.filter((img) => img.complete && img.naturalWidth > 0).length;
    const broken = imgs.filter((img) => img.complete && img.naturalWidth === 0).length;

    const overflow = document.documentElement.scrollWidth > window.innerWidth;
    const maxCardRight = cards.reduce((m, card) => Math.max(m, card.getBoundingClientRect().right), 0);
    const inBounds = maxCardRight <= window.innerWidth + 1;

    return {
      cards: cards.length,
      imagesTotal: imgs.length,
      imagesLoaded: loaded,
      brokenImages: broken,
      horizontalOverflow: overflow || !inBounds,
      filterControls: {
        revision: Boolean(document.getElementById('filter-revision')),
        environment: Boolean(document.getElementById('filter-env')),
      },
    };
  });

  return { viewport: width, ...data };
}

async function main() {
  const { server, port } = await createStaticServer(ROOT);
  const url = `http://127.0.0.1:${port}${PAGE_PATH}`;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const jsErrors = [];
  page.on('pageerror', (err) => jsErrors.push(String(err.message || err)));

  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForSelector('.event-v2-preview-card', { timeout: 15000 });

    const results = [];
    for (const vp of VIEWPORTS) {
      results.push(await runForViewport(page, vp));
    }

    const totals = {
      testedViewports: VIEWPORTS,
      cardsExpected: 22,
      cardsAtLargestViewport: results.find((r) => r.viewport === 768)?.cards || 0,
      minCardsAcrossViewports: Math.min(...results.map((r) => r.cards)),
      maxCardsAcrossViewports: Math.max(...results.map((r) => r.cards)),
      imagesLoadedAtLargestViewport: results.find((r) => r.viewport === 768)?.imagesLoaded || 0,
      brokenImagesAtLargestViewport: results.find((r) => r.viewport === 768)?.brokenImages || 0,
      anyHorizontalOverflow: results.some((r) => r.horizontalOverflow),
      anyBrokenImages: results.some((r) => r.brokenImages > 0),
      jsErrors,
    };

    const ok = totals.cardsAtLargestViewport === 22 && !totals.anyBrokenImages && !totals.anyHorizontalOverflow && jsErrors.length === 0;

    const report = {
      ok,
      phase: '135',
      browserSmokeExecuted: true,
      pageUrl: url,
      summary: totals,
      viewportResults: results,
      filterStatus: {
        revisionFilterPresent: results.every((r) => r.filterControls.revision),
        environmentFilterPresent: results.every((r) => r.filterControls.environment),
      },
    };

    fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
    fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');

    const lines = [
      '# Phase 135 - Preview Browser Smoke Report',
      '',
      `- browserSmokeExecuted: ${report.browserSmokeExecuted}`,
      `- testedViewports: ${VIEWPORTS.join(', ')}`,
      `- cardsAtLargestViewport: ${totals.cardsAtLargestViewport}`,
      `- imagesLoadedAtLargestViewport: ${totals.imagesLoadedAtLargestViewport}`,
      `- brokenImagesAtLargestViewport: ${totals.brokenImagesAtLargestViewport}`,
      `- anyHorizontalOverflow: ${totals.anyHorizontalOverflow}`,
      `- jsErrors: ${jsErrors.length}`,
      `- filterRevisionPresent: ${report.filterStatus.revisionFilterPresent}`,
      `- filterEnvironmentPresent: ${report.filterStatus.environmentFilterPresent}`,
      `- ok: ${report.ok}`,
    ];
    fs.writeFileSync(OUT_MD, lines.join('\n') + '\n', 'utf8');

    console.log(JSON.stringify(report, null, 2));
    process.exit(ok ? 0 : 1);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
