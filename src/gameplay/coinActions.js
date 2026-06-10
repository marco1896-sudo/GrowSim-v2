'use strict';

(function attachGrowSimCoinActions(globalScope) {
  function normalizePhase(rawPhase) {
    const selectionApi = globalScope.GrowSimDailyCareSelection;
    if (selectionApi && typeof selectionApi.normalizePhase === 'function') {
      return selectionApi.normalizePhase(rawPhase);
    }
    const safePhase = String(rawPhase || '').trim().toLowerCase();
    if (!safePhase) return 'seedling';
    if (safePhase === 'seedling' || safePhase === 'germination') return 'seedling';
    if (safePhase === 'vegetative' || safePhase === 'veg' || safePhase === 'pre_flower' || safePhase === 'stretch') return 'vegetative';
    if (safePhase === 'flower' || safePhase === 'flowering' || safePhase === 'late_flower' || safePhase === 'early_flower') return 'flowering';
    if (safePhase === 'harvest' || safePhase === 'ripening' || safePhase === 'harvest_ready') return 'harvest';
    return safePhase;
  }

  function clampNumber(value, min, max, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }
    return Math.min(max, Math.max(min, parsed));
  }

  function hashString(value) {
    const safeValue = String(value || '');
    let hash = 0;
    for (let index = 0; index < safeValue.length; index += 1) {
      hash = ((hash << 5) - hash) + safeValue.charCodeAt(index);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function toTaskId(task) {
    if (!task || typeof task !== 'object') return '';
    return String(task.taskId || task.id || task.type || task.trigger || '').trim();
  }

  function isTaskClaimed(task) {
    return Boolean(task && (task.claimed || task.rewardGrantedAt));
  }

  function isTaskCompleted(task) {
    if (!task || typeof task !== 'object') return false;
    const target = Math.max(1, Math.trunc(Number(task.target || task.targetValue) || 1));
    const progress = Math.max(0, Math.trunc(Number(task.progress || task.progressValue) || 0));
    return Boolean(task.completed) || progress >= target;
  }

  function isBoostSafe(context) {
    return !context.hasActiveEvent
      && context.machineState !== 'resolving'
      && context.risk <= 24
      && context.stress <= 26
      && context.water >= 62
      && context.nutrition >= 58
      && context.health >= 70;
  }

  function isBoostUnsafe(context) {
    return context.hasActiveEvent
      || context.machineState === 'resolving'
      || context.risk >= 45
      || context.stress >= 42
      || context.water <= 52
      || context.nutrition <= 52
      || context.health <= 54;
  }

  function createCatalog() {
    return [
      {
        id: 'buddy_extra_tip',
        cost: 18,
        kind: 'tip'
      },
      {
        id: 'daily_focus_boost',
        cost: 24,
        kind: 'daily',
        bonusCoins: 8
      },
      {
        id: 'weekly_push',
        cost: 28,
        kind: 'weekly',
        bonusTasksCompleted: 1
      },
      {
        id: 'safe_boost_check',
        cost: 8,
        kind: 'tip'
      },
      {
        id: 'recovery_snack',
        cost: 20,
        kind: 'disabled'
      }
    ];
  }

  function buildContext(snapshot, options) {
    const safeState = snapshot && typeof snapshot === 'object' ? snapshot : {};
    const safeOptions = options && typeof options === 'object' ? options : {};
    const retention = safeState.retention && typeof safeState.retention === 'object' ? safeState.retention : {};
    const dailyCare = retention.dailyCare && typeof retention.dailyCare === 'object' ? retention.dailyCare : {};
    const weekly = retention.weekly && typeof retention.weekly === 'object' ? retention.weekly : {};
    const coinActions = retention.coinActions && typeof retention.coinActions === 'object' ? retention.coinActions : {};
    const focusBoost = coinActions.focusBoost && typeof coinActions.focusBoost === 'object' ? coinActions.focusBoost : {};
    const buddyTip = coinActions.buddyTip && typeof coinActions.buddyTip === 'object' ? coinActions.buddyTip : {};
    const safeBoostCheck = coinActions.safeBoostCheck && typeof coinActions.safeBoostCheck === 'object' ? coinActions.safeBoostCheck : {};
    const weeklyPush = coinActions.weeklyPush && typeof coinActions.weeklyPush === 'object' ? coinActions.weeklyPush : {};
    const status = safeState.status && typeof safeState.status === 'object' ? safeState.status : {};
    const events = safeState.events && typeof safeState.events === 'object' ? safeState.events : {};
    const plant = safeState.plant && typeof safeState.plant === 'object' ? safeState.plant : {};
    const simulation = safeState.simulation && typeof safeState.simulation === 'object' ? safeState.simulation : {};
    const dayKey = String(safeOptions.dayKey || dailyCare.dayKey || '').trim();
    const weekKey = String(safeOptions.weekKey || weekly.weekKey || '').trim();
    const tasks = Array.isArray(dailyCare.tasks) ? dailyCare.tasks : [];
    const openTasks = tasks.filter((task) => !isTaskClaimed(task));
    const activeTasks = openTasks.filter((task) => !isTaskCompleted(task));
    const taskIds = tasks.map((task) => toTaskId(task)).filter(Boolean);
    const primaryTaskId = String(
      safeOptions.primaryTaskId
      || (dailyCare.buddyCheck && dailyCare.buddyCheck.primaryTaskId)
      || toTaskId(activeTasks[0])
      || toTaskId(openTasks[0])
      || ''
    ).trim();
    const primaryTask = openTasks.find((task) => toTaskId(task) === primaryTaskId)
      || tasks.find((task) => toTaskId(task) === primaryTaskId)
      || activeTasks[0]
      || openTasks[0]
      || null;
    const weeklyMissionId = String(weekly.missionId || '').trim();
    const weeklyClaimed = Number(weekly.claimedAtMs || 0) > 0;
    const weeklyCompleted = Number(weekly.completedAtMs || 0) > 0;
    return {
      dayKey,
      weekKey,
      simDay: Math.max(0, Math.trunc(Number(simulation.simDay) || 0)),
      phase: normalizePhase(plant.phase),
      water: clampNumber(status.water, 0, 100, 50),
      nutrition: clampNumber(status.nutrition, 0, 100, 50),
      stress: clampNumber(status.stress, 0, 100, 0),
      risk: clampNumber(status.risk, 0, 100, 0),
      health: clampNumber(status.health, 0, 100, 75),
      machineState: String(events.machineState || 'idle'),
      hasActiveEvent: String(events.machineState || '') === 'activeEvent',
      tasks,
      openTasks,
      activeTasks,
      primaryTaskId: toTaskId(primaryTask),
      weeklyMissionId,
      weeklyClaimed,
      weeklyCompleted,
      buddyCategory: String(dailyCare.buddyCheck && dailyCare.buddyCheck.category || '').trim(),
      hasTimeTask: taskIds.some((taskId) => [
        'open_app_twice',
        'stable_climate_window',
        'ripening_final_round'
      ].includes(taskId)),
      purchasedToday: {
        buddyTip: String(buddyTip.dayKey || '').trim() === dayKey && Number(buddyTip.purchasedAtMs || 0) > 0,
        safeBoostCheck: String(safeBoostCheck.dayKey || '').trim() === dayKey && Number(safeBoostCheck.purchasedAtMs || 0) > 0,
        focusBoost: String(focusBoost.dayKey || '').trim() === dayKey && Number(focusBoost.purchasedAtMs || 0) > 0
      },
      purchasedThisWeek: {
        weeklyPush: String(weeklyPush.weekKey || '').trim() === weekKey && Number(weeklyPush.purchasedAtMs || 0) > 0
      },
      focusBoost,
      buddyTip,
      safeBoostCheck,
      weeklyPush
    };
  }

  function pickBuddyExtraTipCategory(context) {
    if (context.risk >= 58 || context.hasActiveEvent) return 'risk';
    if (context.stress >= 48) return 'stress';
    if (context.water <= 56) return 'water';
    if (context.nutrition <= 56) return 'nutrition';
    if (context.weeklyMissionId) return 'weekly';
    if (context.primaryTaskId) return 'focus';
    return 'fallback';
  }

  function buildBuddyExtraTip(snapshot, options) {
    const context = buildContext(snapshot, options);
    const category = pickBuddyExtraTipCategory(context);
    const variant = (hashString([
      context.dayKey,
      context.weekKey,
      category,
      context.phase,
      context.primaryTaskId
    ].join(':')) % 2) + 1;
    return {
      dayKey: context.dayKey,
      category,
      textKey: `daily.coin_actions.tip.${category}.${variant}`,
      primaryTaskId: context.primaryTaskId,
      weeklyMissionId: context.weeklyMissionId
    };
  }

  function buildSafeBoostCheck(snapshot, options) {
    const context = buildContext(snapshot, options);
    const statusKey = isBoostUnsafe(context)
      ? 'unsafe'
      : (isBoostSafe(context) ? 'safe' : 'caution');
    const variant = (hashString([
      context.dayKey,
      statusKey,
      context.phase,
      context.primaryTaskId
    ].join(':')) % 2) + 1;
    return {
      dayKey: context.dayKey,
      statusKey,
      textKey: `daily.coin_actions.safe_boost.${statusKey}.${variant}`,
      primaryTaskId: context.primaryTaskId
    };
  }

  function buildActionCatalog(snapshot, options) {
    const context = buildContext(snapshot, options);
    return createCatalog().map((entry) => {
      if (entry.id === 'buddy_extra_tip') {
        return {
          ...entry,
          available: context.openTasks.length > 0 && !context.purchasedToday.buddyTip,
          stateKey: context.purchasedToday.buddyTip ? 'used' : (context.openTasks.length > 0 ? 'available' : 'locked'),
          taskId: context.primaryTaskId
        };
      }
      if (entry.id === 'daily_focus_boost') {
        return {
          ...entry,
          available: Boolean(context.primaryTaskId) && !context.purchasedToday.focusBoost,
          stateKey: context.purchasedToday.focusBoost
            ? (Number(context.focusBoost.claimedAtMs || 0) > 0 ? 'used' : 'active')
            : (context.primaryTaskId ? 'available' : 'locked'),
          taskId: context.purchasedToday.focusBoost && String(context.focusBoost.taskId || '').trim()
            ? String(context.focusBoost.taskId || '').trim()
            : context.primaryTaskId
        };
      }
      if (entry.id === 'weekly_push') {
        return {
          ...entry,
          available: Boolean(context.weeklyMissionId) && !context.weeklyClaimed && !context.purchasedThisWeek.weeklyPush,
          stateKey: context.purchasedThisWeek.weeklyPush
            ? 'used'
            : ((context.weeklyMissionId && !context.weeklyClaimed) ? 'available' : 'locked'),
          weekKey: context.weekKey
        };
      }
      if (entry.id === 'safe_boost_check') {
        const safeBoostRelevant = context.hasTimeTask
          || context.buddyCategory === 'timeboost_safe'
          || context.buddyCategory === 'timeboost_unsafe';
        return {
          ...entry,
          available: safeBoostRelevant && !context.purchasedToday.safeBoostCheck,
          stateKey: context.purchasedToday.safeBoostCheck ? 'used' : (safeBoostRelevant ? 'available' : 'locked'),
          taskId: context.primaryTaskId
        };
      }
      return {
        ...entry,
        available: false,
        stateKey: 'coming_soon'
      };
    });
  }

  const api = {
    buildActionCatalog,
    buildBuddyExtraTip,
    buildContext,
    buildSafeBoostCheck,
    createCatalog
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  globalScope.GrowSimCoinActions = api;
})((typeof window !== 'undefined') ? window : globalThis);
