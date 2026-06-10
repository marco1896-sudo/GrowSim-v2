'use strict';

(function attachGrowSimWeeklyMissions(globalScope) {
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

  function parseDayKey(dayKey) {
    const safeDayKey = String(dayKey || '').trim();
    if (!safeDayKey) return null;
    const date = new Date(`${safeDayKey}T12:00:00`);
    if (!Number.isFinite(date.getTime())) return null;
    return date;
  }

  function formatDayKey(dateLike) {
    const date = dateLike instanceof Date ? new Date(dateLike.getTime()) : new Date(dateLike);
    if (!Number.isFinite(date.getTime())) {
      return '';
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getWeekKey(input) {
    const date = typeof input === 'string'
      ? parseDayKey(input)
      : new Date(Number.isFinite(Number(input)) ? Number(input) : Date.now());
    if (!date || !Number.isFinite(date.getTime())) {
      return '';
    }
    date.setHours(12, 0, 0, 0);
    const weekday = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - weekday);
    return formatDayKey(date);
  }

  function isDayKeyWithinWeek(dayKey, weekKey) {
    const dayDate = parseDayKey(dayKey);
    const weekDate = parseDayKey(weekKey);
    if (!dayDate || !weekDate) return false;
    const diffDays = Math.round((dayDate.getTime() - weekDate.getTime()) / 86400000);
    return diffDays >= 0 && diffDays < 7;
  }

  function toTaskId(task) {
    if (!task || typeof task !== 'object') return '';
    return String(task.id || task.taskId || task.type || task.trigger || '').trim();
  }

  function createCatalog() {
    return [
      {
        id: 'stable_start',
        rewardCoins: 140,
        weight: 44,
        phases: ['seedling'],
        when: (context) => context.simDay <= 18,
        objectives: [
          { metric: 'tasks_completed_week', target: 5 },
          { metric: 'active_days_week', target: 3 },
          { metric: 'streak_current', target: 2 }
        ]
      },
      {
        id: 'clean_routine',
        rewardCoins: 160,
        weight: 32,
        objectives: [
          { metric: 'tasks_completed_week', target: 6 },
          { metric: 'active_days_week', target: 4 },
          { metric: 'calm_today', target: 1 }
        ]
      },
      {
        id: 'growth_focus',
        rewardCoins: 170,
        weight: 48,
        phases: ['vegetative'],
        objectives: [
          { metric: 'tasks_completed_week', target: 5 },
          { metric: 'active_days_week', target: 3 },
          { metric: 'resource_stability_today', target: 1 }
        ]
      },
      {
        id: 'bloom_focus',
        rewardCoins: 180,
        weight: 50,
        phases: ['flowering', 'harvest'],
        objectives: [
          { metric: 'tasks_completed_week', target: 5 },
          { metric: 'active_days_week', target: 3 },
          { metric: 'bloom_calm_today', target: 1 }
        ]
      },
      {
        id: 'risk_reset',
        rewardCoins: 150,
        weight: 54,
        when: (context) => context.risk >= 45 || context.stress >= 50 || context.hasRiskTasks,
        objectives: [
          { metric: 'tasks_completed_week', target: 4 },
          { metric: 'active_days_week', target: 2 },
          { metric: 'risk_low_today', target: 1 }
        ]
      }
    ];
  }

  function buildContext(snapshot, options) {
    const safeState = snapshot && typeof snapshot === 'object' ? snapshot : {};
    const safeOptions = options && typeof options === 'object' ? options : {};
    const retention = safeState.retention && typeof safeState.retention === 'object' ? safeState.retention : {};
    const streak = retention.streak && typeof retention.streak === 'object' ? retention.streak : {};
    const dailyCare = retention.dailyCare && typeof retention.dailyCare === 'object' ? retention.dailyCare : {};
    const coinActions = retention.coinActions && typeof retention.coinActions === 'object' ? retention.coinActions : {};
    const simulation = safeState.simulation && typeof safeState.simulation === 'object' ? safeState.simulation : {};
    const status = safeState.status && typeof safeState.status === 'object' ? safeState.status : {};
    const plant = safeState.plant && typeof safeState.plant === 'object' ? safeState.plant : {};
    const nowMs = Number.isFinite(Number(safeOptions.nowMs)) ? Number(safeOptions.nowMs) : Date.now();
    const todayKey = String(safeOptions.todayKey || safeOptions.dayKey || dailyCare.dayKey || formatDayKey(nowMs)).trim();
    const weekKey = getWeekKey(todayKey || nowMs);
    const taskIds = (Array.isArray(dailyCare.tasks) ? dailyCare.tasks : []).map((task) => toTaskId(task)).filter(Boolean);
    const hasRiskTasks = taskIds.some((taskId) => [
      'resolve_pending_pressure',
      'climate_pressure_relief',
      'flowering_humidity_watch'
    ].includes(taskId));
    const stats = Array.isArray(safeOptions.dailyStats)
      ? safeOptions.dailyStats
      : (retention.analytics && Array.isArray(retention.analytics.dailyStats) ? retention.analytics.dailyStats : []);
    const weekStats = stats
      .filter((entry) => entry && typeof entry === 'object' && isDayKeyWithinWeek(String(entry.dayKey || '').trim(), weekKey))
      .map((entry) => ({
        dayKey: String(entry.dayKey || '').trim(),
        tasksCompleted: Math.max(0, Math.trunc(Number(entry.tasksCompleted) || 0)),
        active: Boolean(
          Number(entry.tasksCompleted || 0) > 0
          || Number(entry.sessionCount || 0) > 0
          || Number(entry.microUnlocked || 0) > 0
          || Number(entry.streakContinued || 0) > 0
        )
      }));
    const weeklyPush = coinActions.weeklyPush && typeof coinActions.weeklyPush === 'object' ? coinActions.weeklyPush : {};
    return {
      nowMs,
      todayKey,
      weekKey,
      simDay: Math.max(0, Math.trunc(Number(simulation.simDay) || 0)),
      phase: normalizePhase(plant.phase),
      water: clampNumber(status.water, 0, 100, 50),
      nutrition: clampNumber(status.nutrition, 0, 100, 50),
      stress: clampNumber(status.stress, 0, 100, 0),
      risk: clampNumber(status.risk, 0, 100, 0),
      health: clampNumber(status.health, 0, 100, 75),
      streakCurrent: Math.max(0, Math.trunc(Number(streak.currentCount) || 0)),
      hasRiskTasks,
      weekStats,
      weeklyTaskBonus: String(weeklyPush.weekKey || '').trim() === weekKey
        ? clampNumber(weeklyPush.bonusTasksCompleted, 0, 1, 0)
        : 0
    };
  }

  function isTemplateEligible(template, context) {
    if (!template || typeof template !== 'object') return false;
    const phases = Array.isArray(template.phases) ? template.phases : null;
    if (phases && phases.length && !phases.includes(context.phase)) return false;
    if (typeof template.when === 'function' && template.when(context) !== true) return false;
    return true;
  }

  function computeTemplateScore(template, context) {
    return Number(template.weight || 0) + (hashString(`${context.weekKey}:${template.id}`) % 5);
  }

  function selectWeeklyMission(snapshot, options) {
    const context = buildContext(snapshot, options);
    const catalog = createCatalog();
    const candidates = catalog
      .filter((template) => isTemplateEligible(template, context))
      .map((template) => ({
        ...template,
        score: computeTemplateScore(template, context)
      }))
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score;
        return String(left.id || '').localeCompare(String(right.id || ''));
      });
    return candidates[0] || catalog[0] || null;
  }

  function getMetricValue(metric, context) {
    switch (String(metric || '').trim()) {
      case 'tasks_completed_week':
        return context.weekStats.reduce((sum, entry) => sum + Math.max(0, Math.trunc(Number(entry.tasksCompleted) || 0)), 0)
          + Math.max(0, Math.trunc(Number(context.weeklyTaskBonus) || 0));
      case 'active_days_week':
        return context.weekStats.reduce((sum, entry) => sum + (entry.active ? 1 : 0), 0);
      case 'streak_current':
        return context.streakCurrent;
      case 'calm_today':
        return (context.stress <= 45 && context.risk <= 40) ? 1 : 0;
      case 'resource_stability_today':
        return (context.water >= 52 && context.nutrition >= 52) ? 1 : 0;
      case 'bloom_calm_today':
        return (context.risk <= 42 && context.stress <= 40) ? 1 : 0;
      case 'risk_low_today':
        return (context.risk <= 35 && context.stress <= 45) ? 1 : 0;
      default:
        return 0;
    }
  }

  function buildWeeklyMissionProgress(snapshot, missionId, options) {
    const context = buildContext(snapshot, options);
    const catalog = createCatalog();
    const template = catalog.find((entry) => String(entry.id || '').trim() === String(missionId || '').trim()) || null;
    if (!template) {
      return null;
    }
    const objectives = (Array.isArray(template.objectives) ? template.objectives : []).map((objective) => {
      const target = Math.max(1, Math.trunc(Number(objective.target) || 1));
      const currentRaw = getMetricValue(objective.metric, context);
      const current = Math.max(0, Math.min(target, Math.trunc(Number(currentRaw) || 0)));
      return {
        metric: String(objective.metric || '').trim(),
        current,
        target,
        completed: current >= target
      };
    });
    const completedObjectives = objectives.reduce((sum, objective) => sum + (objective.completed ? 1 : 0), 0);
    const totalObjectives = objectives.length || 1;
    const progressPercent = Math.round((objectives.reduce((sum, objective) => sum + (objective.current / objective.target), 0) / totalObjectives) * 100);
    return {
      id: String(template.id || '').trim(),
      weekKey: context.weekKey,
      rewardCoins: Math.max(0, Math.trunc(Number(template.rewardCoins) || 0)),
      objectives,
      completedObjectives,
      totalObjectives,
      completed: completedObjectives >= totalObjectives,
      progressPercent: Math.max(0, Math.min(100, progressPercent))
    };
  }

  const api = {
    buildContext,
    buildWeeklyMissionProgress,
    createCatalog,
    getWeekKey,
    selectWeeklyMission
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  globalScope.GrowSimWeeklyMissions = api;
})((typeof window !== 'undefined') ? window : globalThis);
