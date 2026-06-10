'use strict';

(function attachGrowSimDailyCareSelection(globalScope) {
  function normalizePhase(rawPhase) {
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

  function buildContext(snapshot, dayKey) {
    const safeState = snapshot && typeof snapshot === 'object' ? snapshot : {};
    const simulation = safeState.simulation && typeof safeState.simulation === 'object' ? safeState.simulation : {};
    const status = safeState.status && typeof safeState.status === 'object' ? safeState.status : {};
    const plant = safeState.plant && typeof safeState.plant === 'object' ? safeState.plant : {};
    const events = safeState.events && typeof safeState.events === 'object' ? safeState.events : {};
    const simDay = Math.max(0, Math.trunc(Number(simulation.simDay) || 0));
    const phase = normalizePhase(plant.phase);
    return {
      dayKey: String(dayKey || '').trim(),
      simDay,
      phase,
      water: clampNumber(status.water, 0, 100, 50),
      nutrition: clampNumber(status.nutrition, 0, 100, 50),
      stress: clampNumber(status.stress, 0, 100, 0),
      risk: clampNumber(status.risk, 0, 100, 0),
      health: clampNumber(status.health, 0, 100, 0),
      hasActiveEvent: String(events.machineState || '') === 'activeEvent',
      machineState: String(events.machineState || 'idle')
    };
  }

  function createCatalog() {
    return [
      {
        id: 'seedling_moisture_round',
        trigger: 'water_once',
        slot: 'pressure',
        target: 1,
        rewardCoins: 28,
        minXp: 8,
        phases: ['seedling'],
        weight: 52,
        when: (context) => context.water <= 68 || context.simDay <= 7
      },
      {
        id: 'water_recovery_round',
        trigger: 'water_once',
        slot: 'pressure',
        target: 1,
        rewardCoins: 30,
        minXp: 8,
        phases: ['vegetative', 'flowering', 'harvest'],
        weight: 58,
        when: (context) => context.water <= 58
      },
      {
        id: 'nutrient_rebalance',
        trigger: 'fertilizing_once',
        slot: 'pressure',
        target: 1,
        rewardCoins: 30,
        minXp: 8,
        phases: ['vegetative', 'flowering', 'harvest'],
        weight: 54,
        when: (context) => context.nutrition <= 58
      },
      {
        id: 'climate_pressure_relief',
        trigger: 'environment_once',
        slot: 'pressure',
        target: 1,
        rewardCoins: 32,
        minXp: 8,
        weight: 56,
        when: (context) => context.stress >= 48 || context.risk >= 45
      },
      {
        id: 'resolve_pending_pressure',
        trigger: 'resolve_one_event',
        slot: 'pressure',
        target: 1,
        rewardCoins: 35,
        minXp: 8,
        weight: 60,
        when: (context) => context.hasActiveEvent || context.machineState === 'resolved'
      },
      {
        id: 'flowering_humidity_watch',
        trigger: 'stable_climate_window',
        slot: 'pressure',
        target: 1,
        rewardCoins: 34,
        minXp: 8,
        phases: ['flowering', 'harvest'],
        weight: 50,
        when: (context) => context.risk >= 34
      },
      {
        id: 'seedling_stability_check',
        trigger: 'care_sheet_check',
        slot: 'phase',
        target: 1,
        rewardCoins: 22,
        minXp: 8,
        phases: ['seedling'],
        weight: 42
      },
      {
        id: 'veg_feed_support',
        trigger: 'fertilizing_once',
        slot: 'phase',
        target: 1,
        rewardCoins: 28,
        minXp: 8,
        phases: ['vegetative'],
        minDay: 8,
        weight: 40
      },
      {
        id: 'veg_training_review',
        trigger: 'training_once',
        slot: 'phase',
        target: 1,
        rewardCoins: 30,
        minXp: 8,
        phases: ['vegetative'],
        minDay: 14,
        weight: 44
      },
      {
        id: 'flower_climate_tune',
        trigger: 'environment_once',
        slot: 'phase',
        target: 1,
        rewardCoins: 30,
        minXp: 8,
        phases: ['flowering'],
        minDay: 28,
        weight: 43
      },
      {
        id: 'flower_mold_watch',
        trigger: 'analysis_sheet_check',
        slot: 'phase',
        target: 1,
        rewardCoins: 24,
        minXp: 8,
        phases: ['flowering'],
        minDay: 35,
        weight: 41
      },
      {
        id: 'ripening_quality_check',
        trigger: 'analysis_sheet_check',
        slot: 'phase',
        target: 1,
        rewardCoins: 28,
        minXp: 8,
        phases: ['harvest'],
        minDay: 60,
        weight: 46
      },
      {
        id: 'ripening_final_round',
        trigger: 'open_app_twice',
        slot: 'phase',
        target: 2,
        rewardCoins: 32,
        minXp: 8,
        phases: ['harvest'],
        minDay: 70,
        weight: 38
      },
      {
        id: 'open_app_twice',
        trigger: 'open_app_twice',
        slot: 'engagement',
        target: 2,
        rewardCoins: 30,
        minXp: 8,
        weight: 35
      },
      {
        id: 'care_sheet_check',
        trigger: 'care_sheet_check',
        slot: 'engagement',
        target: 1,
        rewardCoins: 20,
        minXp: 8,
        weight: 36
      },
      {
        id: 'analysis_sheet_check',
        trigger: 'analysis_sheet_check',
        slot: 'engagement',
        target: 1,
        rewardCoins: 22,
        minXp: 8,
        weight: 34
      },
      {
        id: 'missions_board_check',
        trigger: 'missions_board_check',
        slot: 'engagement',
        target: 1,
        rewardCoins: 20,
        minXp: 8,
        weight: 33
      },
      {
        id: 'stable_climate_window',
        trigger: 'stable_climate_window',
        slot: 'engagement',
        target: 1,
        rewardCoins: 35,
        minXp: 8,
        weight: 34
      }
    ];
  }

  function isTemplateEligible(template, context) {
    if (!template || typeof template !== 'object') return false;
    const phases = Array.isArray(template.phases) ? template.phases : null;
    if (phases && phases.length && !phases.includes(context.phase)) return false;
    if (Number.isFinite(Number(template.minDay)) && context.simDay < Number(template.minDay)) return false;
    if (Number.isFinite(Number(template.maxDay)) && context.simDay > Number(template.maxDay)) return false;
    if (typeof template.when === 'function' && template.when(context) !== true) return false;
    return true;
  }

  function computeTemplateScore(template, context, recentIds) {
    const recentPenalty = recentIds.has(template.id) ? 18 : 0;
    const dayBias = hashString(`${context.dayKey}:${template.id}`) % 7;
    return Number(template.weight || 0) + dayBias - recentPenalty;
  }

  function selectBestCandidate(candidates, selectedIds, recentIds) {
    const remaining = candidates.filter((candidate) => candidate && !selectedIds.has(candidate.id));
    if (!remaining.length) return null;
    const freshCandidates = remaining.filter((candidate) => !recentIds.has(candidate.id));
    const pool = freshCandidates.length ? freshCandidates : remaining;
    return pool
      .slice()
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score;
        return String(left.id || '').localeCompare(String(right.id || ''));
      })[0] || null;
  }

  function buildDailyCareSelection(snapshot, options) {
    const safeOptions = options && typeof options === 'object' ? options : {};
    const maxTasks = Math.max(1, Math.trunc(Number(safeOptions.maxTasks) || 3));
    const dayKey = String(safeOptions.dayKey || '').trim();
    const context = buildContext(snapshot, dayKey);
    const catalog = createCatalog();
    const recentIds = new Set(
      (Array.isArray(safeOptions.recentTaskIds) ? safeOptions.recentTaskIds : [])
        .map((entry) => String(entry || '').trim())
        .filter(Boolean)
    );

    const scoredCandidates = catalog
      .filter((template) => isTemplateEligible(template, context))
      .map((template) => ({
        ...template,
        score: computeTemplateScore(template, context, recentIds)
      }));

    const selected = [];
    const selectedIds = new Set();
    const slots = ['pressure', 'phase', 'engagement'];

    for (const slot of slots) {
      const slotCandidates = scoredCandidates.filter((candidate) => candidate.slot === slot);
      const picked = selectBestCandidate(slotCandidates, selectedIds, recentIds);
      if (picked) {
        selected.push(picked);
        selectedIds.add(picked.id);
      }
    }

    if (selected.length < maxTasks) {
      const fallback = scoredCandidates
        .filter((candidate) => !selectedIds.has(candidate.id))
        .sort((left, right) => {
          if (right.score !== left.score) return right.score - left.score;
          return String(left.id || '').localeCompare(String(right.id || ''));
        });
      for (const candidate of fallback) {
        if (selected.length >= maxTasks) break;
        selected.push(candidate);
        selectedIds.add(candidate.id);
      }
    }

    return selected.slice(0, maxTasks).map((template) => ({
      id: String(template.id || '').trim(),
      type: String(template.id || '').trim(),
      trigger: String(template.trigger || template.id || '').trim(),
      target: Math.max(1, Math.trunc(Number(template.target) || 1)),
      rewardCoins: Math.max(0, Math.trunc(Number(template.rewardCoins) || 25)),
      minXp: Math.max(0, Math.trunc(Number(template.minXp) || 8)),
      slot: String(template.slot || 'engagement'),
      phase: context.phase
    }));
  }

  const api = {
    buildContext,
    buildDailyCareSelection,
    createCatalog,
    normalizePhase
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  globalScope.GrowSimDailyCareSelection = api;
})((typeof window !== 'undefined') ? window : globalThis);
