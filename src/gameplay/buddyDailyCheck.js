'use strict';

(function attachGrowSimBuddyDailyCheck(globalScope) {
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
    return String(task.id || task.taskId || task.type || task.trigger || '').trim();
  }

  function buildContext(snapshot, options) {
    const safeState = snapshot && typeof snapshot === 'object' ? snapshot : {};
    const safeOptions = options && typeof options === 'object' ? options : {};
    const status = safeState.status && typeof safeState.status === 'object' ? safeState.status : {};
    const plant = safeState.plant && typeof safeState.plant === 'object' ? safeState.plant : {};
    const events = safeState.events && typeof safeState.events === 'object' ? safeState.events : {};
    const simulation = safeState.simulation && typeof safeState.simulation === 'object' ? safeState.simulation : {};
    const retention = safeState.retention && typeof safeState.retention === 'object' ? safeState.retention : {};
    const dailyCare = retention.dailyCare && typeof retention.dailyCare === 'object' ? retention.dailyCare : {};
    const tasks = Array.isArray(safeOptions.tasks) ? safeOptions.tasks : (Array.isArray(dailyCare.tasks) ? dailyCare.tasks : []);
    const taskIds = tasks.map((task) => toTaskId(task)).filter(Boolean);
    return {
      dayKey: String(safeOptions.dayKey || dailyCare.dayKey || '').trim(),
      simDay: Math.max(0, Math.trunc(Number(simulation.simDay) || 0)),
      phase: normalizePhase(plant.phase),
      water: clampNumber(status.water, 0, 100, 50),
      nutrition: clampNumber(status.nutrition, 0, 100, 50),
      stress: clampNumber(status.stress, 0, 100, 0),
      risk: clampNumber(status.risk, 0, 100, 0),
      health: clampNumber(status.health, 0, 100, 75),
      hasActiveEvent: String(events.machineState || '') === 'activeEvent',
      machineState: String(events.machineState || 'idle'),
      taskIds
    };
  }

  function hasTask(context, ids) {
    const pool = new Set(Array.isArray(context.taskIds) ? context.taskIds : []);
    return (Array.isArray(ids) ? ids : []).some((id) => pool.has(String(id || '').trim()));
  }

  function isTimeboostSafe(context) {
    return !context.hasActiveEvent
      && context.machineState !== 'resolving'
      && context.risk <= 24
      && context.stress <= 26
      && context.water >= 62
      && context.nutrition >= 58
      && context.health >= 70;
  }

  function isTimeboostUnsafe(context) {
    return context.hasActiveEvent
      || context.machineState === 'resolving'
      || context.risk >= 42
      || context.stress >= 40
      || context.water <= 52
      || context.nutrition <= 52
      || context.health <= 54;
  }

  function pickPrimaryTaskId(context) {
    const preferred = (Array.isArray(context.taskIds) ? context.taskIds : []).find((id) => ![
      'open_app_twice',
      'missions_board_check'
    ].includes(id));
    return preferred || String((context.taskIds && context.taskIds[0]) || '').trim();
  }

  function pickPrimaryTaskIdForCategory(context, category) {
    const safeCategory = String(category || '').trim();
    const preferredByCategory = {
      water_focus: ['seedling_moisture_round', 'water_recovery_round', 'water_once'],
      nutrient_focus: ['nutrient_rebalance'],
      stress_focus: ['climate_pressure_relief', 'stable_climate_window'],
      risk_focus: ['resolve_pending_pressure', 'flower_mold_watch', 'flowering_humidity_watch'],
      bloom_focus: ['flower_climate_tune', 'flowering_humidity_watch', 'flower_mold_watch', 'ripening_quality_check', 'ripening_final_round'],
      seedling_veg_focus: ['seedling_stability_check', 'seedling_moisture_round', 'veg_feed_support', 'veg_training_review'],
      timeboost_safe: ['stable_climate_window', 'open_app_twice', 'ripening_final_round'],
      timeboost_unsafe: ['stable_climate_window', 'open_app_twice', 'ripening_final_round'],
      daily_task_hint: ['care_sheet_check', 'analysis_sheet_check', 'missions_board_check']
    };
    const preferredIds = Array.isArray(preferredByCategory[safeCategory]) ? preferredByCategory[safeCategory] : [];
    for (const preferredId of preferredIds) {
      if ((Array.isArray(context.taskIds) ? context.taskIds : []).includes(preferredId)) {
        return preferredId;
      }
    }
    return pickPrimaryTaskId(context);
  }

  function pickSecondaryTaskId(context, primaryTaskId) {
    return (Array.isArray(context.taskIds) ? context.taskIds : []).find((id) => id && id !== primaryTaskId) || '';
  }

  function pickCommentCategory(context) {
    if (context.hasActiveEvent || context.risk >= 68 || hasTask(context, ['resolve_pending_pressure'])) {
      return 'risk_focus';
    }
    if (context.stress >= 52 || hasTask(context, ['climate_pressure_relief'])) {
      return 'stress_focus';
    }
    if (context.water <= 55 || hasTask(context, ['seedling_moisture_round', 'water_recovery_round'])) {
      return 'water_focus';
    }
    if (context.nutrition <= 56 || hasTask(context, ['nutrient_rebalance'])) {
      return 'nutrient_focus';
    }

    if (context.phase === 'flowering' || context.phase === 'harvest' || hasTask(context, [
      'flower_climate_tune',
      'flowering_humidity_watch',
      'flower_mold_watch',
      'ripening_quality_check',
      'ripening_final_round'
    ])) {
      return 'bloom_focus';
    }
    if (context.phase === 'seedling' || context.phase === 'vegetative' || hasTask(context, [
      'seedling_stability_check',
      'seedling_moisture_round',
      'veg_feed_support',
      'veg_training_review'
    ])) {
      return 'seedling_veg_focus';
    }

    const hasTimeTask = hasTask(context, ['open_app_twice', 'stable_climate_window', 'ripening_final_round']);
    if (hasTimeTask && isTimeboostUnsafe(context)) {
      return 'timeboost_unsafe';
    }
    if (hasTimeTask && isTimeboostSafe(context)) {
      return 'timeboost_safe';
    }
    if (hasTask(context, ['care_sheet_check', 'analysis_sheet_check', 'missions_board_check'])) {
      return 'daily_task_hint';
    }
    if (context.risk <= 30 && context.stress <= 28 && context.water >= 58 && context.nutrition >= 56) {
      return 'stable_day';
    }
    return 'fallback';
  }

  function getVariantCount() {
    return 3;
  }

  function buildBuddyDailyCheck(snapshot, options) {
    const safeOptions = options && typeof options === 'object' ? options : {};
    const nowMs = Number.isFinite(Number(safeOptions.nowMs)) ? Number(safeOptions.nowMs) : Date.now();
    const context = buildContext(snapshot, safeOptions);
    const category = pickCommentCategory(context);
    const primaryTaskId = pickPrimaryTaskIdForCategory(context, category);
    const secondaryTaskId = pickSecondaryTaskId(context, primaryTaskId);
    const variant = (hashString([
      context.dayKey,
      category,
      context.phase,
      primaryTaskId,
      secondaryTaskId,
      context.simDay
    ].join(':')) % getVariantCount()) + 1;
    const safeCategory = String(category || 'fallback').trim() || 'fallback';
    return {
      dayKey: context.dayKey,
      category: safeCategory,
      textKey: `daily.buddy.comment.${safeCategory}.${variant}`,
      primaryTaskId,
      secondaryTaskId,
      taskIds: context.taskIds.slice(0, 3),
      generatedAtMs: nowMs
    };
  }

  const api = {
    buildBuddyDailyCheck,
    buildContext,
    isTimeboostSafe,
    isTimeboostUnsafe,
    pickCommentCategory
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  globalScope.GrowSimBuddyDailyCheck = api;
})((typeof window !== 'undefined') ? window : globalThis);
