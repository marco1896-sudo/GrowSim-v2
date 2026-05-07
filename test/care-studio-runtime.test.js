#!/usr/bin/env node
'use strict';

const assert = require('assert');
const path = require('path');
const { chromium } = require('playwright');
const { installAuthHarness, waitForBoot } = require('./support/browserRuntime');
const { startStaticServer, closeBrowser, closeServer } = require('./support/serverRuntime');

const ROOT = path.resolve(__dirname, '..');
const HOST = '127.0.0.1';
let PORT = 0;
const AUTH_TOKEN_KEY = 'grow-sim-auth-token-v1';

async function main() {
  const { server, port: resolvedPort } = await startStaticServer(ROOT, HOST);
  PORT = Number(resolvedPort || 0);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });

  try {
    await installAuthHarness(page, AUTH_TOKEN_KEY, {
      id: 'care-studio-user',
      email: 'care-studio@test.local',
      displayName: 'Care Studio Test'
    });
    await page.goto(`http://${HOST}:${PORT}/`, { waitUntil: 'domcontentloaded' });
    await waitForBoot(page, 30000);

    await page.evaluate(() => window.onStartRun());
    await page.waitForFunction(() => window.__gsState && window.__gsState.run && window.__gsState.run.status === 'active');

    const result = await page.evaluate(async () => {
      window.__gsState.care = window.__gsState.care || {};
      window.__gsState.care.summary = null;
      window.__gsState.ui.openSheet = 'care';
      window.__gsState.ui.care = window.__gsState.ui.care || {};
      window.__gsState.ui.care.selectedStudioTab = 'water';
      window.__gsState.ui.care.selectedCategory = 'watering';
      window.__gsState.ui.care.selectedActionId = null;
      window.renderCareSheet(true);
      const collectActionTexts = () => Array.from(document.querySelectorAll('#careActionList .care-action-label, #careActionList .care-action-compact-label'))
        .map((node) => String(node.textContent || '').trim())
        .filter(Boolean);
      const waterMethodLabels = collectActionTexts();
      window.__gsState.ui.care.selectedActionId = 'water_moisten_surface';
      window.renderCareSheet(true);
      const waitForCareImages = () => new Promise((resolve) => {
        let attempts = 0;
        const tick = () => {
          const careImages = Array.from(document.querySelectorAll('#careSheet [data-care-asset-frame] img'));
          if (!careImages.length || careImages.every((img) => img.complete)) {
            resolve();
            return;
          }
          attempts += 1;
          if (attempts >= 20) {
            resolve();
            return;
          }
          window.setTimeout(tick, 50);
        };
        tick();
      });
      await waitForCareImages();
      const previewText = String(document.getElementById('careDecisionZone')?.textContent || '');
      const previewDeltaChipCount = document.querySelectorAll('#careDecisionZone .care-studio-delta-chip').length;
      const previewDecisionCardCount = document.querySelectorAll('#careDecisionZone .care-studio-decision-card').length;

      const beforeWater = Number(window.__gsState.status.water || 0);
      window.onCareExecuteAction();
      await waitForCareImages();
      const afterWater = Number(window.__gsState.status.water || 0);
      const afterDecisionText = String(document.getElementById('careDecisionZone')?.textContent || '');
      const aftercareCardCount = document.querySelectorAll('#careDecisionZone .care-studio-aftercare-card').length;
      const directWaterMethodCooldownSet = Number(window.__gsState.actions?.cooldowns?.water_moisten_surface || 0) > 0;
      const directWaterMethodId = String(window.__gsState.actions?.lastResult?.careMethodId || '');
      const directWaterHistoryMatch = Array.isArray(window.__gsState.history?.actions)
        ? window.__gsState.history.actions.some((entry) => String(entry?.label || '').trim() === 'Oberfläche befeuchten')
        : false;
      const buddyImage = document.querySelector('#careSheet .care-studio-buddy-image');
      const tabIconFrames = Array.from(document.querySelectorAll('#careCategoryList .care-studio-icon-frame--tab'));
      const decisionFrames = Array.from(document.querySelectorAll('#careDecisionZone .care-studio-icon-frame--decision'));
      const decorativeImages = Array.from(document.querySelectorAll('#careSheet .care-studio-buddy-image, #careSheet .care-studio-icon-image, #careSheet .care-studio-prop-image, #careSheet .care-studio-legacy-icon'));
      const propOverlayCount = document.querySelectorAll('#careSheet .care-studio-buddy-overlay').length;

      window.__gsState.ui.care.selectedStudioTab = 'feed';
      window.__gsState.ui.care.selectedActionId = null;
      window.renderCareSheet(true);
      await waitForCareImages();
      const feedMethodLabels = collectActionTexts();

      window.__gsState.ui.care.selectedStudioTab = 'routine';
      window.__gsState.ui.care.selectedActionId = null;
      window.renderCareSheet(true);
      await waitForCareImages();
      const routineMethodLabels = collectActionTexts();
      const routineInsightText = String(document.getElementById('careEffectsList')?.textContent || '');
      const routinePanelTitle = String(document.getElementById('careActionPanelTitle')?.textContent || '').trim();
      const routinePanelSubtitle = String(document.getElementById('careActionPanelSubtitle')?.textContent || '').trim();

      const beforeDirectHistory = Array.isArray(window.__gsState.history?.systemLog) ? window.__gsState.history.systemLog.length : 0;
      window.__gsState.ui.care.selectedStudioTab = 'routine';
      window.__gsState.ui.care.selectedActionId = 'routine_gentle_stress_check';
      window.renderCareSheet(true);
      window.onCareExecuteAction();
      await waitForCareImages();
      const afterDirectHistory = Array.isArray(window.__gsState.history?.systemLog) ? window.__gsState.history.systemLog.length : 0;
      const directMethodCooldownSet = Number(window.__gsState.actions?.cooldowns?.routine_gentle_stress_check || 0) > 0;
      const directMethodLastActionId = String(window.__gsState.care?.feedback?.lastActionId || '');
      const directTrendSnapshotAt = Number(window.__gsState.care?.trends?.lastSnapshotAtSimMs || 0);

      window.__gsState.ui.care.selectedStudioTab = 'diagnosis';
      window.renderCareSheet(true);
      await waitForCareImages();
      const diagnosisText = String(document.getElementById('careEffectsList')?.textContent || '');

      return {
        tabCount: document.querySelectorAll('#careCategoryList .care-category-tab').length,
        deltaChipCount: previewDeltaChipCount,
        decisionCardCount: previewDecisionCardCount,
        subtitle: String(document.getElementById('careSheetSubtitle')?.textContent || '').trim(),
        hint: String(document.getElementById('careStudioHintText')?.textContent || '').trim(),
        actionPanelTitle: String(document.getElementById('careActionPanelTitle')?.textContent || '').trim(),
        effectsChildren: document.getElementById('careEffectsList')?.children.length || 0,
        decisionZoneChildren: document.getElementById('careDecisionZone')?.children.length || 0,
        previewText,
        afterText: afterDecisionText,
        aftercareCardCount,
        executeDisabled: Boolean(document.getElementById('careExecuteButton')?.disabled),
        feedback: String(document.getElementById('careFeedback')?.textContent || '').trim(),
        waterChanged: afterWater !== beforeWater,
        waterMethodLabels,
        feedMethodLabels,
        routineMethodLabels,
        routineInsightText,
        routinePanelTitle,
        routinePanelSubtitle,
        directWaterMethodCooldownSet,
        directWaterMethodId,
        directWaterHistoryMatch,
        directMethodCooldownSet,
        directMethodHistoryChanged: afterDirectHistory > beforeDirectHistory,
        directMethodLastActionId,
        directTrendSnapshotAt,
        careGrade: String(window.__gsState.care?.feedback?.lastCareGrade || ''),
        careMessageKey: String(window.__gsState.care?.feedback?.lastCareMessageKey || ''),
        careEffectsCount: Array.isArray(window.__gsState.care?.feedback?.lastEffects) ? window.__gsState.care.feedback.lastEffects.length : 0,
        buddyImageLoaded: Boolean(buddyImage && buddyImage.complete && buddyImage.naturalWidth > 0),
        buddyFallbackCount: document.querySelectorAll('#careSheet .care-studio-buddy-fallback').length,
        propOverlayCount,
        tabIconLoadedCount: tabIconFrames.filter((frame) => {
          const primary = frame.querySelector('.care-studio-icon-image--tab');
          const fallback = frame.querySelector('.care-studio-legacy-icon');
          return Boolean((primary && primary.complete && primary.naturalWidth > 0) || (fallback && fallback.complete && fallback.naturalWidth > 0));
        }).length,
        tabIconImageCount: tabIconFrames.length,
        decisionIconLoadedCount: decisionFrames.filter((frame) => {
          const primary = frame.querySelector('.care-studio-icon-image--decision');
          const fallback = frame.querySelector('.care-studio-legacy-icon--decision');
          return Boolean((primary && primary.complete && primary.naturalWidth > 0) || (fallback && fallback.complete && fallback.naturalWidth > 0));
        }).length,
        decisionIconImageCount: decisionFrames.length,
        decorativeAltEmpty: decorativeImages.every((img) => img.getAttribute('alt') === ''),
        diagnosisText
      };
    });

    assert.strictEqual(result.tabCount, 4, 'care studio should render four top tabs at runtime');
    assert.ok(result.subtitle.length > 0, 'care studio should render a subtitle');
    assert.ok(result.hint.length > 0, 'care studio should render a buddy hint');
    assert.ok(result.actionPanelTitle.length > 0, 'care studio should render an action panel title');
    assert.ok(result.effectsChildren >= 2, 'care studio should render insight content');
    assert.ok(result.decisionZoneChildren >= 1, 'care studio should render a separate decision zone');
    assert.ok(result.decisionCardCount >= 1, 'care studio should render a decision card for the selected action');
    assert.ok(result.deltaChipCount >= 1, 'care studio should render delta chips for the selected action');
    assert.ok(/Decision|Auswahl|Selection|Delta|Feuchte|Moisture/.test(result.previewText), 'care studio should render a decision forecast for the selected action');
    assert.ok(result.aftercareCardCount >= 1, 'care studio should render stored after-action feedback');
    assert.ok(result.feedback.length > 0, 'care studio should keep feedback visible after execution');
    assert.strictEqual(result.waterChanged, true, 'existing care actions should remain executable');
    assert.ok(result.waterMethodLabels.includes('Topfgewicht pr\u00FCfen'), 'water tab should expose the new care methods');
    assert.ok(result.waterMethodLabels.includes('Oberfl\u00E4che befeuchten'), 'water tab should replace the legacy water labels');
    assert.ok(!result.waterMethodLabels.some((label) => /Klarwasser|Nährlösung gießen/.test(label)), 'water tab should not expose the old legacy water labels');
    assert.ok(result.feedMethodLabels.includes('Leichte Basisversorgung'), 'feed tab should expose the new feed methods');
    assert.ok(!result.feedMethodLabels.some((label) => /Fütterung|CalMag/.test(label)), 'feed tab should not expose the old legacy feed labels');
    assert.ok(result.routineMethodLabels.includes('Bl\u00E4tter pr\u00FCfen'), 'routine tab should expose the new routine methods');
    assert.ok(!/careStudio\.routine\.note\.|careMethod\./.test(result.routineInsightText), 'routine tab should not leak raw i18n keys');
    assert.ok(!/careStudio\.|careMethod\./.test(result.diagnosisText), 'diagnosis tab should not leak raw i18n keys');
    assert.strictEqual(result.routinePanelTitle, 'Pflege-Methoden', 'routine panel should use care-method language');
    assert.ok(/Sanfte Routinen/.test(result.routinePanelSubtitle), 'routine panel subtitle should use the new care-method copy');
    assert.ok(result.directWaterMethodCooldownSet, 'executing a direct watering care method should set a method cooldown');
    assert.strictEqual(result.directWaterMethodId, 'water_moisten_surface', 'direct watering method should persist its method id');
    assert.ok(result.directWaterHistoryMatch, 'history should use the care-method label instead of an old legacy action label');
    assert.ok(result.directMethodCooldownSet, 'executing a direct care method should set its own cooldown');
    assert.ok(result.directMethodHistoryChanged, 'executing a direct care method should write a history entry');
    assert.strictEqual(result.directMethodLastActionId, 'routine_gentle_stress_check', 'direct care method feedback should store the method id');
    assert.ok(result.directTrendSnapshotAt > 0, 'executing a care method should keep care trends updated');
    assert.ok(result.careGrade.length > 0, 'after-action feedback should persist a care grade');
    assert.ok(result.careMessageKey.length > 0, 'after-action feedback should persist a message key');
    assert.ok(result.careEffectsCount >= 1, 'after-action feedback should store at least one effect');
    assert.ok(result.buddyImageLoaded || result.buddyFallbackCount >= 1, 'care studio should render the locked buddy image or a safe fallback');
    assert.ok(result.propOverlayCount >= 1, 'care studio should render at least one contextual prop overlay');
    assert.ok(result.tabIconImageCount >= 4, 'care studio should render asset-backed tab icons or their fallbacks');
    assert.ok(result.tabIconLoadedCount >= 4, 'care studio tab icons should load cleanly');
    assert.ok(result.decisionIconImageCount >= 1, 'care studio should render a decision or aftercare icon slot');
    assert.ok(result.decisionIconLoadedCount >= 1, 'care studio decision icons should load cleanly');
    assert.strictEqual(result.decorativeAltEmpty, true, 'decorative care studio images should keep empty alt text');
    assert.ok(/Fokus|Focus|Causa|Cause|Beobachtung|Observation|Status/.test(result.diagnosisText), 'care studio diagnosis tab should render diagnosis details');
    assert.ok(/Tendenz|Trend|Tendencia/.test(result.diagnosisText), 'care studio diagnosis tab should render a trend hint');
  } finally {
    await closeBrowser(browser);
    await closeServer(server);
  }
}

main()
  .then(() => {
    console.log('care studio runtime test passed');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
