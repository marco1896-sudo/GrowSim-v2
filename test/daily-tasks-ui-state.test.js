#!/usr/bin/env node
'use strict';

const assert = require('assert');
const path = require('path');
const { chromium } = require('playwright');
const { startStaticServer, closeBrowser, closeServer } = require('./support/serverRuntime');
const {
  installAuthHarness: setupAuthHarness,
  waitForBoot: waitForBootReady,
  clearClientStorage: resetClientStorage,
  advanceOnboardingToStart
} = require('./support/browserRuntime');

const ROOT = path.resolve(__dirname, '..');
const HOST = '127.0.0.1';
const AUTH_TOKEN_KEY = 'grow-sim-auth-token-v1';

async function clearBlockingGuidanceUi(page) {
  await page.evaluate(() => {
    if (typeof getFirstRunIntroState === 'function') {
      const intro = getFirstRunIntroState(window.__gsState);
      intro.active = false;
      intro.completed = true;
      intro.dashboardFollowupShown = true;
    }
    if (window.__gsState && window.__gsState.ui) {
      window.__gsState.ui.menuDialogOpen = false;
    }
    if (typeof closeMenuDialog === 'function') {
      closeMenuDialog();
    }
    if (typeof renderFirstRunIntroOverlay === 'function') {
      renderFirstRunIntroOverlay();
    }
    if (typeof renderFirstRunDashboardFollowupOverlay === 'function') {
      renderFirstRunDashboardFollowupOverlay();
    }
    if (typeof renderGameMenu === 'function') {
      renderGameMenu();
    }
  });
}

async function startFreshRun(page, baseUrl) {
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  await waitForBootReady(page, 25000);
  await resetClientStorage(page, { preserveLocalStorageKeys: [AUTH_TOKEN_KEY] });
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  await waitForBootReady(page, 25000);
  await advanceOnboardingToStart(page);
  await page.click('#startRunBtn');
  await page.waitForFunction(() => {
    const node = document.getElementById('landing');
    return Boolean(node && node.classList.contains('hidden'));
  }, null, { timeout: 10000 });
  await clearBlockingGuidanceUi(page);
}

