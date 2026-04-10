#!/usr/bin/env node
'use strict';

const assert = require('assert');
const path = require('path');
const { chromium } = require('playwright');
const {
  installAuthHarness: setupAuthHarness,
  waitForBoot: waitForBootReady,
  clearClientStorage: resetClientStorage
} = require('./support/browserRuntime');
const { startStaticServer, closeBrowser, closeServer } = require('./support/serverRuntime');

const ROOT = path.resolve(__dirname, '..');
const HOST = '127.0.0.1';
const CLIENT_HOST = HOST;
let PORT = 0;

async function main() {
  const { server, port: resolvedPort } = await startStaticServer(ROOT, HOST);
  PORT = Number(resolvedPort || 0);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });

  try {
    const url = `http://${CLIENT_HOST}:${PORT}/`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#careSheet', { state: 'attached' });

    await page.evaluate(() => {
      const transparentPixel = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
      const careSheet = document.getElementById('careSheet');
      const actionList = document.getElementById('careActionList');
      const effectsList = document.getElementById('careEffectsList');
      const executeButton = document.getElementById('careExecuteButton');
      const feedback = document.getElementById('careFeedback');

      careSheet.classList.remove('hidden');
      careSheet.setAttribute('aria-hidden', 'false');

      actionList.innerHTML = `
        <button type="button" class="care-action-card is-selected">
          <div class="care-action-icon-box"><img src="${transparentPixel}" class="care-action-card-icon" alt=""></div>
          <div class="care-action-info-box"><span class="care-action-label">Leicht gieÃŸen</span><span class="care-action-hint">Sanfte Wassergabe</span></div>
        </button>
        <button type="button" class="care-action-card">
          <div class="care-action-icon-box"><img src="${transparentPixel}" class="care-action-card-icon" alt=""></div>
          <div class="care-action-info-box"><span class="care-action-label">Tief gieÃŸen</span><span class="care-action-hint">Mehr Volumen</span></div>
        </button>
        <button type="button" class="care-action-card">
          <div class="care-action-icon-box"><img src="${transparentPixel}" class="care-action-card-icon" alt=""></div>
          <div class="care-action-info-box"><span class="care-action-label">NÃ¤hrlÃ¶sung</span><span class="care-action-hint">Gezielte Versorgung</span></div>
        </button>
        <button type="button" class="care-action-card">
          <div class="care-action-icon-box"><img src="${transparentPixel}" class="care-action-card-icon" alt=""></div>
          <div class="care-action-info-box"><span class="care-action-label">SpÃ¼len</span><span class="care-action-hint">Druck senken</span></div>
        </button>
      `;

      effectsList.innerHTML = `
        <li class="care-section-label care-section-label--hints">Hinweise zur aktuellen Lage</li>
        <li class="care-hint-item care-hint-item--warning">
          <div class="care-hint-head"><span class="care-hint-marker" aria-hidden="true"></span></div>
          <strong class="care-hint-headline">Mehr Wasser erhÃ¶ht hier gerade den Druck an den Wurzeln.</strong>
          <p class="care-hint-message">Das Medium wirkt bereits stark belastet.</p>
        </li>
        <li class="care-hint-item care-hint-item--caution">
          <div class="care-hint-head"><span class="care-hint-marker" aria-hidden="true"></span></div>
          <strong class="care-hint-headline">StÃ¤rkeres GieÃŸen beruhigt das Klima gerade kaum.</strong>
          <p class="care-hint-message">Die Luft ist sehr trocken und der Rhythmus wird dadurch eher unruhig.</p>
        </li>
        <li class="care-section-label care-section-label--effects">Auswirkungen der Aktion</li>
        <li class="care-effect-row"><span>Feuchtigkeit</span><strong>+12</strong></li>
        <li class="care-effect-row"><span>NÃ¤hrstoffe</span><strong>+0</strong></li>
        <li class="care-effect-row"><span>Stress</span><strong>+1</strong></li>
        <li class="care-effect-row"><span>Risiko</span><strong>+2</strong></li>
      `;

      executeButton.disabled = false;
      executeButton.textContent = 'Aktion ausfÃ¼hren';
      feedback.textContent = 'Bereit zur AusfÃ¼hrung';
    });

    const careUiState = await page.evaluate(() => {
      const sheetContent = document.querySelector('#careSheet .sheet-content');
      const actionList = document.getElementById('careActionList');
      const effectsList = document.getElementById('careEffectsList');
      const executeButton = document.getElementById('careExecuteButton');

      const text = document.getElementById('careSheet').textContent || '';
      const sheetRect = sheetContent.getBoundingClientRect();
      sheetContent.scrollTop = sheetContent.scrollHeight;
      const executeRect = executeButton.getBoundingClientRect();

      const actionListStyle = window.getComputedStyle(actionList);
      const sheetContentStyle = window.getComputedStyle(sheetContent);
      const effectsListStyle = window.getComputedStyle(effectsList);

      return {
        text,
        sheetOverflowY: sheetContentStyle.overflowY,
        actionListOverflowY: actionListStyle.overflowY,
        actionListPaddingRight: actionListStyle.paddingRight,
        actionListScrollbarGutter: actionListStyle.scrollbarGutter || '',
        actionListHeight: actionList.getBoundingClientRect().height,
        effectsListOverflowY: effectsListStyle.overflowY,
        effectsListHeight: effectsList.getBoundingClientRect().height,
        effectsListChildCount: effectsList.children.length,
        executeReachable: executeRect.bottom <= sheetRect.bottom + 1,
        sheetScrollTop: sheetContent.scrollTop,
        needsScroll: sheetContent.scrollHeight > sheetContent.clientHeight + 1
      };
    });

    assert.ok(!/\uFFFD/.test(careUiState.text), 'care sheet should not contain replacement characters');
    assert.ok(!/F\?tter|N\?hr|Bl\?tter|gro\?en/i.test(careUiState.text), 'care sheet should not show broken German umlauts');
    assert.strictEqual(careUiState.sheetOverflowY, 'hidden', 'care sheet root should not own scrolling');
    assert.strictEqual(careUiState.actionListOverflowY, 'auto', 'care action list should stay internally scrollable');
    assert.ok(parseFloat(careUiState.actionListPaddingRight) >= 10, 'care action list should reserve space next to the scrollbar');
    assert.ok(/stable/i.test(careUiState.actionListScrollbarGutter), 'care action list should reserve a stable scrollbar gutter');
    assert.ok(careUiState.actionListHeight >= 150, 'care action list should keep enough visible height to show multiple actions');
    assert.strictEqual(careUiState.effectsListOverflowY, 'auto', 'care detail list should support internal scrolling when needed');
    assert.ok(careUiState.effectsListChildCount >= 4, 'care detail list should render hints and effect rows');
    assert.ok(careUiState.effectsListHeight >= 170, 'care detail list should gain more readable height once the preview is removed');
    assert.ok(/Hinweise zur aktuellen Lage/.test(careUiState.text), 'care detail should visibly include the hints section');
    assert.ok(/Auswirkungen der Aktion/.test(careUiState.text), 'care detail should visibly include the effects section');
    assert.ok(!/Warnung|Vorsicht|Empfehlung/.test(careUiState.text), 'care hints should no longer show visible severity words');
    assert.ok(careUiState.executeReachable, 'care execute button should remain visible and reachable on mobile');
    assert.ok(!careUiState.needsScroll, 'care sheet root should not need to scroll once internal owners are set correctly');
  } finally {
    await closeBrowser(browser);
    await closeServer(server);
  }
}

main()
  .then(() => {
    console.log('care sheet ui regression test passed');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


