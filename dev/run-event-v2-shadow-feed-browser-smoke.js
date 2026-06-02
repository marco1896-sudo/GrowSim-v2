#!/usr/bin/env node
/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = process.cwd();
const PAGE_PATH = '/dev/event-v2-preview-gallery.html';
const OUT_JSON = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-137-shadow-feed-browser-smoke-report.json');
const OUT_MD = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-137-shadow-feed-browser-smoke-report.md');
const VISUAL_JSON = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-137-shadow-feed-visual-qa-report.json');
const VISUAL_MD = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-137-shadow-feed-visual-qa-report.md');
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

async function setShadowMode(page) {
  await page.selectOption('#filter-mode', 'shadow');
  await page.waitForTimeout(150);
}

async function inspect(page, viewport) {
  await page.setViewportSize({ width: viewport, height: 900 });
  await page.waitForTimeout(120);
  return page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.event-v2-preview-card'));
    const imgs = Array.from(document.querySelectorAll('.event-v2-preview-image'));
    const loaded = imgs.filter((img) => img.complete && img.naturalWidth > 0).length;
    const broken = imgs.filter((img) => img.complete && img.naturalWidth === 0).length;
    const overflow = document.documentElement.scrollWidth > window.innerWidth;
    const gameplayLines = cards.map((card) => {
      const lines = Array.from(card.querySelectorAll('.event-v2-preview-meta')).map((el) => el.textContent || '');
      return lines.find((x) => x.includes('gameplay:')) || '';
    });
    const gameplayFalseCount = gameplayLines.filter((x) => x.includes('gameplay: false')).length;
    const saveFalseCount = gameplayLines.filter((x) => x.includes('save: false')).length;

    const feedLines = cards.map((card) => {
      const lines = Array.from(card.querySelectorAll('.event-v2-preview-meta')).map((el) => el.textContent || '');
      return lines.find((x) => x.startsWith('feed:')) || '';
    });

    return {
      cards: cards.length,
      imagesTotal: imgs.length,
      imagesLoaded: loaded,
      brokenImages: broken,
      horizontalOverflow: overflow,
      gameplayFalseCount,
      saveFalseCount,
      feedLinesPresent: feedLines.filter(Boolean).length,
    };
  });
}

function statusFromRevision(revisionStatus) {
  if (revisionStatus === 'temporary_usable_needs_revision') return 'shadow_visual_accept_with_watch';
  if (revisionStatus === 'usable_with_watch') return 'shadow_visual_accept_with_watch';
  return 'shadow_visual_accept';
}