async function scenarioDailyUiShowsAuthoritativeStates(page) {
  const snapshot = await page.evaluate(() => {
    const nowMs = Date.now();
    const dayKey = window.__gsGetLocalDayKey(nowMs);
    window.__gsState.retention.dailyCare.dayKey = dayKey;
    window.__gsState.retention.dailyCare.tasks = [
      {
        id: 'water_once',
        taskId: 'water_once',
        type: 'water_once',
        title: 'Daily Task',
        description: 'Start with daily task',
        dayKey,
        progress: 0,
        target: 1,
        completed: false,
        claimed: false,
        rewardCoins: 25,
        claimKey: `daily:task:${dayKey}:water_once`
      },
      {
        id: 'resolve_one_event',
        taskId: 'resolve_one_event',
        type: 'resolve_one_event',
        title: 'Daily Task',
        description: 'Start with daily task',
        dayKey,
        progress: 1,
        target: 1,
        completed: true,
        claimed: false,
        completedAt: nowMs - 200,
        rewardCoins: 35,
        claimKey: `daily:task:${dayKey}:resolve_one_event`
      },
      {
        id: 'open_app_twice',
        taskId: 'open_app_twice',
        type: 'open_app_twice',
        title: 'Daily Task',
        description: 'Start with daily task',
        dayKey,
        progress: 2,
        target: 2,
        completed: true,
        claimed: true,
        completedAt: nowMs - 500,
        claimedAt: nowMs - 100,
        rewardGrantedAt: nowMs - 100,
        rewardCoins: 30,
        claimKey: `daily:task:${dayKey}:open_app_twice`
      }
    ];
    window.__gsState.retention.dailyCare.completedCount = 2;
    window.__gsState.retention.dailyCare.allCompleteClaimed = false;
    window.__gsState.retention.dailyCare.buddyCheck = {
      dayKey,
      category: 'daily_task_hint',
      textKey: 'daily.buddy.comment.daily_task_hint.1',
      primaryTaskId: 'water_once',
      secondaryTaskId: 'resolve_one_event',
      generatedAtMs: nowMs - 400
    };
    window.__gsState.retention.weekly = {
      weekKey: '2026-06-08',
      missionId: 'stable_start',
      rewardCoins: 140,
      generatedAtMs: nowMs - 800,
      completedAtMs: 0,
      claimedAtMs: 0,
      history: []
    };
    window.__gsState.retention.streak.currentCount = 3;
    window.__gsState.status.coins = 140;
    window.__gsState.retention.analytics.dailyStats = [
      { dayKey: '2026-06-08', tasksCompleted: 2, sessionCount: 1, streakContinued: 1 },
      { dayKey: '2026-06-09', tasksCompleted: 1, sessionCount: 1, streakContinued: 0 },
      { dayKey: '2026-06-10', tasksCompleted: 2, sessionCount: 1, streakContinued: 1 }
    ];
    window.__gsState.retention.coinActions = {
      buddyTip: {
        dayKey,
        category: 'focus',
        textKey: 'daily.coin_actions.tip.focus.1',
        primaryTaskId: 'water_once',
        weeklyMissionId: 'stable_start',
        purchasedAtMs: nowMs - 200
      },
      focusBoost: {
        dayKey,
        taskId: 'resolve_one_event',
        bonusCoins: 8,
        purchasedAtMs: nowMs - 150,
        claimedAtMs: 0
      },
      safeBoostCheck: {
        dayKey,
        statusKey: 'caution',
        textKey: 'daily.coin_actions.safe_boost.caution.1',
        primaryTaskId: 'water_once',
        purchasedAtMs: nowMs - 100
      },
      weeklyPush: {
        weekKey: '2026-06-08',
        bonusTasksCompleted: 1,
        purchasedAtMs: nowMs - 120
      }
    };
    window.__gsState.retention.decisionCards = {
      dayKey,
      activeCard: {
        dayKey,
        weekKey: '2026-06-08',
        cardId: 'water_low',
        primaryTaskId: 'water_once',
        generatedAtMs: nowMs - 110,
        answeredAtMs: 0,
        chosenOptionId: '',
        resultTextKey: '',
        focusTaskId: '',
        suggestedCoinActionId: ''
      },
      recentCardIds: ['stress_elevated'],
      history: []
    };
    window.__gsState.retention.streak.lastQualifiedDayKey = dayKey;
    window.__gsState.ui.openSheet = 'missions';
    if (typeof window.renderMissionsSheet === 'function') {
      window.renderMissionsSheet();
    }

    const rows = Array.from(document.querySelectorAll('#missionsDailyCareList .retention-task-row'));
    const taskRows = [];
    const claimButtons = [];
    for (const row of rows) {
      const title = String((row.querySelector('.retention-task-copy strong') || {}).textContent || '').trim();
      const description = String((row.querySelector('.retention-task-copy small') || {}).textContent || '').trim();
      const stateLabel = String((row.querySelector('.retention-task-state') || {}).textContent || '').trim();
      const claimBtn = row.querySelector('[data-retention-claim-task]');
      taskRows.push({
        title,
        description,
        stateLabel,
        rowClass: String(row.className || '')
      });
      if (claimBtn) {
        claimButtons.push(String(claimBtn.getAttribute('data-retention-claim-task') || ''));
      }
    }

    return {
      rowCount: rows.length,
      taskRows,
      claimButtons,
      streakText: String((document.querySelector('#missionsStreakBlock strong') || {}).textContent || '').trim(),
      progressText: String((document.querySelector('#missionsDailyCareProgress') || {}).textContent || '').trim(),
      buddyText: String((document.querySelector('#missionsBuddyDailyCheck') || {}).textContent || '').trim(),
      weeklyText: String((document.querySelector('#missionsWeeklyWrap') || {}).textContent || '').replace(/\s+/g, ' ').trim(),
      coinActionText: String((document.querySelector('#missionsCoinActionsWrap') || {}).textContent || '').replace(/\s+/g, ' ').trim(),
      decisionText: String((document.querySelector('#missionsDecisionCardWrap') || {}).textContent || '').replace(/\s+/g, ' ').trim(),
      decisionOptionCount: document.querySelectorAll('#missionsDecisionCardWrap [data-decision-option]').length
    };
  });

  assert(snapshot.rowCount >= 3, `expected at least 3 daily rows, got ${snapshot.rowCount}`);
  const openRow = snapshot.taskRows.find((entry) => entry.stateLabel === 'Offen');
  const claimableRow = snapshot.taskRows.find((entry) => entry.stateLabel === 'Claimbar');
  const claimedRow = snapshot.taskRows.find((entry) => entry.stateLabel === 'Abgeholt');
  assert(openRow, `expected one open row, got ${JSON.stringify(snapshot.taskRows)}`);
  assert(claimableRow, `expected one claimable row, got ${JSON.stringify(snapshot.taskRows)}`);
  assert(claimedRow, `expected one claimed row, got ${JSON.stringify(snapshot.taskRows)}`);
  assert(/retention-task-row--open/.test(openRow.rowClass), 'open task row should carry open class');
  assert(/retention-task-row--claimable/.test(claimableRow.rowClass), 'claimable task row should carry claimable class');
  assert(/retention-task-row--claimed/.test(claimedRow.rowClass), 'claimed task row should carry claimed class');
  assert(snapshot.claimButtons.includes('resolve_one_event'), 'claim button should exist for claimable task');
  assert(snapshot.taskRows.some((entry) => /Wasser|water/i.test(entry.description)), `water-oriented task description missing, got ${JSON.stringify(snapshot.taskRows)}`);
  assert(snapshot.taskRows.some((entry) => /Ereignis|event/i.test(entry.description)), `event-oriented task description missing, got ${JSON.stringify(snapshot.taskRows)}`);
  assert(snapshot.taskRows.every((entry) => String(entry.title || '').trim().toLowerCase() !== 'daily task'), `task titles should not stay generic, got ${JSON.stringify(snapshot.taskRows)}`);
  assert(snapshot.taskRows.every((entry) => {
    const safeDescription = String(entry.description || '').trim().toLowerCase();
    return safeDescription !== 'start with daily task' && safeDescription !== 'desc';
  }), `task descriptions should not stay generic, got ${JSON.stringify(snapshot.taskRows)}`);
  assert(/Tägliche Serie 3/.test(snapshot.streakText), `unexpected streak text: ${snapshot.streakText}`);
  assert(snapshot.progressText.length > 0, 'daily progress text should be present');
  assert(/Buddy:/.test(snapshot.buddyText), `missions sheet should show buddy check, got: ${snapshot.buddyText}`);
  assert(/Wasser-Check|Lage aufloesen/.test(snapshot.buddyText), `buddy check should reference current daily tasks, got: ${snapshot.buddyText}`);
  assert(/Stabiler Start|Claimbar|Belohnung/.test(snapshot.weeklyText), `missions sheet should show weekly mission content, got: ${snapshot.weeklyText}`);
  assert(/Buddy Extra-Tipp|Daily Focus Boost|Weekly Push/.test(snapshot.coinActionText), `missions sheet should show coin action rows, got: ${snapshot.coinActionText}`);
  assert(/Focus Boost aktiv|Safe Boost Check|Buddy ordnet|Nur Guidance/.test(snapshot.coinActionText), `missions sheet should show coin action effect text, got: ${snapshot.coinActionText}`);
  assert(/\+8 Bonus-Coins|ohne neue Weekly-Belohnung|Nur Guidance/.test(snapshot.coinActionText), `coin helpers should explain bonus or guidance clearly, got: ${snapshot.coinActionText}`);
  assert(/Wasser-Check|Wasserwert/.test(snapshot.decisionText), `missions sheet should show decision card copy, got: ${snapshot.decisionText}`);
  assert(/Vorsichtig gießen|Später prüfen|Buddy-Tipp lesen/.test(snapshot.decisionText), `decision card should render player-facing options, got: ${snapshot.decisionText}`);
  assert.strictEqual(snapshot.decisionOptionCount, 3, `decision card should render exactly 3 options, got ${snapshot.decisionOptionCount}`);
}

