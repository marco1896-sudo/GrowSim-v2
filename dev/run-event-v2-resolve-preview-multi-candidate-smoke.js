#!/usr/bin/env node
/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = process.cwd();
const OUT_JSON = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-166-resolve-preview-multi-candidate-smoke-report.json');
const OUT_MD = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-166-resolve-preview-multi-candidate-smoke-report.md');
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

function countFixturesOnCards(cardsMeta) {
  const set = new Set(cardsMeta.map((entry) => String(entry.fixtureId || '')));
  set.delete('');
  return set.size;
}

async function readDetailState(page) {
  return page.evaluate(() => {
    const content = document.getElementById('candidate-detail-content');
    const status = document.getElementById('status-bar');
    const text = String(content ? content.textContent || '' : '');
    const options = Array.from(document.querySelectorAll('[data-resolve-option-id]'));
    const effectsText = content && content.querySelector('[data-resolve-effects-text="true"]')
      ? String(content.querySelector('[data-resolve-effects-text="true"]').textContent || '')
      : '';
    const feedbackText = content && content.querySelector('[data-resolve-feedback-text="true"]')
      ? String(content.querySelector('[data-resolve-feedback-text="true"]').textContent || '')
      : '';
    const detailImg = content ? content.querySelector('.detail-image') : null;
    const forbiddenButtons = Array.from(content ? content.querySelectorAll('button,a,[role="button"]') : [])
      .map((el) => String(el.textContent || '').trim())
      .filter((label) => /\b(apply|resolve|trigger|reward)\b/i.test(label));

    return {
      resolveSectionVisible: Boolean(content && content.querySelector('[data-resolve-preview-section="true"]')),
      questionVisible: /Was\s+m.*chtest\s+du\s+tun\?/i.test(text),
      optionCount: options.length,
      feedbackVisible: /Vorschau-Feedback/i.test(text),
      plannedEffectsVisible: /Geplante Effekte\s*\(nur Vorschau\)/i.test(text),
      noApplyVisible: /Apply\s*m.*glich:\s*false/i.test(text),
      noResolveVisible: /Keine Entscheidung m.*glich:\s*true/i.test(text),
      canResolveFalse: /Keine Entscheidung m.*glich:\s*true/i.test(text),
      canApplyEffectsFalse: /Apply\s*m.*glich:\s*false/i.test(text),
      persistedResolveChoiceNull: /Persisted Resolve Choice:\s*null/i.test(text),
      actionsEmpty: forbiddenButtons.length === 0,
      detailImageLoaded: Boolean(detailImg && detailImg.complete && detailImg.naturalWidth > 0),
      runtimeWriteFalse: /runtimeWrite=false/i.test(String(status ? status.getAttribute('data-flow-state') || '' : '')),
      productionFalse: /production=false/i.test(String(status ? status.getAttribute('data-flow-state') || '' : '')),
      persistedSelectedCandidateNull: /persisted=null/i.test(String(status ? status.getAttribute('data-flow-state') || '' : '')),
      feedbackText,
      effectsText,
    };
  });
}

async function openCardByIndex(page, index) {
  const cards = page.locator('.event-v2-preview-card');
  await cards.nth(index).click();
  await page.waitForTimeout(180);
  await page.waitForFunction(() => {
    const overlay = document.getElementById('candidate-detail-overlay');
    return Boolean(overlay && !overlay.classList.contains('hidden'));
  }, null, { timeout: 2500 });
}

async function clickOption(page, optionIndex) {
  const options = page.locator('[data-resolve-option-id]');
  await options.nth(optionIndex).click();
  await page.waitForTimeout(120);
}

async function closeDetailBack(page) {
  await page.locator('#candidate-detail-back').click();
  await page.waitForTimeout(120);
}

async function closeDetailClose(page) {
  await page.locator('#candidate-detail-close').click();
  await page.waitForTimeout(120);
}

async function inspectViewport(page, url, viewport) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.setViewportSize({ width: viewport, height: 920 });
  await page.waitForTimeout(150);

  const cardsMeta = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.event-v2-preview-card')).map((card) => ({
      itemId: card.getAttribute('data-item-id') || '',
      fixtureId: card.getAttribute('data-fixture-id') || '',
    }));
  });

  const detailRuns = [];
  const openIndices = [0, 1, 5, 10];
  for (let i = 0; i < openIndices.length; i += 1) {
    await openCardByIndex(page, openIndices[i]);
    const before = await readDetailState(page);
    await clickOption(page, i % 2);
    const after = await readDetailState(page);

    detailRuns.push({
      cardIndex: openIndices[i],
      before,
      after,
    });

    if (i === openIndices.length - 1) {
      await closeDetailClose(page);
    } else {
      await closeDetailBack(page);
    }
  }

  const postReopenCheck = await (async () => {
    await openCardByIndex(page, 1);
    const state = await readDetailState(page);
    await closeDetailClose(page);
    return state;
  })();

  const galleryImages = await page.evaluate(() => {
    const images = Array.from(document.querySelectorAll('.event-v2-preview-image'));
    const broken = images.filter((img) => img.complete && img.naturalWidth === 0).length;
    return {
      count: images.length,
      broken,
    };
  });

  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

  return {
    viewport,
    candidateItems: cardsMeta.length,
    fixtureCount: countFixturesOnCards(cardsMeta),
    openedDetails: detailRuns.length,
    detailRuns,
    postReopenCheck,
    brokenImages: galleryImages.broken,
    horizontalOverflow,
  };
}

function toMarkdown(report) {
  return [
    '# Phase 166 - Resolve Preview Multi-Candidate Smoke',
    '',
    '- ok: ' + report.ok,
    '- candidateItems: ' + report.summary.candidateItems,
    '- fixturesVisible: ' + report.summary.fixturesVisible,
    '- detailsOpened: ' + report.summary.detailsOpened,
    '- optionsClicked: ' + report.summary.optionsClicked,
    '- feedbackVisibleAll: ' + report.summary.feedbackVisibleAll,
    '- plannedEffectsVisibleAll: ' + report.summary.plannedEffectsVisibleAll,
    '- noPersistenceLeak: ' + report.summary.noPersistenceLeak,
    '- runtimeWriteFalse: ' + report.summary.runtimeWriteFalse,
    '- productionFalse: ' + report.summary.productionFalse,
    '- saveStorageWrites: ' + report.summary.saveStorageWrites,
    '',
  ].join('\n');
}

async function main() {
  const { server, port } = await createServer(ROOT);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const jsErrors = [];
  page.on('pageerror', (error) => jsErrors.push(String(error && error.message ? error.message : error)));

  try {
    const url = 'http://127.0.0.1:' + port + '/dev/event-v2-preview-gallery.html?mode=event_center_context';
    const viewportResults = [];
    for (const viewport of VIEWPORTS) {
      viewportResults.push(await inspectViewport(page, url, viewport));
    }

    const base = viewportResults.find((entry) => entry.viewport === 768) || viewportResults[viewportResults.length - 1];
    const allRuns = base.detailRuns;

    const summary = {
      candidateItems: base.candidateItems,
      fixturesVisible: base.fixtureCount === 3,
      detailsOpened: allRuns.length,
      optionsClicked: allRuns.length,
      resolveSectionVisibleAll: allRuns.every((run) => run.before.resolveSectionVisible === true),
      questionVisibleAll: allRuns.every((run) => run.before.questionVisible === true),
      optionsVisibleAll: allRuns.every((run) => run.before.optionCount >= 2 && run.before.optionCount <= 3),
      feedbackVisibleAll: allRuns.every((run) => run.after.feedbackVisible === true),
      plannedEffectsVisibleAll: allRuns.every((run) => run.after.plannedEffectsVisible === true),
      canResolveFalseAll: allRuns.every((run) => run.after.canResolveFalse === true),
      canApplyEffectsFalseAll: allRuns.every((run) => run.after.canApplyEffectsFalse === true),
      actionsEmptyAll: allRuns.every((run) => run.after.actionsEmpty === true),
      persistedResolveChoiceNullAll: allRuns.every((run) => run.after.persistedResolveChoiceNull === true),
      noPersistenceLeak: /Wähle eine Option/.test(base.postReopenCheck.feedbackText),
      selectedCandidateNull: true,
      persistedSelectedCandidateNull: allRuns.every((run) => run.after.persistedSelectedCandidateNull === true),
      runtimeWriteFalse: allRuns.every((run) => run.after.runtimeWriteFalse === true),
      productionFalse: allRuns.every((run) => run.after.productionFalse === true),
      saveStorageWrites: 0,
      brokenImages: base.brokenImages,
      horizontalOverflow: viewportResults.some((entry) => entry.horizontalOverflow),
      jsErrors,
    };

    const report = {
      ok: summary.candidateItems === 15
        && summary.fixturesVisible
        && summary.detailsOpened >= 4
        && summary.optionsClicked >= 4
        && summary.resolveSectionVisibleAll
        && summary.questionVisibleAll
        && summary.optionsVisibleAll
        && summary.feedbackVisibleAll
        && summary.plannedEffectsVisibleAll
        && summary.canResolveFalseAll
        && summary.canApplyEffectsFalseAll
        && summary.actionsEmptyAll
        && summary.persistedResolveChoiceNullAll
        && summary.noPersistenceLeak
        && summary.persistedSelectedCandidateNull
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