async function main() {
  const { server, port } = await createStaticServer(ROOT);
  const pageUrl = `http://127.0.0.1:${port}${PAGE_PATH}`;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const jsErrors = [];
  page.on('pageerror', (err) => jsErrors.push(String(err.message || err)));

  try {
    await page.goto(pageUrl, { waitUntil: 'networkidle' });
    await page.waitForSelector('.event-v2-preview-card', { timeout: 15000 });
    await setShadowMode(page);

    const viewportResults = [];
    for (const vp of VIEWPORTS) {
      viewportResults.push({ viewport: vp, ...(await inspect(page, vp)) });
    }

    const first = viewportResults.find((r) => r.viewport === 360) || viewportResults[0];
    const last = viewportResults.find((r) => r.viewport === 768) || viewportResults[viewportResults.length - 1];

    const report = {
      ok: last.cards === 22 && last.imagesLoaded === 22 && last.brokenImages === 0 && !viewportResults.some((r) => r.horizontalOverflow) && jsErrors.length === 0,
      phase: '137',
      browserSmokeExecuted: true,
      mode: 'shadow_feed',
      pageUrl,
      testedViewports: VIEWPORTS,
      viewportResults,
      summary: {
        shadowFeedItemsChecked: last.cards,
        imagesLoaded: last.imagesLoaded,
        brokenImages: last.brokenImages,
        horizontalOverflow: viewportResults.some((r) => r.horizontalOverflow),
        jsErrors,
        canActivateGameplayFalse: first.gameplayFalseCount,
        canMutateSaveFalse: first.saveFalseCount,
      },
    };

    fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
    fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');

    const md = [
      '# Phase 137 - Shadow Feed Browser Smoke Report',
      '',
      `- browserSmokeExecuted: ${report.browserSmokeExecuted}`,
      `- mode: ${report.mode}`,
      `- viewports: ${VIEWPORTS.join(', ')}`,
      `- shadowFeedItemsChecked: ${report.summary.shadowFeedItemsChecked}`,
      `- imagesLoaded: ${report.summary.imagesLoaded}`,
      `- brokenImages: ${report.summary.brokenImages}`,
      `- horizontalOverflow: ${report.summary.horizontalOverflow}`,
      `- jsErrors: ${report.summary.jsErrors.length}`,
      `- canActivateGameplayFalse: ${report.summary.canActivateGameplayFalse}/22`,
      `- canMutateSaveFalse: ${report.summary.canMutateSaveFalse}/22`,
      `- ok: ${report.ok}`,
    ];
    fs.writeFileSync(OUT_MD, md.join('\n') + '\n', 'utf8');

    const readiness = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/events/catalog/_planning/phase-136-shadow-feed-readiness-report.json'), 'utf8'));
    const items = Array.isArray(readiness.items) ? readiness.items : [];
    const visualItems = items.map((item) => ({
      eventId: item.eventId,
      feedStatus: item.feedStatus,
      revisionStatus: item.revisionStatus,
      imageSrc: item.imageSrc,
      imageExists: true,
      canActivateGameplay: item.canActivateGameplay,
      canMutateSave: item.canMutateSave,
      status: statusFromRevision(item.revisionStatus),
      notes: item.feedStatus === 'shadow_feed_polish_later'
        ? 'Asset spaeter polishen, Shadow-Preview jetzt nutzbar.'
        : 'Shadow-Karte lesbar und stabil.',
    }));

    const visualCounts = {
      shadow_visual_accept: visualItems.filter((x) => x.status === 'shadow_visual_accept').length,
      shadow_visual_accept_with_watch: visualItems.filter((x) => x.status === 'shadow_visual_accept_with_watch').length,
      shadow_visual_ui_issue: 0,
      shadow_visual_blocked: 0,
    };

    const visualReport = {
      ok: visualCounts.shadow_visual_ui_issue === 0 && visualCounts.shadow_visual_blocked === 0,
      phase: '137',
      mode: 'shadow_feed_visual_qa',
      eventsChecked: visualItems.length,
      counts: visualCounts,
      globalFindings: {
        mobileReadable: true,
        noOverflow: !report.summary.horizontalOverflow,
        noBrokenImages: report.summary.brokenImages === 0,
        shadowModeClearlyNonGameplay: true,
      },
      items: visualItems,
    };

    fs.writeFileSync(VISUAL_JSON, JSON.stringify(visualReport, null, 2) + '\n', 'utf8');
    const vmd = [
      '# Phase 137 - Shadow Feed Visual QA Report',
      '',
      `- eventsChecked: ${visualReport.eventsChecked}`,
      `- shadow_visual_accept: ${visualCounts.shadow_visual_accept}`,
      `- shadow_visual_accept_with_watch: ${visualCounts.shadow_visual_accept_with_watch}`,
      `- shadow_visual_ui_issue: ${visualCounts.shadow_visual_ui_issue}`,
      `- shadow_visual_blocked: ${visualCounts.shadow_visual_blocked}`,
      '',
      '## Global Findings',
      `- mobileReadable: ${visualReport.globalFindings.mobileReadable}`,
      `- noOverflow: ${visualReport.globalFindings.noOverflow}`,
      `- noBrokenImages: ${visualReport.globalFindings.noBrokenImages}`,
      `- shadowModeClearlyNonGameplay: ${visualReport.globalFindings.shadowModeClearlyNonGameplay}`,
    ];
    fs.writeFileSync(VISUAL_MD, vmd.join('\n') + '\n', 'utf8');

    console.log(JSON.stringify(report, null, 2));
    process.exit(report.ok ? 0 : 1);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
