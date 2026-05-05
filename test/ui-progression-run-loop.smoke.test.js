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
const AUTH_TOKEN_KEY = 'grow-sim-auth-token-v1';

async function rewindOnboardingToFirstStep(page) {
  for (let index = 0; index < 6; index += 1) {
    const disabled = await page.locator('#setupBackBtn').evaluate((node) => Boolean(node.disabled));
    if (disabled) {
      return;
    }
    await page.click('#setupBackBtn');
  }
}

async function advanceOnboardingToSummary(page) {
  for (let index = 0; index < 6; index += 1) {
    const startVisible = await page.locator('#startRunBtn').evaluate((node) => (
      !node.classList.contains('hidden')
      && node.getAttribute('aria-hidden') === 'false'
    ));
    if (startVisible) {
      return;
    }
    await page.click('#setupNextBtn');
  }
  await page.waitForFunction(() => {
    const startButton = document.getElementById('startRunBtn');
    return Boolean(
      startButton
      && !startButton.classList.contains('hidden')
      && startButton.getAttribute('aria-hidden') === 'false'
    );
  }, null, { timeout: 10000 });
}

async function main() {
  const { server, port: resolvedPort } = await startStaticServer(ROOT, HOST);
  PORT = Number(resolvedPort || 0);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
  await setupAuthHarness(page, AUTH_TOKEN_KEY, {
      email: 'progress@test.local',
      displayName: 'Progress Test'
    });

  try {
    const url = `http://${CLIENT_HOST}:${PORT}/`;
    await page.goto(url, { waitUntil: 'networkidle' });
    await waitForBootReady(page);
    await resetClientStorage(page);
    await page.goto(url, { waitUntil: 'networkidle' });
    await waitForBootReady(page);

    for (const selector of [
      '[data-setup-select="setupGenetics"][data-setup-value="indica"]',
      '[data-setup-select="setupMode"][data-setup-value="outdoor"]',
      '[data-setup-select="setupMedium"][data-setup-value="coco"]',
      '[data-setup-select="setupLight"][data-setup-value="high"]'
    ]) {
      const disabled = await page.locator(selector).evaluate((node) => ({
        disabled: Boolean(node.disabled),
        ariaDisabled: node.getAttribute('aria-disabled')
      }));
      assert.strictEqual(disabled.disabled, true, `${selector} should start locked`);
      assert.strictEqual(disabled.ariaDisabled, 'true', `${selector} should expose locked state`);
    }

    const initialStrategyPreview = await page.evaluate(() => ({
      title: document.getElementById('setupStrategyTitle').textContent.trim(),
      tag: document.getElementById('setupStrategyTag').textContent.trim(),
      loadout: document.getElementById('setupStrategyLoadout').textContent.trim()
    }));
    assert.ok(initialStrategyPreview.title.length > 0, 'start flow should show a strategy title');
    assert.ok(initialStrategyPreview.tag.length > 0, 'start flow should show a strategy tag');
    assert.ok(initialStrategyPreview.loadout.length > 0, 'start flow should show a readable loadout summary');

    await advanceOnboardingToSummary(page);

    await page.click('#startRunBtn');
    await page.waitForFunction(() => window.getCanonicalRun().status === 'active');
    const runGoalHud = await page.evaluate(() => ({
      goalId: window.getCanonicalRun().goal && window.getCanonicalRun().goal.id,
      hidden: document.getElementById('homeMetaToggle').classList.contains('hidden'),
      title: document.getElementById('homeMetaGoalCompact').textContent.trim(),
      progress: document.getElementById('homeMetaGoalProgress').textContent.trim(),
      status: document.getElementById('homeMetaGoalStatus').textContent.trim(),
      level: document.getElementById('playerLevelBadge').textContent.trim(),
      xp: document.getElementById('playerXpValue').textContent.trim(),
      playerName: document.getElementById('playerNameValue').textContent.trim(),
      playerRole: document.getElementById('playerRoleValue').textContent.trim()
    }));
    assert.ok(runGoalHud.goalId, 'run start should assign a goal into run state');
    assert.strictEqual(runGoalHud.hidden, false, 'goal strip should be visible during an active run');
    assert.ok(runGoalHud.title.length > 0, 'goal strip should show a title');
    assert.ok(runGoalHud.progress.length > 0, 'goal strip should show progress text');
    assert.ok(runGoalHud.status.length > 0, 'goal strip should show status text');
    assert.ok(runGoalHud.level.length > 0, 'player card should show the current level');
    assert.ok(runGoalHud.xp.length > 0, 'player card should show XP progress');
    assert.ok(runGoalHud.playerName.length > 0, 'player card should show the player name');
    assert.ok(runGoalHud.playerRole.length > 0, 'player card should show the player role');

    await page.evaluate(() => {
      const s = window.__gsState;
      s.run.goal = { id: 'reach_flowering', sequenceIndex: 0, sequenceLength: 3 };
      s.simulation.simDay = 40;
      s.plant.phase = 'flowering';
      s.plant.stageIndex = 8;
      s.plant.averageStress = 18;
      s.status.stress = 18;
      if (typeof syncRunGoalProgress === 'function') {
        syncRunGoalProgress('tick');
      }
    });
    await page.waitForFunction(() => window.getCanonicalProfile().totalXp > 0);
    const resolvedGoalHud = await page.evaluate(() => ({
      goalId: window.getCanonicalRun().goal && window.getCanonicalRun().goal.id,
      xp: document.getElementById('playerXpValue').textContent.trim(),
      status: document.getElementById('homeMetaGoalStatus').textContent.trim(),
      totalXp: window.getCanonicalProfile().totalXp
    }));
    assert.ok(resolvedGoalHud.goalId, 'after goal resolution a next goal should still be active');
    assert.ok(resolvedGoalHud.totalXp > 0, 'goal resolution should commit xp to the profile');
    assert.ok(/\d+/.test(resolvedGoalHud.xp), 'player panel should reflect committed goal xp immediately');
    const xpBeforeRescue = resolvedGoalHud.totalXp;

    await page.evaluate(() => {
      const s = window.__gsState;
      s.status.health = 0;
      s.plant.isDead = true;
      s.plant.phase = 'dead';
      syncCanonicalStateShape();
      renderAll();
    });
    await page.waitForFunction(() => window.getCanonicalRun().status === 'downed');
    await page.waitForFunction(() => !document.getElementById('deathOverlay').classList.contains('hidden'));

    await page.click('#deathRescueBtn');
    await page.waitForFunction(() => window.getCanonicalRun().status === 'active');
    const postRescue = await page.evaluate(() => ({
      xp: window.getCanonicalProfile().totalXp,
      summary: window.getCanonicalProfile().lastRunSummary,
      deathOverlayHidden: document.getElementById('deathOverlay').classList.contains('hidden')
    }));
    assert.strictEqual(postRescue.xp, xpBeforeRescue, 'rescue must not grant additional xp');
    assert.strictEqual(postRescue.summary, null, 'rescue must not create a summary');
    assert.strictEqual(postRescue.deathOverlayHidden, true, 'death overlay should close after rescue');

    await page.evaluate(() => {
      const s = window.__gsState;
      s.status.health = 0;
      s.plant.isDead = true;
      s.plant.phase = 'dead';
      syncCanonicalStateShape();
      renderAll();
    });
    await page.click('#deathResetBtn');
    await page.waitForFunction(() => {
      const confirmBtn = document.getElementById('menuDialogConfirmBtn');
      if (!confirmBtn) return false;
      const isHiddenByClass = confirmBtn.classList.contains('hidden');
      const isVisible = window.getComputedStyle(confirmBtn).display !== 'none'
        && window.getComputedStyle(confirmBtn).visibility !== 'hidden';
      return !isHiddenByClass && isVisible;
    }, null, { timeout: 10000 });
    await page.evaluate(() => {
      const confirmBtn = document.getElementById('menuDialogConfirmBtn');
      if (confirmBtn) {
        confirmBtn.click();
      }
    });
    await page.waitForFunction(() => window.getCanonicalRun().status === 'finished');
    await page.waitForFunction(() => !document.getElementById('runSummaryOverlay').classList.contains('hidden'));

    const deathSummary = await page.evaluate(() => {
      const profile = window.getCanonicalProfile();
      const run = window.getCanonicalRun();
      return {
        totalXp: profile.totalXp,
        level: profile.level,
        summaryReason: profile.lastRunSummary && profile.lastRunSummary.endReason,
        runStatus: run.status,
        goalTitle: document.getElementById('runSummaryGoalTitle').textContent.trim(),
        goalStatus: document.getElementById('runSummaryGoalStatus').textContent.trim()
      };
    });
    assert.ok(deathSummary.totalXp > 0, 'death finalization should grant some xp');
    assert.strictEqual(deathSummary.summaryReason, 'death', 'death summary should be persisted');
    assert.strictEqual(deathSummary.runStatus, 'finished', 'death run should enter finished state before finalization');
    assert.ok(deathSummary.goalTitle.length > 0, 'summary should include the mission-light title');
    assert.ok(deathSummary.goalStatus.length > 0, 'summary should include the mission-light result');
    const summaryScrollProbe = await page.evaluate(() => {
      const overlay = document.getElementById('runSummaryOverlay');
      const card = overlay ? overlay.querySelector('.run-summary-card') : null;
      const newRunBtn = document.getElementById('runSummaryNewRunBtn');
      if (!overlay || !card) {
        return null;
      }

      const overlayScrollable = overlay.scrollHeight > overlay.clientHeight + 1;
      const cardScrollable = card.scrollHeight > card.clientHeight + 1;
      const overlayTopBefore = overlay.scrollTop;
      const cardTopBefore = card.scrollTop;
      if (overlayScrollable) {
        overlay.scrollTop = overlayTopBefore + 120;
      }
      if (cardScrollable) {
        card.scrollTop = cardTopBefore + 120;
      }
      if (overlayScrollable) {
        overlay.scrollTop = overlay.scrollHeight;
      } else if (cardScrollable) {
        card.scrollTop = card.scrollHeight;
      }
      const ctaRect = newRunBtn ? newRunBtn.getBoundingClientRect() : null;
      const ctaReachable = Boolean(
        ctaRect
        && ctaRect.top >= 0
        && ctaRect.bottom <= window.innerHeight
      );

      return {
        overlayScrollable,
        cardScrollable,
        overlayMoved: overlay.scrollTop > overlayTopBefore,
        cardMoved: card.scrollTop > cardTopBefore,
        ctaReachable
      };
    });
    assert.ok(summaryScrollProbe, 'summary scroll probe should return data');
    assert.ok(
      (summaryScrollProbe.overlayScrollable && summaryScrollProbe.overlayMoved)
      || (summaryScrollProbe.cardScrollable && summaryScrollProbe.cardMoved),
      'summary overlay must provide a working vertical scroll path on mobile viewports'
    );
    assert.strictEqual(summaryScrollProbe.ctaReachable, true, 'scrolling the summary must bring the bottom CTA into the visible viewport');

    await page.reload({ waitUntil: 'networkidle' });
    await waitForBootReady(page);
    await page.waitForFunction(() => window.getCanonicalRun().status === 'finished');
    await page.waitForFunction(() => !document.getElementById('runSummaryOverlay').classList.contains('hidden'));

    await page.locator('#runSummaryAnalyzeBtn').evaluate((node) => node.click());
    await page.waitForFunction(() => document.getElementById('dashboardSheet') && !document.getElementById('dashboardSheet').classList.contains('hidden'));
    await page.evaluate(() => {
      window.confirm = () => true;
    });
    await page.locator('#analysisResetBtn').evaluate((node) => node.click());
    await page.waitForFunction(() => document.getElementById('landing') && !document.getElementById('landing').classList.contains('hidden'));
    const preservedProfile = await page.evaluate(() => ({
      totalXp: window.getCanonicalProfile().totalXp,
      lastRunSummary: Boolean(window.getCanonicalProfile().lastRunSummary),
      runStatus: window.getCanonicalRun().status
    }));
    assert.ok(preservedProfile.totalXp > 0, 'profile xp should persist into the next run');
    assert.strictEqual(preservedProfile.lastRunSummary, true, 'last summary should persist outside the run state');
    assert.strictEqual(preservedProfile.runStatus, 'idle', 'after reset the run should return to idle');

    await page.evaluate(() => {
      const profile = window.getCanonicalProfile();
      profile.totalXp = 1500;
      profile.level = window.GrowSimProgression.getLevelForXp(profile.totalXp);
      profile.unlocks.genetics = ['hybrid', 'indica', 'sativa'];
      profile.unlocks.media = ['soil', 'coco'];
      profile.unlocks.lights = ['medium', 'high'];
      renderLanding();
      if (typeof renderSetupOptionLocks === 'function') {
        renderSetupOptionLocks();
      }
      renderAll();
    });
    await rewindOnboardingToFirstStep(page);
    await page.click('#setupNextBtn');
    await page.click('[data-setup-select="setupGenetics"][data-setup-value="sativa"]');
    await page.click('#setupNextBtn');
    await page.click('#setupNextBtn');
    await page.click('[data-setup-select="setupMedium"][data-setup-value="coco"]');
    await page.click('#setupNextBtn');
    await page.click('[data-setup-select="setupLight"][data-setup-value="high"]');
    const upgradedStrategyPreview = await page.evaluate(() => ({
      title: document.getElementById('setupStrategyTitle').textContent.trim(),
      tag: document.getElementById('setupStrategyTag').textContent.trim(),
      tone: document.getElementById('setupStrategyTag').dataset.tone
    }));
    assert.ok(/High Pressure|Fast Cycle|Reactive Feed/.test(upgradedStrategyPreview.title), 'preview should react to strategic start choices');
    assert.ok(['risky', 'fast'].includes(upgradedStrategyPreview.tone), 'upgraded strategy should expose a non-default tone');

    await advanceOnboardingToSummary(page);
    await page.click('#startRunBtn');
    await page.waitForFunction(() => window.getCanonicalRun().status === 'active');

    const harvestFinishState = await page.evaluate(async () => {
      const s = window.__gsState;
      s.profile.totalXp = 620;
      s.profile.level = window.GrowSimProgression.getLevelForXp(s.profile.totalXp);
      s.run.goal = { id: 'reach_harvest' };
      s.simulation.simDay = 84;
      s.plant.stageIndex = 11;
      s.plant.stageKey = 'stage_12';
      s.plant.phase = 'harvest';
      s.plant.lifecycle.qualityScore = 91;
      s.status.health = 92;
      s.status.stress = 12;
      s.status.risk = 8;
      await window.__gsFinalizeRun('harvest');
      return {
        statusAfterFinish: s.run.status,
        xpAfterFinish: s.profile.totalXp
      };
    });

    assert.strictEqual(harvestFinishState.statusAfterFinish, 'finished', 'auto-harvest should finish before finalization');
    await page.locator('#runSummaryFinalizeBtn').evaluate((node) => node.click());
    await page.waitForFunction(() => window.getCanonicalRun().status === 'ended');
    await page.waitForFunction(() => !document.getElementById('runSummaryOverlay').classList.contains('hidden'));

    const harvestResult = await page.evaluate(() => {
      const s = window.__gsState;
      return {
        xpAfterFinalize: s.profile.totalXp,
        level: s.profile.level,
        unlockedMedia: s.profile.unlocks.media.slice(),
        reason: s.profile.lastRunSummary && s.profile.lastRunSummary.endReason,
        goalStatus: s.profile.lastRunSummary && s.profile.lastRunSummary.goal && s.profile.lastRunSummary.goal.status,
        goalXp: s.profile.lastRunSummary && s.profile.lastRunSummary.xpBreakdown && s.profile.lastRunSummary.xpBreakdown.goal,
        buildTitle: document.getElementById('runSummaryBuild').textContent.trim(),
        feedbackText: Array.from(document.querySelectorAll('#runSummaryHighlights .run-summary-note, #runSummaryMistakes .run-summary-note, #runSummaryPositives .run-summary-note')).map((node) => node.textContent).join(' | ')
      };
    });

    assert.strictEqual(harvestResult.reason, 'harvest', 'harvest should create a harvest summary');
    assert.ok(harvestResult.xpAfterFinalize > harvestFinishState.xpAfterFinish, 'finalize should commit pending run xp after finish');
    assert.ok(harvestResult.level >= 4, 'harvest run should push the profile to at least level 4');
    assert.ok(harvestResult.unlockedMedia.includes('coco'), 'level 4 reward should unlock coco medium');
    assert.strictEqual(harvestResult.goalStatus, 'completed', 'completed goal should appear in the summary data');
    assert.ok(harvestResult.goalXp > 0, 'completed goal should grant bonus xp');
    assert.ok(harvestResult.buildTitle.length > 0 && harvestResult.buildTitle !== '-', 'summary should show the selected build');
    assert.ok(/High Output|Fast Genetics|Hardy Genetics/.test(harvestResult.feedbackText), 'summary feedback should reference the selected setup');

    await page.reload({ waitUntil: 'networkidle' });
    await waitForBootReady(page);
    await page.waitForFunction(() => window.getCanonicalRun().status === 'ended');
    await page.waitForFunction(() => !document.getElementById('runSummaryOverlay').classList.contains('hidden'));
    await page.locator('#runSummaryNewRunBtn').evaluate((node) => node.click());
    await page.waitForFunction(() => document.getElementById('landing') && !document.getElementById('landing').classList.contains('hidden'));
    const unlockedStartOptions = await page.evaluate(() => ({
      cocoDisabled: document.querySelector('[data-setup-select="setupMedium"][data-setup-value="coco"]').disabled,
      highDisabled: document.querySelector('[data-setup-select="setupLight"][data-setup-value="high"]').disabled
    }));

    assert.strictEqual(unlockedStartOptions.cocoDisabled, false, 'level 4 unlock should be selectable on the next run');
    assert.strictEqual(unlockedStartOptions.highDisabled, false, 'level 6 unlock should be selectable after enough profile progress');
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
    await closeServer(server);
  }
}

main()
  .then(() => {
    console.log('ui-progression-run-loop smoke test passed');
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });


