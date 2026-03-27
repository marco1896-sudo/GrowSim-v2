'use strict';

(function attachCareActionHints(globalScope) {
  const SEVERITY_PRIORITY = Object.freeze({
    warning: 3,
    caution: 2,
    positive: 1
  });

  function toFiniteNumber(value, fallback = null) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  function clamp(value, min, max) {
    const numeric = toFiniteNumber(value, min);
    if (numeric === null) return min;
    return Math.max(min, Math.min(max, numeric));
  }

  function mapPlantProgressPhase(stageIndex, plantPhase) {
    const numericStageIndex = Math.max(0, Math.floor(toFiniteNumber(stageIndex, 0)));
    const normalizedPlantPhase = String(plantPhase || '').trim().toLowerCase();

    if (normalizedPlantPhase === 'seedling' || numericStageIndex <= 1) {
      return 'seedling';
    }
    if (normalizedPlantPhase === 'vegetative' || normalizedPlantPhase === 'veg' || numericStageIndex <= 5) {
      return 'vegetative';
    }
    if (normalizedPlantPhase === 'flowering' || normalizedPlantPhase === 'flower') {
      return numericStageIndex >= 8 ? 'late_flower' : 'early_flower';
    }
    if (numericStageIndex <= 7) {
      return 'early_flower';
    }
    return 'late_flower';
  }

  function normalizeAirflowLabel(airflowScore) {
    if (!Number.isFinite(airflowScore)) return '';
    if (airflowScore >= 70) return 'Good';
    if (airflowScore >= 40) return 'Mittel';
    return 'Schwach';
  }

  function buildCareActionContext(source, action) {
    const root = source && typeof source === 'object' ? source : {};
    const status = root.status && typeof root.status === 'object' ? root.status : root;
    const climate = root.climate && typeof root.climate === 'object' ? root.climate : root;
    const plant = root.plant && typeof root.plant === 'object' ? root.plant : root;
    const simulation = root.simulation && typeof root.simulation === 'object' ? root.simulation : root;

    const stageIndex = Math.max(0, Math.floor(toFiniteNumber(plant.stageIndex, toFiniteNumber(root.stageIndex, 0))));
    const plantPhase = String(plant.phase || root.plantPhase || '');
    const phaseModel = mapPlantProgressPhase(stageIndex, plantPhase);
    const actionRef = action && typeof action === 'object' ? action : {};

    const temperatureC = toFiniteNumber(climate.temperatureC);
    const humidityPercent = toFiniteNumber(climate.humidityPercent);
    const vpdKpa = toFiniteNumber(climate.vpdKpa);
    const airflowScore = toFiniteNumber(climate.airflowScore);

    return {
      action: {
        id: String(actionRef.id || ''),
        category: String(actionRef.category || ''),
        intensity: String(actionRef.intensity || 'medium')
      },
      phaseModel,
      stageIndex,
      plantPhase,
      isDaytime: Boolean(simulation.isDaytime === undefined ? root.isDaytime : simulation.isDaytime),
      health: clamp(toFiniteNumber(status.health, root.health), 0, 100),
      stress: clamp(toFiniteNumber(status.stress, root.stress), 0, 100),
      risk: clamp(toFiniteNumber(status.risk, root.risk), 0, 100),
      water: clamp(toFiniteNumber(status.water, root.water), 0, 100),
      nutrition: clamp(toFiniteNumber(status.nutrition, root.nutrition), 0, 100),
      growth: clamp(toFiniteNumber(status.growth, root.growth), 0, 100),
      climate: {
        temperatureC,
        humidityPercent,
        vpdKpa,
        airflowScore,
        airflowLabel: climate.airflowLabel ? String(climate.airflowLabel) : normalizeAirflowLabel(airflowScore)
      }
    };
  }

  function makeHint(severity, message, key) {
    return {
      severity,
      priority: SEVERITY_PRIORITY[severity] || 0,
      message: String(message || '').trim(),
      key: String(key || '')
    };
  }

  function pushHint(hints, severity, message, key) {
    const hint = makeHint(severity, message, key);
    if (!hint.message) return;
    hints.push(hint);
  }

  function evaluateWateringHints(context) {
    const hints = [];
    const action = context.action || {};
    const climate = context.climate || {};

    if (context.phaseModel === 'late_flower'
      && Number.isFinite(climate.humidityPercent)
      && climate.humidityPercent >= 68
      && Number.isFinite(climate.airflowScore)
      && climate.airflowScore <= 45
      && action.intensity !== 'low') {
      pushHint(hints, 'warning', 'In der späten Blüte hält zusätzliches Gießen die Zone leichter zu feucht. Das erhöht gerade den Krankheitsdruck.', 'watering_late_flower_humid');
    }

    if (context.water >= 88 || (context.water >= 78 && context.risk >= 70)) {
      pushHint(hints, 'warning', 'Das Medium wirkt bereits stark belastet. Mehr Wasser kann die Wurzelzone gerade eher verschärfen.', 'watering_root_pressure');
    } else if (context.water >= 76) {
      pushHint(hints, 'caution', 'Das Medium ist noch recht feucht. Mehr Wasser kann die Wurzelzone unnötig belasten.', 'watering_still_wet');
    } else if (context.water <= 36) {
      pushHint(hints, 'positive', 'Das Medium wirkt trocken genug. Diese Bewässerung passt gerade gut.', 'watering_good_fit');
    }

    if (action.id === 'watering_medium_vitamin') {
      if (context.nutrition >= 78 || context.stress >= 62) {
        pushHint(hints, 'caution', 'Die Wurzelzone trägt schon Druck. Nährlösung kann sie jetzt schneller belasten.', 'watering_feed_solution_pressure');
      } else if (context.nutrition <= 42 && context.health >= 45) {
        pushHint(hints, 'positive', 'Die Pflanze wirkt aufnahmefähig. Eine Nährlösung passt gerade gut.', 'watering_feed_solution_positive');
      }
    }

    if (action.id === 'watering_high_flush') {
      if (context.nutrition >= 72 || context.risk >= 65) {
        pushHint(hints, 'positive', 'Die Wurzelzone wirkt belastet. Ein Spülen kann gerade helfen, etwas Druck herauszunehmen.', 'watering_flush_positive');
      } else if (context.nutrition <= 40) {
        pushHint(hints, 'caution', 'Die Pflanze wirkt nicht stark belastet. Spülen kann jetzt auch unnötig Substanz aus dem Medium ziehen.', 'watering_flush_caution');
      }
    }

    if (Number.isFinite(climate.humidityPercent)
      && climate.humidityPercent <= 38
      && action.intensity !== 'low') {
      pushHint(hints, 'caution', 'Die Luft ist sehr trocken. Stärkeres Gießen ändert das nur kurz und kann den Rhythmus unruhig machen.', 'watering_dry_air');
    }

    return hints;
  }

  function evaluateFertilizingHints(context) {
    const hints = [];
    const action = context.action || {};
    const climate = context.climate || {};

    if (context.phaseModel === 'seedling' && action.intensity !== 'low') {
      pushHint(hints, 'warning', 'Junge Pflanzen reagieren auf kräftige Fütterung schneller empfindlich. Gerade jetzt ist Zurückhaltung meist schonender.', 'fertilizing_seedling_warning');
    }

    if (context.nutrition >= 80 || (context.nutrition >= 72 && context.risk >= 65)) {
      pushHint(hints, 'warning', 'Die Wurzelzone steht schon unter Nährstoffdruck. Mehr Futter erhöht jetzt eher das Risiko.', 'fertilizing_pressure_warning');
    } else if (context.stress >= 64 || context.health <= 38) {
      pushHint(hints, 'warning', 'Die Pflanze steht bereits unter Druck. Zusätzliche Nährstoffe können sie gerade stärker belasten.', 'fertilizing_stressed_warning');
    } else if (context.water <= 28) {
      pushHint(hints, 'caution', 'Sehr trockenes Medium nimmt Fütterung oft härter auf. Etwas sanftere Versorgung wäre jetzt schonender.', 'fertilizing_dry_medium');
    } else if (context.nutrition <= 42 && context.health >= 45 && context.stress <= 50) {
      pushHint(hints, 'positive', 'Die Pflanze wirkt aufnahmefähig. Eine passende Fütterung ist gerade sinnvoll.', 'fertilizing_positive');
    }

    if (context.phaseModel === 'late_flower'
      && Number.isFinite(climate.humidityPercent)
      && climate.humidityPercent >= 68
      && context.risk >= 55) {
      pushHint(hints, 'caution', 'In der späten Blüte zählt stabile Führung besonders. Zusätzlicher Druck wirkt jetzt schneller nach.', 'fertilizing_late_flower_caution');
    }

    return hints;
  }

  function evaluateTrainingHints(context) {
    const hints = [];
    const action = context.action || {};
    const climate = context.climate || {};

    if (context.phaseModel === 'seedling') {
      pushHint(hints, 'warning', 'Junge Pflanzen reagieren auf Eingriffe deutlich empfindlicher. Training kostet jetzt schnell Stabilität.', 'training_seedling_warning');
    } else if (context.phaseModel === 'late_flower' && action.intensity !== 'low') {
      pushHint(hints, 'warning', 'In der späten Blüte wirken stärkere Eingriffe deutlich belastender. Erholung kommt jetzt langsamer zurück.', 'training_late_flower_warning');
    } else if (context.phaseModel === 'early_flower' && action.intensity !== 'low') {
      pushHint(hints, 'caution', 'In der frühen Blüte sollte Training vorsichtiger werden. Zu viel Eingriff kostet jetzt leichter Energie.', 'training_early_flower_caution');
    }

    if (context.stress >= 55 || context.health <= 45) {
      pushHint(hints, 'warning', 'Die Pflanze steht bereits unter Druck. Training kostet jetzt eher Erholung als Fortschritt.', 'training_stress_warning');
    } else if (Number.isFinite(climate.vpdKpa) && climate.vpdKpa >= 1.55) {
      pushHint(hints, 'caution', 'Die Luft wirkt gerade ziehend und fordernd. Eingriffe fühlen sich für die Pflanze jetzt härter an.', 'training_dry_air_caution');
    } else if (Number.isFinite(climate.temperatureC) && climate.temperatureC >= 30) {
      pushHint(hints, 'caution', 'Wärme macht Eingriffe gerade belastender. Etwas mehr Ruhe wäre jetzt oft sauberer.', 'training_heat_caution');
    } else if (context.phaseModel === 'vegetative' && context.health >= 65 && context.stress <= 34 && context.risk <= 40) {
      pushHint(hints, 'positive', 'Die Pflanze wirkt stabil. Leichtes Training passt in dieser Phase gut.', 'training_positive');
    }

    return hints;
  }

  function evaluateEnvironmentHints(context) {
    const hints = [];
    const climate = context.climate || {};

    if (Number.isFinite(climate.humidityPercent)
      && climate.humidityPercent >= 70
      && Number.isFinite(climate.airflowScore)
      && climate.airflowScore <= 42) {
      pushHint(hints, 'warning', 'Feuchte Luft steht gerade zu lange im Bestand. Eine Umgebungsmaßnahme ist jetzt besonders sinnvoll.', 'environment_humid_warning');
    } else if (context.phaseModel === 'late_flower'
      && Number.isFinite(climate.humidityPercent)
      && climate.humidityPercent >= 64) {
      pushHint(hints, 'caution', 'In der späten Blüte wird stehende Feuchte schneller unangenehm. Ein saubereres Klima passt jetzt gut.', 'environment_late_flower_caution');
    }

    if ((context.risk <= 28 && context.stress <= 28)
      && (!Number.isFinite(climate.humidityPercent) || climate.humidityPercent < 68)) {
      pushHint(hints, 'caution', 'Aktuell ist wenig Druck im System. Der direkte Effekt dürfte gerade eher klein sein.', 'environment_low_pressure');
    } else if (context.risk >= 55 || context.stress >= 50) {
      pushHint(hints, 'positive', 'Die Lage spricht für eine Umgebungsmaßnahme. Sie kann Druck senken, ohne die Pflanze direkt zu belasten.', 'environment_positive');
    }

    return hints;
  }

  function selectTopHints(hints, limit = 2) {
    const list = Array.isArray(hints) ? hints.slice() : [];
    const deduped = [];
    const seenKeys = new Set();

    for (const hint of list) {
      if (!hint || !hint.message) continue;
      const dedupeKey = hint.key || `${hint.severity}:${hint.message}`;
      if (seenKeys.has(dedupeKey)) continue;
      seenKeys.add(dedupeKey);
      deduped.push(hint);
    }

    return deduped
      .sort((a, b) => (b.priority - a.priority) || a.message.localeCompare(b.message, 'de'))
      .slice(0, Math.max(0, limit));
  }

  const api = Object.freeze({
    buildCareActionContext,
    evaluateWateringHints,
    evaluateFertilizingHints,
    evaluateTrainingHints,
    evaluateEnvironmentHints,
    selectTopHints,
    mapPlantProgressPhase
  });

  globalScope.GrowSimCareActionHints = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
