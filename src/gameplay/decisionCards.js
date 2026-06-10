'use strict';

(function attachGrowSimDecisionCards(globalScope) {
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

  function isTaskCompleted(task) {
    if (!task || typeof task !== 'object') return false;
    const target = Math.max(1, Math.trunc(Number(task.target || task.targetValue) || 1));
    const progress = Math.max(0, Math.trunc(Number(task.progress || task.progressValue) || 0));
    return Boolean(task.completed) || progress >= target;
  }

  function isTaskClaimed(task) {
    return Boolean(task && (task.claimed || task.rewardGrantedAt));
  }

  function createCatalog() {
    return [
      {
        id: 'water_low',
        weight: 64,
        when: (context) => context.water <= 55 || hasTask(context, ['seedling_moisture_round', 'water_recovery_round']),
        options: [
          { id: 'careful_water' },
          { id: 'check_later' },
          { id: 'read_buddy_tip' }
        ]
      },
      {
        id: 'stress_elevated',
        weight: 60,
        when: (context) => context.stress >= 45 || hasTask(context, ['climate_pressure_relief']),
        options: [
          { id: 'stay_calm' },
          { id: 'review_routine' },
          { id: 'avoid_boost' }
        ]
      },
      {
        id: 'risk_focus',
        weight: 62,
        when: (context) => context.risk >= 45 || context.hasActiveEvent || hasTask(context, ['resolve_pending_pressure']),
        options: [
          { id: 'prioritize_risk' },
          { id: 'first_diagnosis' },
          { id: 'wait_and_watch' }
        ]
      },
      {
        id: 'bloom_watch',
        weight: 46,
        phases: ['flowering', 'harvest'],
        when: (context) => context.phase === 'flowering' || context.phase === 'harvest',
        options: [
          { id: 'check_humidity' },
          { id: 'avoid_stress' },
          { id: 'use_buddy_tip' }
        ]
      },
      {
        id: 'growth_routine',
        weight: 42,
        phases: ['vegetative'],
        when: (context) => context.phase === 'vegetative' && context.simDay >= 10,
        options: [
          { id: 'check_supply' },
          { id: 'watch_light_stress' },
          { id: 'focus_dailycare' }
        ]
      },
      {
        id: 'timeboost_choice',
        weight: 38,
        when: (context) => hasTask(context, ['open_app_twice', 'stable_climate_window', 'ripening_final_round']) || context.buddyCategory === 'timeboost_safe' || context.buddyCategory === 'timeboost_unsafe',
        options: [
          { id: 'use_safe_boost_check' },
          { id: 'finish_dailycare_first' },
          { id: 'skip_for_now' }
        ]
      }
    ];
  }

  function buildContext(snapshot, options) {
    const safeState = snapshot && typeof snapshot === 'object' ? snapshot : {};
    const safeOptions = options && typeof options === 'object' ? options : {};
    const retention = safeState.retention && typeof safeState.retention === 'object' ? safeState.retention : {};
    const dailyCare = retention.dailyCare && typeof retention.dailyCare === 'object' ? retention.dailyCare : {};
    const weekly = retention.weekly && typeof retention.weekly === 'object' ? retention.weekly : {};
    const status = safeState.status && typeof safeState.status === 'object' ? safeState.status : {};
    const events = safeState.events && typeof safeState.events === 'object' ? safeState.events : {};
    const plant = safeState.plant && typeof safeState.plant === 'object' ? safeState.plant : {};
    const simulation = safeState.simulation && typeof safeState.simulation === 'object' ? safeState.simulation : {};
    const tasks = Array.isArray(dailyCare.tasks) ? dailyCare.tasks : [];
    const openTasks = tasks.filter((task) => !isTaskClaimed(task));
    const activeTasks = openTasks.filter((task) => !isTaskCompleted(task));
    const primaryTaskId = String(
      safeOptions.primaryTaskId
      || (dailyCare.buddyCheck && dailyCare.buddyCheck.primaryTaskId)
      || toTaskId(activeTasks[0])
      || toTaskId(openTasks[0])
      || ''
    ).trim();
    return {
      dayKey: String(safeOptions.dayKey || dailyCare.dayKey || '').trim(),
      weekKey: String(safeOptions.weekKey || weekly.weekKey || '').trim(),
      simDay: Math.max(0, Math.trunc(Number(simulation.simDay) || 0)),
      phase: normalizePhase(plant.phase),
      water: clampNumber(status.water, 0, 100, 50),
      nutrition: clampNumber(status.nutrition, 0, 100, 50),
      stress: clampNumber(status.stress, 0, 100, 0),
      risk: clampNumber(status.risk, 0, 100, 0),
      health: clampNumber(status.health, 0, 100, 75),
      machineState: String(events.machineState || 'idle'),
      hasActiveEvent: String(events.machineState || '') === 'activeEvent',
      weeklyMissionId: String(weekly.missionId || '').trim(),
      buddyCategory: String(dailyCare.buddyCheck && dailyCare.buddyCheck.category || '').trim(),
      tasks,
      openTasks,
      activeTasks,
      primaryTaskId
    };
  }

  function hasTask(context, ids) {
    const pool = new Set((Array.isArray(context.tasks) ? context.tasks : []).map((task) => toTaskId(task)).filter(Boolean));
    return (Array.isArray(ids) ? ids : []).some((id) => pool.has(String(id || '').trim()));
  }

  function isEligible(template, context) {
    if (!template || typeof template !== 'object') return false;
    const phases = Array.isArray(template.phases) ? template.phases : null;
    if (phases && phases.length && !phases.includes(context.phase)) return false;
    if (typeof template.when === 'function' && template.when(context) !== true) return false;
    return true;
  }

  function scoreTemplate(template, context, recentIds) {
    const recentPenalty = recentIds.has(template.id) ? 20 : 0;
    let urgencyBonus = 0;
    const templateId = String(template && template.id || '').trim();
    if (templateId === 'risk_focus' && (context.hasActiveEvent || context.risk >= 55)) {
      urgencyBonus = 24;
    } else if (templateId === 'stress_elevated' && context.stress >= 55) {
      urgencyBonus = 14;
    } else if (templateId === 'water_low' && context.water <= 45) {
      urgencyBonus = 10;
    }
    return Number(template.weight || 0) + urgencyBonus + (hashString(`${context.dayKey}:${template.id}`) % 5) - recentPenalty;
  }

  function selectDecisionCard(snapshot, options) {
    const context = buildContext(snapshot, options);
    const recentIds = new Set(
      (Array.isArray(options && options.recentCardIds) ? options.recentCardIds : [])
        .map((entry) => String(entry || '').trim())
        .filter(Boolean)
    );
    const candidates = createCatalog()
      .filter((entry) => isEligible(entry, context))
      .map((entry) => ({
        ...entry,
        score: scoreTemplate(entry, context, recentIds)
      }))
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score;
        return String(left.id || '').localeCompare(String(right.id || ''));
      });
    const selected = candidates[0] || null;
    if (!selected) {
      return null;
    }
    return {
      id: String(selected.id || '').trim(),
      dayKey: context.dayKey,
      weekKey: context.weekKey,
      primaryTaskId: context.primaryTaskId,
      options: Array.isArray(selected.options) ? selected.options.map((entry) => ({
        id: String(entry.id || '').trim()
      })) : []
    };
  }

  function findFocusTaskId(context, preferredIds) {
    const safeIds = (Array.isArray(preferredIds) ? preferredIds : []).map((entry) => String(entry || '').trim()).filter(Boolean);
    for (const task of (Array.isArray(context.openTasks) ? context.openTasks : [])) {
      const taskId = toTaskId(task);
      if (safeIds.includes(taskId)) {
        return taskId;
      }
    }
    for (const task of (Array.isArray(context.tasks) ? context.tasks : [])) {
      const taskId = toTaskId(task);
      if (safeIds.includes(taskId)) {
        return taskId;
      }
    }
    return context.primaryTaskId || '';
  }

  function buildDecisionCardResolution(snapshot, cardId, optionId, options) {
    const context = buildContext(snapshot, options);
    const safeCardId = String(cardId || '').trim();
    const safeOptionId = String(optionId || '').trim();
    let focusTaskId = '';
    let suggestedCoinActionId = '';

    if (safeCardId === 'water_low') {
      if (safeOptionId === 'careful_water') {
        focusTaskId = findFocusTaskId(context, ['seedling_moisture_round', 'water_recovery_round', 'water_once']);
      } else if (safeOptionId === 'check_later') {
        focusTaskId = findFocusTaskId(context, ['care_sheet_check', 'analysis_sheet_check']);
      } else if (safeOptionId === 'read_buddy_tip') {
        suggestedCoinActionId = 'buddy_extra_tip';
      }
    } else if (safeCardId === 'stress_elevated') {
      if (safeOptionId === 'stay_calm') {
        focusTaskId = findFocusTaskId(context, ['climate_pressure_relief', 'stable_climate_window']);
      } else if (safeOptionId === 'review_routine') {
        focusTaskId = findFocusTaskId(context, ['care_sheet_check', 'analysis_sheet_check']);
      } else if (safeOptionId === 'avoid_boost') {
        suggestedCoinActionId = 'safe_boost_check';
      }
    } else if (safeCardId === 'risk_focus') {
      if (safeOptionId === 'prioritize_risk') {
        focusTaskId = findFocusTaskId(context, ['resolve_pending_pressure', 'flower_mold_watch', 'flowering_humidity_watch']);
      } else if (safeOptionId === 'first_diagnosis') {
        focusTaskId = findFocusTaskId(context, ['analysis_sheet_check']);
      }
    } else if (safeCardId === 'bloom_watch') {
      if (safeOptionId === 'check_humidity') {
        focusTaskId = findFocusTaskId(context, ['flowering_humidity_watch', 'flower_climate_tune', 'flower_mold_watch']);
      } else if (safeOptionId === 'avoid_stress') {
        focusTaskId = findFocusTaskId(context, ['flower_climate_tune', 'stable_climate_window']);
      } else if (safeOptionId === 'use_buddy_tip') {
        suggestedCoinActionId = 'buddy_extra_tip';
      }
    } else if (safeCardId === 'growth_routine') {
      if (safeOptionId === 'check_supply') {
        focusTaskId = findFocusTaskId(context, ['veg_feed_support', 'nutrient_rebalance']);
      } else if (safeOptionId === 'watch_light_stress') {
        focusTaskId = findFocusTaskId(context, ['climate_pressure_relief', 'veg_training_review']);
      } else if (safeOptionId === 'focus_dailycare') {
        focusTaskId = findFocusTaskId(context, [context.primaryTaskId]);
      }
    } else if (safeCardId === 'timeboost_choice') {
      if (safeOptionId === 'use_safe_boost_check') {
        suggestedCoinActionId = 'safe_boost_check';
      } else if (safeOptionId === 'finish_dailycare_first') {
        focusTaskId = findFocusTaskId(context, [context.primaryTaskId]);
      }
    }

    return {
      cardId: safeCardId,
      optionId: safeOptionId,
      focusTaskId,
      suggestedCoinActionId,
      resultTextKey: `daily.decision.card.${safeCardId}.result.${safeOptionId}`
    };
  }

  const api = {
    buildContext,
    buildDecisionCardResolution,
    createCatalog,
    selectDecisionCard
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  globalScope.GrowSimDecisionCards = api;
})((typeof window !== 'undefined') ? window : globalThis);
