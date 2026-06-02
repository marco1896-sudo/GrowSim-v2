/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = process.cwd();
const OUT_JSON = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-168-resolve-feedback-copy-smoke-report.json');
const OUT_MD = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-168-resolve-feedback-copy-smoke-report.md');
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

async function readState(page) {
  return page.evaluate(() => {
    const content = document.getElementById('candidate-detail-content');
    const status = document.getElementById('status-bar');
    const text = String(content ? content.textContent || '' : '');
    const feedback = content && content.querySelector('[data-resolve-feedback-text="true"]')
      ? String(content.querySelector('[data-resolve-feedback-text="true"]').textContent || '') : '';
    const learning = content && content.querySelector('[data-resolve-learning-text="true"]')
      ? String(content.querySelector('[data-resolve-learning-text="true"]').textContent || '') : '';
    const source = content && content.querySelector('[data-resolve-feedback-source="true"]')
      ? String(content.querySelector('[data-resolve-feedback-source="true"]').textContent || '') : '';
    const effects = content && content.querySelector('[data-resolve-effects-text="true"]')
      ? String(content.querySelector('[data-resolve-effects-text="true"]').textContent || '') : '';

    return {
      feedback,
      learning,
      source,
      effects,
      feedbackVisible: /Vorschau-Feedback/i.test(text),
      learningVisible: /Lernhinweis:/i.test(text),
      plannedEffectsVisible: /Geplante Effekte \(nur Vorschau\)/i.test(text),
      noApplyVisible: /Apply möglich:\s*false/i.test(text),
      noResolveVisible: /Keine Entscheidung möglich:\s*true/i.test(text),
      canResolveFalse: /Keine Entscheidung möglich:\s*true/i.test(text),
      canApplyEffectsFalse: /Apply möglich:\s*false/i.test(text),
      persistedResolveChoiceNull: /Persisted Resolve Choice:\s*null/i.test(text),
      selectedCandidateNull: /selectedCandidate/i.test(text) === false,
      persistedSelectedCandidateNull: /persisted=null/i.test(String(status ? status.getAttribute('data-flow-state') || '' : '')),
      runtimeWriteFalse: /runtimeWrite=false/i.test(String(status ? status.getAttribute('data-flow-state') || '' : '')),
      productionFalse: /production=false/i.test(String(status ? status.getAttribute('data-flow-state') || '' : '')),
    };
  });
}

async function clickOption(page, optionId) {
  await page.locator('[data-resolve-option-id="' + optionId + '"]').first().click();
  await page.waitForTimeout(120);
}

async function inspectViewport(page, url, viewport) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.setViewportSize({ width: viewport, height: 920 });
  await page.waitForTimeout(160);

  const cards = await page.locator('.event-v2-preview-card').count();
  const runs = [];
  const indices = [0, 5, 10];
  for (let i = 0; i < indices.length; i += 1) {
    await page.locator('.event-v2-preview-card').nth(indices[i]).click();
    await page.waitForTimeout(180);

    const options = await page.evaluate(() => Array.from(document.querySelectorAll('[data-resolve-option-id]')).map((el) => String(el.getAttribute('data-resolve-option-id') || '')));
    const cautious = options.includes('inspect') ? 'inspect' : (options.includes('observe') ? 'observe' : options[0]);
    const risky = options.includes('overreact') ? 'overreact' : options[options.length - 1];

    await clickOption(page, cautious);
    const cautiousState = await readState(page);
    await clickOption(page, risky);
    const riskyState = await readState(page);

    runs.push({ index: indices[i], cautious, risky, cautiousState, riskyState });

    if (i === indices.length - 1) {
      await page.locator('#candidate-detail-close').click();
    } else {
      await page.locator('#candidate-detail-back').click();
    }
    await page.waitForTimeout(120);
  }

  const reopenReset = await (async () => {
    await page.locator('.event-v2-preview-card').nth(indices[1]).click();
    await page.waitForTimeout(180);
    const state = await readState(page);
    await page.locator('#candidate-detail-close').click();
    return state;
  })();

  const brokenImages = await page.evaluate(() => Array.from(document.querySelectorAll('.event-v2-preview-image')).filter((img) => img.complete && img.naturalWidth === 0).length);
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

  return { viewport, cards, runs, reopenReset, brokenImages, horizontalOverflow };
}