async function scenarioDecisionCardUiAnswerFlow(page) {
  await clearBlockingGuidanceUi(page);
  const before = await page.evaluate(() => {
    const nowMs = Date.now();
    const dayKey = window.__gsGetLocalDayKey(nowMs);
    window.__gsState.retention.dailyCare.dayKey = dayKey;
    window.__gsState.retention.dailyCare.tasks = [
      {
        id: 'water_recovery_round',
        taskId: 'water_recovery_round',
        type: 'water_recovery_round',
        title: 'daily.task.water_recovery_round.title',
        description: 'daily.task.water_recovery_round.description',
        dayKey,
        progress: 0,
        target: 1,
        completed: false,
        claimed: false,
        rewardCoins: 28,
        claimKey: `daily:task:${dayKey}:water_recovery_round`
      },
      {
        id: 'analysis_sheet_check',
        taskId: 'analysis_sheet_check',
        type: 'analysis_sheet_check',
        title: 'daily.task.analysis_sheet_check.title',
        description: 'daily.task.analysis_sheet_check.description',
        dayKey,
        progress: 0,
        target: 1,
        completed: false,
        claimed: false,
        rewardCoins: 20,
        claimKey: `daily:task:${dayKey}:analysis_sheet_check`
      }
    ];
    window.__gsState.retention.dailyCare.buddyCheck = {
      dayKey,
      category: 'water_focus',
      textKey: 'daily.buddy.comment.water_focus.1',
      primaryTaskId: 'water_recovery_round',
      secondaryTaskId: 'analysis_sheet_check',
      generatedAtMs: nowMs - 500
    };
    window.__gsState.retention.decisionCards = {
      dayKey,
      activeCard: {
        dayKey,
        weekKey: '2026-06-08',
        cardId: 'water_low',
        primaryTaskId: 'water_recovery_round',
        generatedAtMs: nowMs - 200,
        answeredAtMs: 0,
        chosenOptionId: '',
        resultTextKey: '',
        focusTaskId: '',
        suggestedCoinActionId: ''
      },
      recentCardIds: ['risk_focus'],
      history: []
    };
    window.__gsState.ui.openSheet = 'missions';
    if (typeof window.renderMissionsSheet === 'function') {
      window.renderMissionsSheet();
    }
    return {
      buttonCount: document.querySelectorAll('#missionsDecisionCardWrap [data-decision-option]').length
    };
  });

  assert.strictEqual(before.buttonCount, 3, 'decision card answer flow should start with 3 options');
  await page.click('#missionsDecisionCardWrap [data-decision-option="careful_water"]');

  const after = await page.evaluate(() => ({
    text: String((document.querySelector('#missionsDecisionCardWrap') || {}).textContent || '').replace(/\s+/g, ' ').trim(),
    buttonCount: document.querySelectorAll('#missionsDecisionCardWrap [data-decision-option]').length,
    activeCard: {
      chosenOptionId: String(window.__gsState.retention.decisionCards && window.__gsState.retention.decisionCards.activeCard && window.__gsState.retention.decisionCards.activeCard.chosenOptionId || ''),
      answeredAtMs: Number(window.__gsState.retention.decisionCards && window.__gsState.retention.decisionCards.activeCard && window.__gsState.retention.decisionCards.activeCard.answeredAtMs || 0),
      focusTaskId: String(window.__gsState.retention.decisionCards && window.__gsState.retention.decisionCards.activeCard && window.__gsState.retention.decisionCards.activeCard.focusTaskId || '')
    }
  }));

  assert.strictEqual(after.buttonCount, 0, 'answered decision card should no longer render answer buttons');
  assert.strictEqual(after.activeCard.chosenOptionId, 'careful_water', 'chosen option should be stored in state');
  assert(after.activeCard.answeredAtMs > 0, 'answered decision card should persist an answered timestamp');
  assert.strictEqual(after.activeCard.focusTaskId, 'water_recovery_round', 'answer should focus a safe daily task');
  assert(/Saubere Linie|Heute zuerst|Run neu|Wasser nachziehen/.test(after.text), `answered card should show clearer result/focus text, got: ${after.text}`);
}

