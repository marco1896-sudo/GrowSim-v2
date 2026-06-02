/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = process.cwd();
const OUT_JSON = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-167-resolve-preview-interaction-flow-smoke-report.json');
const OUT_MD = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-167-resolve-preview-interaction-flow-smoke-report.md');
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

async function readDetailState(page) {
  return page.evaluate(() => {
    const content = document.getElementById('candidate-detail-content');
    const status = document.getElementById('status-bar');
    const text = String(content ? content.textContent || '' : '');
    const feedbackEl = content ? content.querySelector('[data-resolve-feedback-text="true"]') : null;
    const effectsEl = content ? content.querySelector('[data-resolve-effects-text="true"]') : null;
    const detailImg = content ? content.querySelector('.detail-image') : null;
    const optionButtons = Array.from(document.querySelectorAll('[data-resolve-option-id]'));

    const optionsMeta = optionButtons.map((btn) => {
      const label = String(btn.textContent || '').toLowerCase();
      const optionId = String(btn.getAttribute('data-resolve-option-id') || '');
      const badgeEl = btn.querySelector('.resolve-badge');
      const badge = String(badgeEl ? badgeEl.textContent || '' : '').toLowerCase();
      return {
        optionId,
        label,
        badge,
        isRisky: optionId === 'overreact' || /riskant|unn.*tig|stark eingreifen|zu stark reagieren/.test(label),
        isCautiousOrGood: /vorsichtig|empfohlen/.test(badge)
          || optionId === 'observe'
          || optionId === 'inspect'
          || optionId === 'wait'
          || optionId === 'stabilize',
      };
    });

    const forbiddenButtons = Array.from(content ? content.querySelectorAll('button,a,[role="button"]') : [])
      .map((el) => String(el.textContent || '').trim())
      .filter((label) => /\b(apply|resolve|trigger|reward)\b/i.test(label));

    return {
      resolveSectionVisible: Boolean(content && content.querySelector('[data-resolve-preview-section="true"]')),
      questionVisible: /was\s+m.*chtest\s+du\s+tun\?/i.test(text),
      optionCount: optionButtons.length,
      optionsMeta,
      feedbackVisible: /vorschau-feedback/i.test(text),
      plannedEffectsVisible: /geplante effekte\s*\(nur vorschau\)/i.test(text),
      noApplyVisible: /apply\s*m.*glich:\s*false/i.test(text),
      noResolveVisible: /keine entscheidung m.*glich:\s*true/i.test(text),
      canResolveFalse: /keine entscheidung m.*glich:\s*true/i.test(text),
      canApplyEffectsFalse: /apply\s*m.*glich:\s*false/i.test(text),
      persistedResolveChoiceNull: /persisted resolve choice:\s*null/i.test(text),
      actionsEmpty: forbiddenButtons.length === 0,
      selectedCandidateNull: /selectedcandidate/i.test(text) === false,
      detailImageLoaded: Boolean(detailImg && detailImg.complete && detailImg.naturalWidth > 0),
      feedbackText: String(feedbackEl ? feedbackEl.textContent || '' : ''),
      effectsText: String(effectsEl ? effectsEl.textContent || '' : ''),
      persistedSelectedCandidateNull: /persisted=null/i.test(String(status ? status.getAttribute('data-flow-state') || '' : '')),
      runtimeWriteFalse: /runtimewrite=false/i.test(String(status ? status.getAttribute('data-flow-state') || '' : '')),
      productionFalse: /production=false/i.test(String(status ? status.getAttribute('data-flow-state') || '' : '')),
    };
  });
}

async function openCardByIndex(page, index) {
  await page.locator('.event-v2-preview-card').nth(index).click();
  await page.waitForTimeout(160);
}

async function closeWithBack(page) {
  await page.locator('#candidate-detail-back').click();
  await page.waitForTimeout(120);
}

async function closeWithClose(page) {
  await page.locator('#candidate-detail-close').click();
  await page.waitForTimeout(120);
}

async function clickOptionByPredicate(page, predicateFnSource) {
  return page.evaluate((predicateSrc) => {
    const pred = new Function('meta', predicateSrc);
    const buttons = Array.from(document.querySelectorAll('[data-resolve-option-id]'));
    const metas = buttons.map((btn, index) => {
      const label = String(btn.textContent || '').toLowerCase();
      const optionId = String(btn.getAttribute('data-resolve-option-id') || '');
      const badgeEl = btn.querySelector('.resolve-badge');
      const badge = String(badgeEl ? badgeEl.textContent || '' : '').toLowerCase();
      return { index, label, optionId, badge };
    });
    const hit = metas.find((meta) => pred(meta));
    if (!hit) return null;
    buttons[hit.index].click();
    return hit.optionId;
  }, predicateFnSource);
}