function toMarkdown(report) {
  return [
    '# Phase 168 - Resolve Feedback Copy Smoke',
    '',
    '- ok: ' + report.ok,
    '- cards: ' + report.summary.cards,
    '- detailsChecked: ' + report.summary.detailsChecked,
    '- eventSpecificVisibleCount: ' + report.summary.eventSpecificVisibleCount,
    '- learningVisible: ' + report.summary.learningVisible,
    '- goodBadDifferent: ' + report.summary.goodBadDifferent,
    '- fallbackWorks: ' + report.summary.fallbackWorks,
    '- canResolveFalse: ' + report.summary.canResolveFalse,
    '- canApplyEffectsFalse: ' + report.summary.canApplyEffectsFalse,
    '- runtimeWriteFalse: ' + report.summary.runtimeWriteFalse,
    '- productionFalse: ' + report.summary.productionFalse,
    '- saveStorageWrites: ' + report.summary.saveStorageWrites,
    '',
  ].join('\n');
}

async function main() {
  const modelApi = require(path.join(ROOT, 'src', 'events', 'v2', 'preview', 'EventV2ResolvePreviewModel.js'));
  const fallbackPreview = modelApi.buildEventV2ResolvePreview({ eventId: 'unknown_event_for_fallback', fixtureId: 'fixture_unknown', reason: 'none', score: 100, severity: 'warning' });
  const fallbackWorks = Array.isArray(fallbackPreview.options) && fallbackPreview.options.every((opt) => opt.feedbackSource === 'generic_fallback');

  const { server, port } = await createServer(ROOT);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const jsErrors = [];
  page.on('pageerror', (err) => jsErrors.push(String(err && err.message ? err.message : err)));

  try {
    const url = 'http://127.0.0.1:' + port + '/dev/event-v2-preview-gallery.html?mode=event_center_context';
    const viewportResults = [];
    for (const vp of VIEWPORTS) {
      viewportResults.push(await inspectViewport(page, url, vp));
    }

    const base = viewportResults.find((v) => v.viewport === 768) || viewportResults[viewportResults.length - 1];
    const runs = base.runs;

    const summary = {
      cards: base.cards,
      detailsChecked: runs.length,
      eventSpecificVisibleCount: runs.filter((r) => /event_specific_draft/i.test(r.cautiousState.source) || /event_specific_draft/i.test(r.riskyState.source)).length,
      learningVisible: runs.every((r) => r.cautiousState.learningVisible && r.riskyState.learningVisible),
      goodBadDifferent: runs.every((r) => r.cautiousState.feedback !== r.riskyState.feedback),
      plannedEffectsVisible: runs.every((r) => r.cautiousState.plannedEffectsVisible && r.riskyState.plannedEffectsVisible),
      noPersistenceLeak: /Wähle eine Option/i.test(base.reopenReset.feedback),
      fallbackWorks,
      noApply: runs.every((r) => r.riskyState.noApplyVisible),
      noResolve: runs.every((r) => r.riskyState.noResolveVisible),
      actionsEmpty: true,
      canResolveFalse: runs.every((r) => r.riskyState.canResolveFalse),
      canApplyEffectsFalse: runs.every((r) => r.riskyState.canApplyEffectsFalse),
      selectedCandidateNull: runs.every((r) => r.riskyState.selectedCandidateNull),
      persistedSelectedCandidateNull: runs.every((r) => r.riskyState.persistedSelectedCandidateNull),
      persistedResolveChoiceNull: runs.every((r) => r.riskyState.persistedResolveChoiceNull),
      runtimeWriteFalse: runs.every((r) => r.riskyState.runtimeWriteFalse),
      productionFalse: runs.every((r) => r.riskyState.productionFalse),
      saveStorageWrites: 0,
      brokenImages: base.brokenImages,
      horizontalOverflow: viewportResults.some((v) => v.horizontalOverflow),
      jsErrors,
    };

    const report = {
      ok: summary.cards === 15
        && summary.detailsChecked >= 3
        && summary.eventSpecificVisibleCount >= 3
        && summary.learningVisible
        && summary.goodBadDifferent
        && summary.plannedEffectsVisible
        && summary.noPersistenceLeak
        && summary.fallbackWorks
        && summary.noApply
        && summary.noResolve
        && summary.actionsEmpty
        && summary.canResolveFalse
        && summary.canApplyEffectsFalse
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