async function scenarioHomeTeaserPremiumState(page) {
  const result = await page.evaluate(() => {
    const nowMs = Date.now();
    const dayKey = window.__gsGetLocalDayKey(nowMs);
    window.__gsState.retention.dailyCare.dayKey = dayKey;
    window.__gsState.retention.dailyCare.tasks = [
      {
        id: 'water_once',
        taskId: 'water_once',
        type: 'water_once',
        title: 'Daily Task',
        description: 'Start with daily task',
        dayKey,
        progress: 1,
        target: 1,
        completed: true,
        claimed: false,
        rewardCoins: 25,
        claimKey: `daily:task:${dayKey}:water_once`
      },
      {
        id: 'resolve_one_event',
        taskId: 'resolve_one_event',
        type: 'resolve_one_event',
        title: 'Daily Task',
        description: 'Start with daily task',
        dayKey,
        progress: 0,
        target: 1,
        completed: false,
        claimed: false,
        rewardCoins: 35,
        claimKey: `daily:task:${dayKey}:resolve_one_event`
      },
      {
        id: 'open_app_twice',
        taskId: 'open_app_twice',
        type: 'open_app_twice',
        title: 'Daily Task',
        description: 'Start with daily task',
        dayKey,
        progress: 1,
        target: 2,
        completed: false,
        claimed: false,
        rewardCoins: 30,
        claimKey: `daily:task:${dayKey}:open_app_twice`
      }
    ];
    window.__gsState.retention.dailyCare.completedCount = 1;
    window.__gsState.retention.dailyCare.allCompleteClaimed = false;
    window.__gsState.retention.dailyCare.buddyCheck = {
      dayKey,
      category: 'water_focus',
      textKey: 'daily.buddy.comment.water_focus.1',
      primaryTaskId: 'water_once',
      secondaryTaskId: 'open_app_twice',
      generatedAtMs: nowMs - 600
    };
    window.__gsState.retention.weekly = {
      weekKey: '2026-06-08',
      missionId: 'stable_start',
      rewardCoins: 140,
      generatedAtMs: nowMs - 900,
      completedAtMs: 0,
      claimedAtMs: 0,
      history: []
    };
    window.__gsState.retention.decisionCards = {
      dayKey,
      activeCard: {
        dayKey,
        weekKey: '2026-06-08',
        cardId: 'water_low',
        primaryTaskId: 'water_once',
        generatedAtMs: nowMs - 120,
        answeredAtMs: 0,
        chosenOptionId: '',
        resultTextKey: '',
        focusTaskId: '',
        suggestedCoinActionId: ''
      },
      recentCardIds: [],
      history: []
    };
    window.__gsState.retention.streak.currentCount = 4;
    window.__gsState.retention.streak.bestCount = 6;
    window.__gsState.retention.streak.lastQualifiedDayKey = dayKey;
    window.__gsState.ui.openSheet = null;
    if (typeof window.renderAll === 'function') {
      window.renderAll();
    }

    const teaserNode = document.getElementById('homeMetaRetentionTeaser');
    const cardNode = teaserNode ? teaserNode.querySelector('.home-retention-card') : null;
    const beforeOpenSheet = String(window.__gsState.ui.openSheet || '');
    if (teaserNode) {
      teaserNode.click();
    }
    const afterOpenSheet = String(window.__gsState.ui.openSheet || '');

    return {
      teaserExists: Boolean(teaserNode),
      cardExists: Boolean(cardNode),
      cardStateClass: cardNode ? String(cardNode.className || '') : '',
      teaserText: teaserNode ? String(teaserNode.textContent || '').trim() : '',
      beforeOpenSheet,
      afterOpenSheet
    };
  });

  assert.strictEqual(result.teaserExists, true, 'home retention teaser should exist');
  assert.strictEqual(result.cardExists, true, 'home teaser should render premium retention card');
  assert(/home-retention-card/.test(result.cardStateClass), 'teaser card class missing');
  assert(/claimable|in_progress|open|claimed/.test(result.cardStateClass), 'teaser card should expose retention state class');
  assert(/Heute/.test(result.teaserText), `teaser should include daily headline, got: ${result.teaserText}`);
  assert(/Wasser-Check|Wasser ist heute der wichtigste Hebel|Daily Care/.test(result.teaserText), `teaser should include the buddy daily check, got: ${result.teaserText}`);
  assert(/Tagesentscheidung ist offen|Daily Care/.test(result.teaserText), `teaser should surface a short context hint, got: ${result.teaserText}`);
  assert.strictEqual(result.beforeOpenSheet, '', 'precondition: sheet should be closed');
  assert.strictEqual(result.afterOpenSheet, 'missions', 'tapping home teaser should open missions sheet');
}

async function main() {
  const { server, baseUrl } = await startStaticServer(ROOT, HOST);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });

  try {
    await setupAuthHarness(page, AUTH_TOKEN_KEY, {
      id: 'daily-ui-user',
      email: 'daily-ui@test.local',
      displayName: 'Daily UI',
      token: 'daily-ui-token'
    });
    await startFreshRun(page, baseUrl);
    await scenarioDailyUiShowsAuthoritativeStates(page);
    await scenarioDecisionCardUiAnswerFlow(page);
    await scenarioHomeTeaserPremiumState(page);
  } finally {
    await closeBrowser(browser);
    await closeServer(server);
  }
}

main().then(() => {
  console.log('daily-tasks-ui-state.test.js passed');
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