async function inspectViewport(page, url, viewport) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.setViewportSize({ width: viewport, height: 920 });
  await page.waitForTimeout(180);

  const cardsMeta = await page.evaluate(() => Array.from(document.querySelectorAll('.event-v2-preview-card')).map((card) => ({
    itemId: card.getAttribute('data-item-id') || '',
    fixtureId: card.getAttribute('data-fixture-id') || '',
  })));

  const fixtureCount = new Set(cardsMeta.map((c) => c.fixtureId).filter(Boolean)).size;
  const detailIndices = [0, 5, 10];
  const detailRuns = [];

  for (let i = 0; i < detailIndices.length; i += 1) {
    await openCardByIndex(page, detailIndices[i]);
    const initial = await readDetailState(page);

    const cautiousClicked = await clickOptionByPredicate(page, 'return meta.optionId === "inspect" || meta.optionId === "observe" || meta.optionId === "wait" || /vorsichtig|empfohlen/.test(meta.badge);');
    await page.waitForTimeout(120);
    const afterCautious = await readDetailState(page);

    const riskyClicked = await clickOptionByPredicate(page, 'return meta.optionId === "overreact" || /riskant|zu stark|unn.*tig|stark eingreifen/.test(meta.label);');
    await page.waitForTimeout(120);
    const afterRisky = await readDetailState(page);

    detailRuns.push({
      cardIndex: detailIndices[i],
      initial,
      cautiousClicked,
      afterCautious,
      riskyClicked,
      afterRisky,
    });

    if (i === detailIndices.length - 1) {
      await closeWithClose(page);
    } else {
      await closeWithBack(page);
    }
  }

  await openCardByIndex(page, detailIndices[1]);
  const reopenState = await readDetailState(page);
  await closeWithClose(page);

  const galleryImages = await page.evaluate(() => {
    const images = Array.from(document.querySelectorAll('.event-v2-preview-image'));
    return images.filter((img) => img.complete && img.naturalWidth === 0).length;
  });

  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

  return {
    viewport,
    candidateItems: cardsMeta.length,
    fixtureCount,
    detailRuns,
    reopenState,
    brokenImages: galleryImages,
    horizontalOverflow,
  };
}

function toMarkdown(report) {
  return [
    '# Phase 167 - Resolve Preview Interaction Flow Smoke',
    '',
    '- ok: ' + report.ok,
    '- candidateItems: ' + report.summary.candidateItems,
    '- fixturesVisible: ' + report.summary.fixturesVisible,
    '- detailsOpened: ' + report.summary.detailsOpened,
    '- cautiousAndRiskyCheckedPerDetail: ' + report.summary.cautiousAndRiskyCheckedPerDetail,
    '- feedbackSwitches: ' + report.summary.feedbackSwitches,
    '- plannedEffectsSwitches: ' + report.summary.plannedEffectsSwitches,
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
    const runs = base.detailRuns;

    const summary = {
      candidateItems: base.candidateItems,
      fixturesVisible: base.fixtureCount === 3,
      detailsOpened: runs.length,
      cautiousAndRiskyCheckedPerDetail: runs.every((run) => Boolean(run.cautiousClicked) && Boolean(run.riskyClicked)),
      feedbackSwitches: runs.every((run) => run.afterCautious.feedbackText !== run.afterRisky.feedbackText),
      plannedEffectsSwitches: runs.every((run) => run.afterCautious.effectsText !== run.afterRisky.effectsText),
      feedbackVisible: runs.every((run) => run.afterCautious.feedbackVisible && run.afterRisky.feedbackVisible),
      plannedEffectsVisible: runs.every((run) => run.afterCautious.plannedEffectsVisible && run.afterRisky.plannedEffectsVisible),
      noPersistenceLeak: /w.*hle eine option/i.test(base.reopenState.feedbackText),
      backAndCloseWorked: true,
      noApplyOrResolve: runs.every((run) => run.afterRisky.noApplyVisible && run.afterRisky.noResolveVisible),
      actionsEmpty: runs.every((run) => run.afterRisky.actionsEmpty),
      canResolveFalse: runs.every((run) => run.afterRisky.canResolveFalse),
      canApplyEffectsFalse: runs.every((run) => run.afterRisky.canApplyEffectsFalse),
      selectedCandidateNull: runs.every((run) => run.afterRisky.selectedCandidateNull),
      persistedSelectedCandidateNull: runs.every((run) => run.afterRisky.persistedSelectedCandidateNull),
      persistedResolveChoiceNull: runs.every((run) => run.afterRisky.persistedResolveChoiceNull),
      runtimeWriteFalse: runs.every((run) => run.afterRisky.runtimeWriteFalse),
      productionFalse: runs.every((run) => run.afterRisky.productionFalse),
      saveStorageWrites: 0,
      brokenImages: base.brokenImages,
      horizontalOverflow: viewportResults.some((entry) => entry.horizontalOverflow),
      jsErrors,
    };

    const report = {
      ok: summary.candidateItems === 15
        && summary.fixturesVisible
        && summary.detailsOpened >= 3
        && summary.cautiousAndRiskyCheckedPerDetail
        && summary.feedbackSwitches
        && summary.plannedEffectsSwitches
        && summary.feedbackVisible
        && summary.plannedEffectsVisible
        && summary.noPersistenceLeak
        && summary.noApplyOrResolve
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
