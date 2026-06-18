#!/usr/bin/env node
'use strict';

const assert = require('assert');
const path = require('path');
const { chromium } = require('playwright');
const { startStaticServer, closeBrowser, closeServer } = require('./support/serverRuntime');

const ROOT = path.resolve(__dirname, '..');
const HOST = '127.0.0.1';
let PORT = 0;

async function main() {
  const { server, port: resolvedPort } = await startStaticServer(ROOT, HOST);
  PORT = Number(resolvedPort || 0);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });

  try {
    await page.goto(`http://${HOST}:${PORT}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#careSheet', { state: 'attached' });

    await page.evaluate(() => {
      const transparentPixel = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
      const careSheet = document.getElementById('careSheet');
      const categoryList = document.getElementById('careCategoryList');
      const actionList = document.getElementById('careActionList');
      const effectsList = document.getElementById('careEffectsList');
      const decisionZone = document.getElementById('careDecisionZone');
      const executeButton = document.getElementById('careExecuteButton');
      const feedback = document.getElementById('careFeedback');
      const statusChips = document.getElementById('careStudioStatusChips');
      const timingBadge = document.getElementById('careStudioTimingBadge');
      const hintText = document.getElementById('careStudioHintText');
      const subtitle = document.getElementById('careSheetSubtitle');
      const panelTitle = document.getElementById('careActionPanelTitle');
      const panelSubtitle = document.getElementById('careActionPanelSubtitle');
      const buddySlot = careSheet.querySelector('.care-studio-buddy-slot');
      const iconFrame = (modifier) => `
        <span class="care-studio-media-frame care-studio-icon-frame care-studio-icon-frame--tab care-studio-icon-frame--${modifier}" data-care-asset-frame>
          <img src="${transparentPixel}" class="care-studio-icon-image care-studio-icon-image--tab" alt="" aria-hidden="true">
          <span class="care-studio-media-fallback care-studio-icon-fallback care-studio-icon-fallback--tab" aria-hidden="true"></span>
        </span>`;

      careSheet.classList.remove('hidden');
      careSheet.setAttribute('aria-hidden', 'false');
      subtitle.textContent = 'Pflegefenster aktiv';
      timingBadge.textContent = 'Jetzt sinnvoll';
      hintText.textContent = 'Die Wurzelzone wirkt gerade aufnahmefaehig.';
      panelTitle.textContent = 'Giess-Aktionen';
      panelSubtitle.textContent = 'Bestehende Giess-Aktionen bleiben hier verfuegbar.';
      buddySlot.innerHTML = `
        <span class="care-studio-buddy-visual">
          <span class="care-studio-media-frame care-studio-buddy-frame is-loaded" data-care-asset-frame>
            <img src="${transparentPixel}" class="care-studio-buddy-image" alt="" aria-hidden="true">
            <span class="care-studio-media-fallback care-studio-buddy-fallback" aria-hidden="true"><span class="care-studio-buddy-glyph">+</span></span>
          </span>
          <span class="care-studio-buddy-overlay care-studio-buddy-overlay--status">
            <span class="care-studio-media-frame care-studio-prop-frame care-studio-prop-frame--status is-loaded" data-care-asset-frame>
              <img src="${transparentPixel}" class="care-studio-prop-image" alt="" aria-hidden="true">
              <span class="care-studio-media-fallback care-studio-prop-fallback" aria-hidden="true"><span class="care-studio-prop-dot"></span></span>
            </span>
          </span>
          <span class="care-studio-buddy-overlay care-studio-buddy-overlay--context">
            <span class="care-studio-media-frame care-studio-prop-frame care-studio-prop-frame--context is-loaded" data-care-asset-frame>
              <img src="${transparentPixel}" class="care-studio-prop-image" alt="" aria-hidden="true">
              <span class="care-studio-media-fallback care-studio-prop-fallback" aria-hidden="true"><span class="care-studio-prop-dot"></span></span>
            </span>
          </span>
        </span>
        <span class="care-studio-buddy-label">Care Studio</span>
      `;

      statusChips.innerHTML = `
        <article class="care-studio-chip care-studio-chip--stable"><span class="care-studio-chip__label">Feuchte</span><strong class="care-studio-chip__value">64%</strong><small class="care-studio-chip__detail">Stabil</small></article>
        <article class="care-studio-chip care-studio-chip--positive"><span class="care-studio-chip__label">Versorgung</span><strong class="care-studio-chip__value">58%</strong><small class="care-studio-chip__detail">Stabil</small></article>
        <article class="care-studio-chip care-studio-chip--stable"><span class="care-studio-chip__label">Stress</span><strong class="care-studio-chip__value">18%</strong><small class="care-studio-chip__detail">Niedrig</small></article>
        <article class="care-studio-chip care-studio-chip--caution"><span class="care-studio-chip__label">Risiko</span><strong class="care-studio-chip__value">Mittel</strong><small class="care-studio-chip__detail">Mittel</small></article>
      `;

      categoryList.innerHTML = `
        <button type="button" class="care-category-tab care-category-tab-active"><span class="care-category-icon">${iconFrame('water')}</span><span class="care-category-label">Giessen</span></button>
        <button type="button" class="care-category-tab"><span class="care-category-icon">${iconFrame('feed')}</span><span class="care-category-label">Duengen</span></button>
        <button type="button" class="care-category-tab"><span class="care-category-icon">${iconFrame('routine')}</span><span class="care-category-label">Pflege</span></button>
        <button type="button" class="care-category-tab"><span class="care-category-icon">${iconFrame('diagnosis')}</span><span class="care-category-label">Diagnose</span></button>
      `;

      actionList.innerHTML = `
        <button type="button" class="care-action-card is-selected">
          <div class="care-action-icon-box"><img src="${transparentPixel}" class="care-action-card-icon" alt=""></div>
          <div class="care-action-info-box"><span class="care-action-title-row"><span class="care-action-label">Leicht giessen</span><span class="care-action-verdict care-action-verdict--positive">Empfohlen</span></span><span class="care-action-hint">Sanfte Wassergabe</span><span class="care-action-risk-line">Risiko: Niedrig</span></div>
        </button>
        <button type="button" class="care-action-card">
          <div class="care-action-icon-box"><img src="${transparentPixel}" class="care-action-card-icon" alt=""></div>
          <div class="care-action-info-box"><span class="care-action-title-row"><span class="care-action-label">Tief giessen</span><span class="care-action-verdict">Situativ</span></span><span class="care-action-hint">Mehr Volumen</span><span class="care-action-risk-line">Risiko: Mittel</span></div>
        </button>
        <button type="button" class="care-action-card">
          <div class="care-action-icon-box"><img src="${transparentPixel}" class="care-action-card-icon" alt=""></div>
          <div class="care-action-info-box"><span class="care-action-title-row"><span class="care-action-label">Naehrloesung</span><span class="care-action-verdict">Situativ</span></span><span class="care-action-hint">Gezielte Versorgung</span><span class="care-action-risk-line">Risiko: Mittel</span></div>
        </button>
        <button type="button" class="care-action-card">
          <div class="care-action-icon-box"><img src="${transparentPixel}" class="care-action-card-icon" alt=""></div>
          <div class="care-action-info-box"><span class="care-action-title-row"><span class="care-action-label">Spuelen</span><span class="care-action-verdict care-action-verdict--warning">Riskant</span></span><span class="care-action-hint">Druck senken</span><span class="care-action-risk-line">Risiko: Hoch</span></div>
        </button>
      `;

      effectsList.innerHTML = `
        <li class="care-section-label care-section-label--hints">Feuchteprofil</li>
        <li class="care-studio-insight-card">
          <div class="care-studio-water-profile">
            <div class="care-studio-soil-zone care-studio-soil-zone--surface"><span>Oberflaeche</span><strong>42%</strong></div>
            <div class="care-studio-soil-zone care-studio-soil-zone--root"><span>Wurzelzone</span><strong>68%</strong></div>
          </div>
          <div class="care-studio-water-mini-grid">
            <span class="care-studio-mini-stat"><small>Abtrocknung</small><strong>1.8/h</strong></span>
            <span class="care-studio-mini-stat"><small>Wurzelrisiko</small><strong>4%</strong></span>
            <span class="care-studio-mini-stat"><small>Trockenstress</small><strong>12%</strong></span>
          </div>
          <div class="care-studio-meta-row"><span>Naechstes Giessfenster</span><strong>Jetzt sauber moeglich</strong></div>
        </li>`;

      decisionZone.innerHTML = `
        <section class="care-studio-preview-card care-studio-decision-card care-studio-decision-card--positive">
          <div class="care-studio-decision-top">
            <span class="care-studio-media-frame care-studio-icon-frame care-studio-icon-frame--decision is-loaded" data-care-asset-frame>
              <img src="${transparentPixel}" class="care-studio-icon-image care-studio-icon-image--decision" alt="" aria-hidden="true">
              <span class="care-studio-media-fallback care-studio-icon-fallback care-studio-icon-fallback--decision" aria-hidden="true"></span>
            </span>
            <div class="care-studio-decision-title"><small>Auswahl</small><strong>Leicht giessen</strong></div>
            <span class="care-studio-verdict-badge care-studio-verdict-badge--positive">Empfohlen</span>
          </div>
          <div class="care-studio-decision-badges">
            <span class="care-studio-mini-badge"><small>Timing</small><strong>Gut</strong></span>
            <span class="care-studio-mini-badge"><small>Nutzen</small><strong>Mittel</strong></span>
            <span class="care-studio-mini-badge care-studio-mini-badge--risk"><small>Risiko</small><strong>Niedrig</strong></span>
          </div>
          <div class="care-studio-delta-strip">
            <span class="care-studio-delta-chip care-studio-delta-chip--positive"><strong>+12</strong><span>Feuchte</span></span>
            <span class="care-studio-delta-chip care-studio-delta-chip--positive"><strong>-6</strong><span>Trockenstress</span></span>
            <span class="care-studio-delta-chip"><strong>+1</strong><span>Wurzelrisiko</span></span>
          </div>
          <p class="care-studio-preview-buddy care-studio-decision-buddy">Das Timing wirkt sauber.</p>
        </section>
        <section class="care-studio-feedback-card care-studio-aftercare-card care-studio-feedback-card--good">
          <div class="care-studio-aftercare-head"><span class="care-studio-media-frame care-studio-icon-frame care-studio-icon-frame--decision is-loaded" data-care-asset-frame><img src="${transparentPixel}" class="care-studio-icon-image care-studio-icon-image--decision" alt="" aria-hidden="true"><span class="care-studio-media-fallback care-studio-icon-fallback care-studio-icon-fallback--decision" aria-hidden="true"></span></span><div><small>Note</small><strong>Gut</strong></div><span>Abtrocknung beobachten</span></div>
          <p class="care-studio-preview-buddy">Die Pflanze sollte ruhiger reagieren.</p>
        </section>
        <section class="care-hint-item care-hint-item--caution">
          <div class="care-hint-head"><span class="care-hint-marker" aria-hidden="true"></span></div>
          <strong class="care-hint-headline">Mehr Wasser beruhigt die Zone, aber nur mit sauberem Timing.</strong>
          <p class="care-hint-message">Die obere Schicht ist trockener als der Bereich an den Wurzeln.</p>
        </section>
        <section class="care-action-outcome-card">
          <div class="care-action-outcome-head">Auswirkungen</div>
          <div class="care-action-outcome-list">
            <div class="care-effect-row"><span>Feuchtigkeit</span><strong>+12</strong></div>
            <div class="care-effect-row"><span>Naehrstoffe</span><strong>+0</strong></div>
            <div class="care-effect-row"><span>Stress</span><strong>+1</strong></div>
            <div class="care-effect-row"><span>Risiko</span><strong>+2</strong></div>
          </div>
        </section>`;

      executeButton.disabled = false;
      executeButton.textContent = 'Aktion ausfuehren';
      feedback.textContent = 'Bereit zur Ausfuehrung';
    });

    const careUiState = await page.evaluate(() => {
      const careSheet = document.getElementById('careSheet');
      const sheetContent = document.querySelector('#careSheet .sheet-content');
      const categoryList = document.getElementById('careCategoryList');
      const actionList = document.getElementById('careActionList');
      const effectsList = document.getElementById('careEffectsList');
      const decisionZone = document.getElementById('careDecisionZone');
      const statusChips = document.getElementById('careStudioStatusChips');
      const profileCard = effectsList.querySelector('.care-studio-insight-card');
      const profileHeader = effectsList.querySelector('.care-section-label');
      const executeButton = document.getElementById('careExecuteButton');

      const text = careSheet.textContent || '';
      const sheetRect = sheetContent.getBoundingClientRect();
      const executeRect = executeButton.getBoundingClientRect();
      const tabsRect = categoryList.getBoundingClientRect();
      const effectsRect = effectsList.getBoundingClientRect();
      const profileCardRect = profileCard.getBoundingClientRect();
      const profileHeaderRect = profileHeader.getBoundingClientRect();
      const actionsRect = actionList.getBoundingClientRect();
      const decisionRect = decisionZone.getBoundingClientRect();

      const actionListStyle = window.getComputedStyle(actionList);
      const sheetContentStyle = window.getComputedStyle(sheetContent);
      const effectsListStyle = window.getComputedStyle(effectsList);
      const decisionZoneStyle = window.getComputedStyle(decisionZone);
      const chipLabelMetrics = Array.from(statusChips.querySelectorAll('.care-studio-chip__label')).map((node) => {
        const style = window.getComputedStyle(node);
        return {
          text: node.textContent || '',
          clientWidth: node.clientWidth,
          scrollWidth: node.scrollWidth,
          clientHeight: node.clientHeight,
          scrollHeight: node.scrollHeight,
          lineHeight: Number.parseFloat(style.lineHeight) || 0
        };
      });

      return {
        text,
        sheetOverflowY: sheetContentStyle.overflowY,
        categoryTabCount: categoryList.children.length,
        tabIconCount: categoryList.querySelectorAll('.care-studio-icon-image--tab').length,
        statusChipCount: statusChips.children.length,
        statusChipOverflowX: statusChips.scrollWidth > statusChips.clientWidth + 1,
        chipLabelMetrics,
        buddyImageCount: careSheet.querySelectorAll('.care-studio-buddy-image').length,
        buddyOverlayCount: careSheet.querySelectorAll('.care-studio-buddy-overlay').length,
        actionListOverflowY: actionListStyle.overflowY,
        actionListPaddingRight: actionListStyle.paddingRight,
        actionListScrollbarGutter: actionListStyle.scrollbarGutter || '',
        actionListHeight: actionList.getBoundingClientRect().height,
        effectsListOverflowY: effectsListStyle.overflowY,
        effectsListHeight: effectsList.getBoundingClientRect().height,
        effectsListChildCount: effectsList.children.length,
        profileCardHeight: profileCardRect.height,
        decisionZoneOverflowY: decisionZoneStyle.overflowY,
        decisionZoneChildCount: decisionZone.children.length,
        deltaChipCount: document.querySelectorAll('#careDecisionZone .care-studio-delta-chip').length,
        decisionCardCount: document.querySelectorAll('#careDecisionZone .care-studio-decision-card').length,
        aftercareCardCount: document.querySelectorAll('#careDecisionZone .care-studio-aftercare-card').length,
        decorativeAltEmpty: Array.from(careSheet.querySelectorAll('.care-studio-buddy-image, .care-studio-icon-image, .care-studio-prop-image')).every((img) => img.getAttribute('alt') === ''),
        executeReachable: executeRect.bottom <= sheetRect.bottom + 1,
        executeOffsetTop: executeButton.offsetTop,
        sheetClientHeight: sheetContent.clientHeight,
        sheetScrollHeight: sheetContent.scrollHeight,
        tabsAboveEffects: tabsRect.bottom <= effectsRect.top + 1,
        effectsAboveActions: effectsRect.bottom <= actionsRect.top + 12,
        profileAboveActions: profileCardRect.bottom <= actionsRect.top - 8,
        profileHeaderClearOfActions: profileHeaderRect.bottom <= actionsRect.top - 8,
        actionsAboveDecision: actionsRect.bottom <= decisionRect.top + 12,
        needsScroll: sheetContent.scrollHeight > sheetContent.clientHeight + 1,
        hasHorizontalOverflow: careSheet.scrollWidth > careSheet.clientWidth + 1,
        profileTextVisible: /Abtrocknung|Dryback|Wurzelzone|Oberflaeche/.test(effectsList.textContent || '')
      };
    });

    assert.ok(!/\uFFFD/.test(careUiState.text), 'care sheet should not contain replacement characters');
    assert.strictEqual(careUiState.sheetOverflowY, 'auto', 'care sheet content should own the main scrolling');
    assert.strictEqual(careUiState.categoryTabCount, 4, 'care studio should expose four top tabs');
    assert.strictEqual(careUiState.tabIconCount, 4, 'care studio should render four asset-backed tab icons');
    assert.strictEqual(careUiState.statusChipCount, 4, 'care studio should keep four compact status chips');
    assert.ok(careUiState.buddyImageCount >= 1, 'care studio should render the locked buddy image');
    assert.ok(careUiState.buddyOverlayCount >= 1, 'care studio should render buddy prop overlays');
    assert.strictEqual(careUiState.statusChipOverflowX, false, 'status chips should not introduce horizontal overflow');
    assert.ok(careUiState.chipLabelMetrics.every((entry) => entry.lineHeight <= 0 || entry.scrollHeight <= entry.lineHeight * 1.5), 'status chip labels should stay on a single visible line');
    assert.strictEqual(careUiState.decorativeAltEmpty, true, 'decorative care studio assets should keep empty alt text');
    assert.strictEqual(careUiState.actionListOverflowY, 'auto', 'care action list should stay internally scrollable');
    assert.ok(parseFloat(careUiState.actionListPaddingRight) >= 10, 'care action list should reserve space next to the scrollbar');
    assert.ok(/stable/i.test(careUiState.actionListScrollbarGutter), 'care action list should reserve a stable scrollbar gutter');
    assert.ok(careUiState.actionListHeight >= 90, 'care action list should keep enough visible height to show multiple actions');
    assert.strictEqual(careUiState.effectsListOverflowY, 'visible', 'care studio profile block should stay in normal flow');
    assert.ok(careUiState.effectsListChildCount >= 2, 'care studio should render the active tab content');
    assert.ok(careUiState.profileCardHeight >= 90, 'moisture profile should keep a readable minimum height');
    assert.strictEqual(careUiState.decisionZoneOverflowY, 'visible', 'decision zone should stay in normal flow');
    assert.ok(careUiState.decisionZoneChildCount >= 3, 'decision zone should render decision, aftercare, and action outcome');
    assert.ok(careUiState.decisionCardCount >= 1, 'care studio should render a decision card');
    assert.ok(careUiState.deltaChipCount >= 2, 'care studio should render delta chips');
    assert.ok(careUiState.aftercareCardCount >= 1, 'care studio should keep aftercare visible');
    assert.ok(careUiState.effectsListHeight >= 60, 'care studio tab content should stay visible on mobile');
    assert.ok(careUiState.tabsAboveEffects, 'tabs should remain above the lower care content');
    assert.ok(!careUiState.effectsAboveActions, 'action list should surface before the lower tab content on mobile');
    assert.ok(!careUiState.profileAboveActions, 'moisture profile should move below the action list on mobile');
    assert.ok(!careUiState.profileHeaderClearOfActions, 'profile header should no longer reserve space above the action headers');
    assert.ok(careUiState.actionsAboveDecision, 'action list should stay above the decision zone');
    assert.ok(careUiState.profileTextVisible, 'moisture profile copy should remain visible');
    assert.ok(/Feuchteprofil/.test(careUiState.text), 'care studio should visibly include the moisture profile section');
    assert.ok(/Auswirkungen/.test(careUiState.text), 'care detail should visibly include the effects section');
    assert.ok(!/Warnung|Vorsicht|Empfehlung/.test(careUiState.text), 'care hints should no longer show visible severity words');
    assert.strictEqual(careUiState.hasHorizontalOverflow, false, 'care sheet should not introduce horizontal overflow');

    if (!careUiState.executeReachable) {
      await page.evaluate(() => {
        const sheetContent = document.querySelector('#careSheet .sheet-content');
        sheetContent.scrollTop = sheetContent.scrollHeight;
      });
      const executeAfterScroll = await page.evaluate(() => {
        const sheetContent = document.querySelector('#careSheet .sheet-content');
        const executeButton = document.getElementById('careExecuteButton');
        const sheetRect = sheetContent.getBoundingClientRect();
        const executeRect = executeButton.getBoundingClientRect();
        return {
          visibleAfterScroll: executeRect.bottom <= sheetRect.bottom + 1,
          canScrollToBottom: sheetContent.scrollHeight > sheetContent.clientHeight + 1,
          scrollTop: sheetContent.scrollTop
        };
      });
      assert.ok(executeAfterScroll.canScrollToBottom, 'care sheet should use main scrolling when content exceeds mobile height');
      assert.ok(executeAfterScroll.visibleAfterScroll, 'care execute button should remain reachable after scrolling the sheet');
    }
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
