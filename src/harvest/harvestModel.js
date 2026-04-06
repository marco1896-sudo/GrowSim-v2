'use strict';

(function initGrowSimHarvest(globalScope) {
  const HISTORY_LIMIT = 36;
  const ANALYSIS_LIMIT = 12;
  const RECENT_SUMMARIES_LIMIT = 12;
  const RECOMPUTE_SIM_MINUTES = 5;
  const HARVEST_DELTA_THRESHOLD = 1.5;
  const QUALITY_DELTA_THRESHOLD = 2;

  const DRIVER_LABELS = Object.freeze({
    water_stable: 'Stabile Wasserführung',
    water_dry: 'Trockendruck',
    water_over: 'Überwässerung',
    nutrition_stable: 'Saubere Nährstofflage',
    nutrition_low: 'Nährstoffmangel',
    nutrition_high: 'Nährstoffdruck',
    climate_stable: 'Ruhige Klimaphase',
    airflow_recovery: 'Sauberer Luftstrom',
    high_risk: 'Erhöhtes Risiko',
    late_stress: 'Späte Stressspitzen',
    quality_locked: 'Finish-Qualität sitzt',
    quality_damage: 'Finish-Schäden',
    rescue_penalty: 'Notfallrettung nötig',
    event_gain: 'Event-Chance genutzt',
    event_loss: 'Event-Folge bremst',
    active_control: 'Aktive Kontrolle',
    overcorrection: 'Zu viel Gegensteuern',
    fragile_build: 'Fragiler Build',
    stable_build: 'Kontrolliertes Setup'
  });

  function round2(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number(value) || 0));
  }

  function clampInt(value, min, max) {
    return Math.min(max, Math.max(min, Math.trunc(Number(value) || 0)));
  }

  function smoothMetric(previous, next) {
    const prev = Number.isFinite(Number(previous)) ? Number(previous) : Number(next) || 0;
    return round2((prev * 0.72) + ((Number(next) || 0) * 0.28));
  }

  function createForecastDefaults() {
    return {
      version: 1,
      updatedAtRealMs: 0,
      simDay: 0,
      simTimeMs: 0,
      stageKey: '',
      yieldScore: 0,
      qualityScore: 0,
      stabilityScore: 0,
      efficiencyScore: 0,
      challengeScore: 0,
      harvestScore: 0,
      projectedQualityTier: 'normal',
      forecastTrend: 'stable',
      lastForecastReason: '',
      confidenceBand: 'medium',
      positiveDrivers: [],
      negativeDrivers: [],
      lockedLosses: [],
      recoveryOpportunities: [],
      contributionMap: {},
      lastSourceSignature: ''
    };
  }

  function getDefaultRunHarvest() {
    return {
      currentForecast: createForecastDefaults(),
      forecastHistory: [],
      analysisHistory: [],
      runOutcomeDraft: null,
      submissionReadiness: {
        localSummaryReady: false,
        verificationStatus: 'local_only',
        lastLocalFinalizeAtRealMs: null,
        pendingSubmission: false,
        lastVerifiedSyncAtRealMs: null
      }
    };
  }

  function getDefaultProfileHarvest() {
    return {
      bests: {
        bestHarvestScore: null,
        bestYieldScore: null,
        bestQualityScoreHarvest: null,
        bestStabilityScore: null,
        bestEfficiencyScore: null,
        bestChallengeScore: null
      },
      history: {
        lastHarvestSummary: null,
        recentHarvestSummaries: []
      }
    };
  }

  function limitArray(list, limit) {
    const safe = Array.isArray(list) ? list.filter(Boolean) : [];
    if (safe.length <= limit) return safe;
    return safe.slice(safe.length - limit);
  }

  function normalizeDriver(item) {
    if (!item || typeof item !== 'object') return null;
    return {
      id: String(item.id || 'driver'),
      label: String(item.label || DRIVER_LABELS[String(item.id || '')] || 'Treiber'),
      impact: round2(Number(item.impact) || 0),
      reason: String(item.reason || ''),
      sourceType: String(item.sourceType || 'system'),
      actionCategory: item.actionCategory ? String(item.actionCategory) : ''
    };
  }

  function normalizeLoss(item) {
    if (!item || typeof item !== 'object') return null;
    return {
      id: String(item.id || 'loss'),
      label: String(item.label || 'Verlust'),
      severity: clampInt(item.severity, 1, 5),
      reason: String(item.reason || ''),
      causedAtPhase: String(item.causedAtPhase || '')
    };
  }

  function normalizeOpportunity(item) {
    if (!item || typeof item !== 'object') return null;
    return {
      id: String(item.id || 'opportunity'),
      label: String(item.label || 'Chance'),
      estimatedGainMin: round2(Number(item.estimatedGainMin) || 0),
      estimatedGainMax: round2(Number(item.estimatedGainMax) || 0),
      reason: String(item.reason || ''),
      actionCategory: String(item.actionCategory || 'environment')
    };
  }

  function normalizeForecast(forecastLike) {
    const defaults = createForecastDefaults();
    const forecast = forecastLike && typeof forecastLike === 'object' ? forecastLike : {};
    return {
      ...defaults,
      ...forecast,
      updatedAtRealMs: Number.isFinite(Number(forecast.updatedAtRealMs)) ? Number(forecast.updatedAtRealMs) : 0,
      simDay: Math.max(0, Math.trunc(Number(forecast.simDay) || 0)),
      simTimeMs: Math.max(0, Number(forecast.simTimeMs) || 0),
      stageKey: String(forecast.stageKey || ''),
      yieldScore: round2(clamp(forecast.yieldScore, 0, 100)),
      qualityScore: round2(clamp(forecast.qualityScore, 0, 100)),
      stabilityScore: round2(clamp(forecast.stabilityScore, 0, 100)),
      efficiencyScore: round2(clamp(forecast.efficiencyScore, 0, 100)),
      challengeScore: round2(clamp(forecast.challengeScore, 0, 100)),
      harvestScore: round2(clamp(forecast.harvestScore, 0, 100)),
      projectedQualityTier: String(forecast.projectedQualityTier || 'normal'),
      forecastTrend: ['rising', 'falling', 'stable'].includes(String(forecast.forecastTrend))
        ? String(forecast.forecastTrend)
        : 'stable',
      lastForecastReason: typeof forecast.lastForecastReason === 'string' ? forecast.lastForecastReason : '',
      confidenceBand: ['low', 'medium', 'high'].includes(String(forecast.confidenceBand))
        ? String(forecast.confidenceBand)
        : 'medium',
      positiveDrivers: limitArray((forecast.positiveDrivers || []).map(normalizeDriver).filter(Boolean), 4),
      negativeDrivers: limitArray((forecast.negativeDrivers || []).map(normalizeDriver).filter(Boolean), 4),
      lockedLosses: limitArray((forecast.lockedLosses || []).map(normalizeLoss).filter(Boolean), 4),
      recoveryOpportunities: limitArray((forecast.recoveryOpportunities || []).map(normalizeOpportunity).filter(Boolean), 4),
      contributionMap: forecast.contributionMap && typeof forecast.contributionMap === 'object' ? { ...forecast.contributionMap } : {},
      lastSourceSignature: typeof forecast.lastSourceSignature === 'string' ? forecast.lastSourceSignature : ''
    };
  }

  function normalizeRunHarvest(runHarvestLike) {
    const defaults = getDefaultRunHarvest();
    const value = runHarvestLike && typeof runHarvestLike === 'object' ? runHarvestLike : {};
    return {
      currentForecast: normalizeForecast(value.currentForecast),
      forecastHistory: limitArray(Array.isArray(value.forecastHistory) ? value.forecastHistory.map((entry) => ({
        updatedAtRealMs: Number.isFinite(Number(entry && entry.updatedAtRealMs)) ? Number(entry.updatedAtRealMs) : 0,
        simDay: Math.max(0, Math.trunc(Number(entry && entry.simDay) || 0)),
        simTimeMs: Math.max(0, Number(entry && entry.simTimeMs) || 0),
        harvestScore: round2(clamp(entry && entry.harvestScore, 0, 100)),
        qualityScore: round2(clamp(entry && entry.qualityScore, 0, 100)),
        trend: ['rising', 'falling', 'stable'].includes(String(entry && entry.trend)) ? String(entry.trend) : 'stable',
        reason: String(entry && entry.reason || '')
      })) : [], HISTORY_LIMIT),
      analysisHistory: limitArray(Array.isArray(value.analysisHistory) ? value.analysisHistory.map((entry) => ({
        updatedAtRealMs: Number.isFinite(Number(entry && entry.updatedAtRealMs)) ? Number(entry.updatedAtRealMs) : 0,
        reason: String(entry && entry.reason || ''),
        harvestScore: round2(clamp(entry && entry.harvestScore, 0, 100)),
        qualityScore: round2(clamp(entry && entry.qualityScore, 0, 100))
      })) : [], ANALYSIS_LIMIT),
      runOutcomeDraft: value.runOutcomeDraft && typeof value.runOutcomeDraft === 'object' ? { ...value.runOutcomeDraft } : null,
      submissionReadiness: {
        ...defaults.submissionReadiness,
        ...(value.submissionReadiness && typeof value.submissionReadiness === 'object' ? value.submissionReadiness : {})
      }
    };
  }

  function normalizeProfileHarvest(profileHarvestLike) {
    const value = profileHarvestLike && typeof profileHarvestLike === 'object' ? profileHarvestLike : {};
    const bests = value.bests && typeof value.bests === 'object' ? value.bests : {};
    const history = value.history && typeof value.history === 'object' ? value.history : {};
    return {
      bests: {
        bestHarvestScore: Number.isFinite(Number(bests.bestHarvestScore)) ? round2(Number(bests.bestHarvestScore)) : null,
        bestYieldScore: Number.isFinite(Number(bests.bestYieldScore)) ? round2(Number(bests.bestYieldScore)) : null,
        bestQualityScoreHarvest: Number.isFinite(Number(bests.bestQualityScoreHarvest)) ? round2(Number(bests.bestQualityScoreHarvest)) : null,
        bestStabilityScore: Number.isFinite(Number(bests.bestStabilityScore)) ? round2(Number(bests.bestStabilityScore)) : null,
        bestEfficiencyScore: Number.isFinite(Number(bests.bestEfficiencyScore)) ? round2(Number(bests.bestEfficiencyScore)) : null,
        bestChallengeScore: Number.isFinite(Number(bests.bestChallengeScore)) ? round2(Number(bests.bestChallengeScore)) : null
      },
      history: {
        lastHarvestSummary: history.lastHarvestSummary && typeof history.lastHarvestSummary === 'object' ? { ...history.lastHarvestSummary } : null,
        recentHarvestSummaries: limitArray(Array.isArray(history.recentHarvestSummaries) ? history.recentHarvestSummaries.map((entry) => ({ ...entry })) : [], RECENT_SUMMARIES_LIMIT)
      }
    };
  }

  function scoreQualityTier(score) {
    if (score >= 88) return 'perfect';
    if (score < 64) return 'degraded';
    return 'normal';
  }

  function qualityTierLabel(tier) {
    if (tier === 'perfect') return 'A';
    if (tier === 'degraded') return 'C';
    return 'B';
  }

  function buildSetupSignature(setupLike) {
    const setup = setupLike && typeof setupLike === 'object' ? setupLike : {};
    return [
      String(setup.mode || ''),
      String(setup.light || ''),
      String(setup.medium || ''),
      String(setup.potSize || ''),
      String(setup.genetics || '')
    ].join(':');
  }

  function getSetupBaseline(setupLike) {
    const setup = setupLike && typeof setupLike === 'object' ? setupLike : {};
    let base = 68;
    if (String(setup.genetics || '') === 'sativa') base += 7;
    if (String(setup.genetics || '') === 'indica') base -= 2;
    if (String(setup.light || '') === 'high') base += 8;
    if (String(setup.medium || '') === 'coco') base += 5;
    if (String(setup.potSize || '') === 'large') base += 5;
    if (String(setup.potSize || '') === 'xlarge') base += 8;
    if (String(setup.potSize || '') === 'small') base -= 4;
    if (String(setup.mode || '') === 'outdoor') base += 2;
    return clamp(base, 50, 92);
  }

  function getChallengeScore(setupLike) {
    const setup = setupLike && typeof setupLike === 'object' ? setupLike : {};
    let value = 18;
    if (String(setup.genetics || '') === 'sativa') value += 18;
    if (String(setup.light || '') === 'high') value += 18;
    if (String(setup.medium || '') === 'coco') value += 10;
    if (String(setup.potSize || '') === 'small') value += 8;
    if (String(setup.mode || '') === 'outdoor') value += 10;
    return round2(clamp(value, 0, 100));
  }

  function buildSourceSignature(stateLike) {
    const state = stateLike && typeof stateLike === 'object' ? stateLike : {};
    const simulation = state.simulation && typeof state.simulation === 'object' ? state.simulation : {};
    const plant = state.plant && typeof state.plant === 'object' ? state.plant : {};
    const status = state.status && typeof state.status === 'object' ? state.status : {};
    const environment = state.climate && typeof state.climate === 'object' ? state.climate : {};
    const history = state.history && typeof state.history === 'object' ? state.history : {};
    const simBucket = Math.floor((Number(simulation.simTimeMs) || 0) / (RECOMPUTE_SIM_MINUTES * 60 * 1000));
    return [
      simBucket,
      Math.round(Number(status.health) || 0),
      Math.round(Number(status.stress) || 0),
      Math.round(Number(status.water) || 0),
      Math.round(Number(status.nutrition) || 0),
      Math.round(Number(status.risk) || 0),
      Math.round(Number(status.growth) || 0),
      String(plant.stageKey || ''),
      String(plant.lifecycle && plant.lifecycle.qualityTier || ''),
      Math.round(Number(plant.lifecycle && plant.lifecycle.qualityScore) || 0),
      Math.round(Number(environment.tent && environment.tent.airflowScore || environment.airflowScore) || 0),
      Array.isArray(history.actions) ? history.actions.length : 0,
      Array.isArray(history.events) ? history.events.length : 0,
      Array.isArray(history.system) ? history.system.length : 0
    ].join('|');
  }

  function getStableRate(entries, min, max) {
    const safe = Array.isArray(entries) ? entries.filter((value) => Number.isFinite(Number(value))) : [];
    if (!safe.length) return 0.55;
    const good = safe.filter((value) => Number(value) >= min && Number(value) <= max).length;
    return clamp(good / safe.length, 0, 1);
  }

  function collectRecentValues(historyEntries, key) {
    const values = [];
    for (const entry of Array.isArray(historyEntries) ? historyEntries : []) {
      const delta = entry && typeof entry === 'object'
        ? (entry.deltaSummary || entry.effectsApplied || (entry.details && entry.details.effectsApplied) || {})
        : {};
      if (Object.prototype.hasOwnProperty.call(delta, key)) {
        values.push(Number(delta[key]) || 0);
      }
    }
    return values;
  }

  function stripSignedImpact(item) {
    return {
      id: item.id,
      label: item.label,
      impact: round2(item.impact),
      reason: item.reason,
      sourceType: item.sourceType
    };
  }

  function buildDriverReason(id, stateLike) {
    const plant = stateLike.plant && typeof stateLike.plant === 'object' ? stateLike.plant : {};
    switch (id) {
      case 'water_stable': return 'Die Wurzelzone wirkt gerade lesbar und stabil, das trägt Forecast und Qualität.';
      case 'water_dry': return 'Trockenstress frisst gerade Kontrolle und drückt das erwartete Finish.';
      case 'water_over': return 'Zu viel Feuchte erhöht Wurzeldruck und macht spätere Verluste wahrscheinlicher.';
      case 'nutrition_stable': return 'Die Nährstofflage bleibt sauber genug, um Wachstum ohne unnötigen Druck zu tragen.';
      case 'nutrition_low': return 'Unterversorgung bremst aktuell Ertragspotenzial und Aufbau.';
      case 'nutrition_high': return 'Zu viel Nährstoffdruck erhöht die Gefahr von Qualitätseinbußen.';
      case 'climate_stable': return 'Eine ruhige Klimaphase reduziert Fehlerdruck und stabilisiert den Forecast.';
      case 'airflow_recovery': return 'Guter Luftstrom entlastet Bestand und Finish.';
      case 'high_risk': return 'Das Risiko bleibt zu hoch und verkleinert den Spielraum für ein sauberes Ende.';
      case 'late_stress': return 'Stress in späteren Phasen trifft Qualität und Finish deutlich stärker.';
      case 'quality_locked': return 'Die Abschlussqualität sitzt aktuell ungewöhnlich sauber für diese Phase.';
      case 'quality_damage': return 'Bereits entstandene Schäden begrenzen das restliche Potenzial spürbar.';
      case 'rescue_penalty': return 'Die Notfallrettung hält den Run am Leben, kostet aber Stabilität und Vertrauen ins Finish.';
      case 'event_gain': return 'Eine Event-Reaktion hat dem Run zuletzt klar geholfen.';
      case 'event_loss': return 'Eine Event-Folge wirkt noch nach und bremst Ertrag oder Qualität.';
      case 'active_control': return 'Die letzten Eingriffe wirken eher wie saubere Kontrolle als wie Hektik.';
      case 'overcorrection': return 'Mehrfaches Gegensteuern kostet Effizienz und macht den Run unruhig.';
      case 'fragile_build': return `Das Build um ${String(plant.stageKey || 'diese Phase')} hat hohes Potenzial, verlangt aber saubere Führung.`;
      case 'stable_build': return 'Das Setup trägt solide, gibt aber weniger Peak als riskantere Builds.';
      default: return 'Dieser Faktor verschiebt die aktuelle lokale Prognose spürbar.';
    }
  }

  function buildLockedLosses(stateLike) {
    const state = stateLike && typeof stateLike === 'object' ? stateLike : {};
    const status = state.status && typeof state.status === 'object' ? state.status : {};
    const plant = state.plant && typeof state.plant === 'object' ? state.plant : {};
    const losses = [];
    if (Number(status.health) < 42 && Number(plant.stageIndex) >= 7) {
      losses.push({
        id: 'late_health_damage',
        label: 'Späte Gesundheitsschäden',
        severity: 4,
        reason: 'Späte Gesundheitsverluste lassen sich nur teilweise zurückholen.',
        causedAtPhase: String(plant.phase || '')
      });
    }
    if (Number(plant.averageStress) > 44 && Number(plant.stageIndex) >= 6) {
      losses.push({
        id: 'finish_stress_damage',
        label: 'Finish unter Druck',
        severity: 3,
        reason: 'Anhaltender Stress in Blüte- und Finish-Phasen kostet dauerhaft Qualität.',
        causedAtPhase: String(plant.phase || '')
      });
    }
    if (state.meta && state.meta.rescue && state.meta.rescue.used) {
      losses.push({
        id: 'rescue_trace',
        label: 'Rettungsnarben im Run',
        severity: 2,
        reason: 'Die Rettung bewahrt den Run, markiert aber bereits verlorene Stabilität.',
        causedAtPhase: String(plant.phase || '')
      });
    }
    return losses.slice(0, 3);
  }

  function buildRecoveryOpportunities(stateLike, metrics) {
    const state = stateLike && typeof stateLike === 'object' ? stateLike : {};
    const status = state.status && typeof state.status === 'object' ? state.status : {};
    const climate = state.climate && typeof state.climate === 'object' ? state.climate : {};
    const opportunities = [];
    const water = clamp(Number(status.water) || 0, 0, 100);
    const nutrition = clamp(Number(status.nutrition) || 0, 0, 100);
    const stress = clamp(Number(status.stress) || 0, 0, 100);
    const risk = clamp(Number(status.risk) || 0, 0, 100);
    const instability = clamp(Number(climate.tent && climate.tent.instabilityScore || climate.instabilityScore) || 0, 0, 100);

    if (instability > 34 || risk > 42) {
      opportunities.push({
        id: 'stabilize_climate',
        label: 'Klima beruhigen',
        estimatedGainMin: 3,
        estimatedGainMax: 6,
        reason: 'Eine ruhigere Klimaphase würde Risiko, Stress und Finish-Druck gleichzeitig senken.',
        actionCategory: 'environment'
      });
    }
    if (water < 42) {
      opportunities.push({
        id: 'restore_water_window',
        label: 'Wasserfenster zurückholen',
        estimatedGainMin: 2,
        estimatedGainMax: 5,
        reason: 'Mehr Wasserkontrolle stabilisiert Ertrag, wenn keine neue Überfeuchtung entsteht.',
        actionCategory: 'watering'
      });
    } else if (water > 80) {
      opportunities.push({
        id: 'relieve_root_zone',
        label: 'Wurzelzone entlasten',
        estimatedGainMin: 2,
        estimatedGainMax: 4,
        reason: 'Weniger Feuchtedruck kann verlorene Kontrolle teilweise zurückholen.',
        actionCategory: 'environment'
      });
    }
    if (nutrition < 40 || nutrition > 78) {
      opportunities.push({
        id: 'normalize_feed',
        label: 'Nährstofflage glätten',
        estimatedGainMin: 2,
        estimatedGainMax: 4,
        reason: 'Eine ruhigere Feed-Lage hilft Qualität und reduziert unnötigen Druck.',
        actionCategory: 'fertilizing'
      });
    }
    if (stress > 48 || metrics.stabilityScore < 60) {
      opportunities.push({
        id: 'reduce_stress',
        label: 'Stress zuerst senken',
        estimatedGainMin: 3,
        estimatedGainMax: 5,
        reason: 'Weniger Stress bringt mehr als kurzfristiges Pushen von Output.',
        actionCategory: 'environment'
      });
    }

    return opportunities.slice(0, 3);
  }

  function buildConfidenceBand(stateLike) {
    const state = stateLike && typeof stateLike === 'object' ? stateLike : {};
    const history = state.history && typeof state.history === 'object' ? state.history : {};
    const actions = Array.isArray(history.actions) ? history.actions.length : 0;
    const events = Array.isArray(history.events) ? history.events.length : 0;
    const stageIndex = Number(state.plant && state.plant.stageIndex) || 0;
    if (stageIndex >= 8 && (actions + events) >= 12) return 'high';
    if (stageIndex >= 4 && (actions + events) >= 6) return 'medium';
    return 'low';
  }

  function buildMetricDrivers(stateLike, metrics, setupBaseline) {
    const state = stateLike && typeof stateLike === 'object' ? stateLike : {};
    const status = state.status && typeof state.status === 'object' ? state.status : {};
    const plant = state.plant && typeof state.plant === 'object' ? state.plant : {};
    const climate = state.climate && typeof state.climate === 'object' ? state.climate : {};
    const history = state.history && typeof state.history === 'object' ? state.history : {};
    const rescueUsed = Boolean(state.meta && state.meta.rescue && state.meta.rescue.used);
    const water = clamp(Number(status.water) || 0, 0, 100);
    const nutrition = clamp(Number(status.nutrition) || 0, 0, 100);
    const stress = clamp(Number(status.stress) || 0, 0, 100);
    const risk = clamp(Number(status.risk) || 0, 0, 100);
    const growth = clamp(Number(status.growth) || 0, 0, 100);
    const avgStress = clamp(Number(plant.averageStress) || stress, 0, 100);
    const avgHealth = clamp(Number(plant.averageHealth) || Number(status.health) || 0, 0, 100);
    const airflow = clamp(Number(climate.tent && climate.tent.airflowScore || climate.airflowScore) || 55, 0, 100);
    const instability = clamp(Number(climate.tent && climate.tent.instabilityScore || climate.instabilityScore) || 30, 0, 100);
    const recentActions = Array.isArray(history.actions) ? history.actions.slice(-8) : [];
    const recentEvents = Array.isArray(history.events) ? history.events.slice(-6) : [];

    const contributions = {
      water_stable: 0,
      water_dry: 0,
      water_over: 0,
      nutrition_stable: 0,
      nutrition_low: 0,
      nutrition_high: 0,
      climate_stable: 0,
      airflow_recovery: 0,
      high_risk: 0,
      late_stress: 0,
      quality_locked: 0,
      quality_damage: 0,
      rescue_penalty: 0,
      event_gain: 0,
      event_loss: 0,
      active_control: 0,
      overcorrection: 0,
      fragile_build: 0,
      stable_build: 0
    };

    if (water >= 48 && water <= 74) contributions.water_stable += 2.8;
    if (water < 35) contributions.water_dry -= 4.1;
    if (water > 82) contributions.water_over -= 4.2;
    if (nutrition >= 46 && nutrition <= 74) contributions.nutrition_stable += 2.2;
    if (nutrition < 34) contributions.nutrition_low -= 3.4;
    if (nutrition > 80) contributions.nutrition_high -= 3.1;
    if (instability <= 30) contributions.climate_stable += 2.6;
    if (airflow >= 70) contributions.airflow_recovery += 1.7;
    if (risk >= 60) contributions.high_risk -= 4.2;
    if (avgStress >= 48 || stress >= 60) contributions.late_stress -= 4.5;
    if (plant.lifecycle && plant.lifecycle.qualityLocked) contributions.quality_locked += 2.8;
    if ((metrics.lockedLosses || []).length) contributions.quality_damage -= 3.2;
    if (rescueUsed) contributions.rescue_penalty -= 3.6;

    const positiveEvents = recentEvents.filter((entry) => {
      const delta = entry.effectsApplied || entry.deltaSummary || {};
      return (Number(delta.health) || 0) > 0 || (Number(delta.stress) || 0) < 0 || (Number(delta.risk) || 0) < 0;
    }).length;
    const negativeEvents = recentEvents.filter((entry) => {
      const delta = entry.effectsApplied || entry.deltaSummary || {};
      return (Number(delta.health) || 0) < 0 || (Number(delta.stress) || 0) > 0 || (Number(delta.risk) || 0) > 0;
    }).length;
    contributions.event_gain += positiveEvents * 0.8;
    contributions.event_loss -= negativeEvents * 0.9;

    if (recentActions.length >= 3 && avgHealth >= 68 && growth >= 30) contributions.active_control += 1.4;
    if (recentActions.length >= 7 && (stress >= 42 || risk >= 42)) contributions.overcorrection -= 1.8;
    if (setupBaseline >= 78) contributions.fragile_build += 1.2;
    if (setupBaseline <= 68) contributions.stable_build += 1.2;

    const drivers = Object.entries(contributions)
      .filter(([, value]) => Math.abs(Number(value) || 0) >= 1)
      .map(([id, value]) => ({
        id,
        label: DRIVER_LABELS[id] || id,
        impact: round2(Math.abs(Number(value) || 0)),
        signedImpact: round2(Number(value) || 0),
        reason: buildDriverReason(id, state),
        sourceType: id.startsWith('event_') ? 'event' : (id.includes('build') ? 'setup' : 'simulation')
      }))
      .sort((left, right) => Math.abs(right.signedImpact) - Math.abs(left.signedImpact));

    return {
      contributionMap: contributions,
      positiveDrivers: drivers.filter((item) => item.signedImpact > 0).slice(0, 3).map(stripSignedImpact),
      negativeDrivers: drivers.filter((item) => item.signedImpact < 0).slice(0, 3).map(stripSignedImpact)
    };
  }

  function calculateMetrics(stateLike) {
    const state = stateLike && typeof stateLike === 'object' ? stateLike : {};
    const status = state.status && typeof state.status === 'object' ? state.status : {};
    const plant = state.plant && typeof state.plant === 'object' ? state.plant : {};
    const simulation = state.simulation && typeof state.simulation === 'object' ? state.simulation : {};
    const history = state.history && typeof state.history === 'object' ? state.history : {};
    const run = state.run && typeof state.run === 'object' ? state.run : {};
    const setup = state.setup && typeof state.setup === 'object'
      ? state.setup
      : (run.setupSnapshot && typeof run.setupSnapshot === 'object' ? run.setupSnapshot : {});

    const setupBaseline = getSetupBaseline(setup);
    const challengeScore = getChallengeScore(setup);
    const simDay = Math.max(0, Math.trunc(Number(simulation.simDay) || 0));
    const stageIndex = clampInt(Number(plant.stageIndex) || 0, 0, 11);
    const stageProgress = clamp(Number(plant.stageProgress) || 0, 0, 1);
    const stageCompletion = clamp((stageIndex + stageProgress + 1) / 12, 0.08, 1);
    const growth = clamp(Number(status.growth) || 0, 0, 100);
    const avgHealth = clamp(Number(plant.averageHealth) || Number(status.health) || 0, 0, 100);
    const avgStress = clamp(Number(plant.averageStress) || Number(status.stress) || 0, 0, 100);
    const water = clamp(Number(status.water) || 0, 0, 100);
    const nutrition = clamp(Number(status.nutrition) || 0, 0, 100);
    const risk = clamp(Number(status.risk) || 0, 0, 100);
    const qualityBase = clamp(Number(plant.lifecycle && plant.lifecycle.qualityScore) || 0, 0, 100);

    const waterDeltas = collectRecentValues(history.actions, 'water').concat(collectRecentValues(history.events, 'water'));
    const nutritionDeltas = collectRecentValues(history.actions, 'nutrition').concat(collectRecentValues(history.events, 'nutrition'));
    const waterStability = getStableRate(waterDeltas, -8, 8);
    const nutritionStability = getStableRate(nutritionDeltas, -7, 7);
    const lowStressRate = clamp((100 - avgStress) / 100, 0, 1);
    const lowRiskRate = clamp((100 - risk) / 100, 0, 1);
    const lockedLosses = buildLockedLosses(state);
    const lockedPenalty = clamp(lockedLosses.reduce((sum, item) => sum + (Number(item.severity) || 0), 0) * 0.05, 0, 0.28);
    const rescuePenalty = state.meta && state.meta.rescue && state.meta.rescue.used ? 0.08 : 0;
    const majorStressPenalty = clamp((Math.max(avgStress - 38, 0) / 100) + (Math.max(risk - 52, 0) / 120), 0, 0.35);

    const yieldRaw = setupBaseline
      * stageCompletion
      * clamp((growth / 100) * 0.7 + (avgHealth / 100) * 0.3, 0.35, 1.1)
      * (1 - lockedPenalty)
      * (1 - rescuePenalty)
      * (1 - majorStressPenalty);
    const yieldScore = round2(clamp((yieldRaw / Math.max(setupBaseline * 0.82, 1)) * 100, 0, 100));

    const qualityScore = round2(clamp(
      (qualityBase * 0.68)
      + (avgHealth * 0.18)
      + (lowStressRate * 14)
      - (lockedLosses.length * 4.2)
      - (Math.max(risk - 58, 0) * 0.08),
      0,
      100
    ));

    const stabilityScore = round2(clamp(
      (avgHealth * 0.35)
      + (lowStressRate * 100 * 0.20)
      + (lowRiskRate * 100 * 0.20)
      + (waterStability * 100 * 0.15)
      + (nutritionStability * 100 * 0.10)
      - ((state.meta && state.meta.rescue && state.meta.rescue.used) ? 10 : 0),
      0,
      100
    ));

    const actionsCount = Array.isArray(history.actions) ? history.actions.length : 0;
    const overcorrectionPenalty = clamp(Math.max(actionsCount - (simDay * 0.55 + 4), 0) * 1.8, 0, 18);
    const wastePenalty = clamp((Math.max(water - 84, 0) * 0.18) + (Math.max(nutrition - 82, 0) * 0.14), 0, 14);
    const outputEfficiency = clamp((yieldScore * 0.55) + (qualityScore * 0.20) + (stabilityScore * 0.25), 0, 100);
    const efficiencyScore = round2(clamp(outputEfficiency - overcorrectionPenalty - wastePenalty, 0, 100));

    const yieldEffective = Math.min(
      yieldScore,
      72 + (0.50 * qualityScore),
      74 + (0.45 * stabilityScore)
    );

    const harvestScore = round2(clamp(
      (0.30 * yieldEffective)
      + (0.27 * qualityScore)
      + (0.22 * stabilityScore)
      + (0.16 * efficiencyScore)
      + (0.05 * challengeScore),
      0,
      100
    ));

    const metrics = {
      simDay,
      simTimeMs: Math.max(0, Number(simulation.simTimeMs) || 0),
      stageKey: String(plant.stageKey || ''),
      setupSignature: buildSetupSignature(setup),
      yieldScore,
      qualityScore,
      stabilityScore,
      efficiencyScore,
      challengeScore,
      harvestScore,
      projectedQualityTier: scoreQualityTier(qualityScore),
      lockedLosses,
      confidenceBand: buildConfidenceBand(state)
    };

    const driverBundle = buildMetricDrivers(state, metrics, setupBaseline);
    return {
      ...metrics,
      positiveDrivers: driverBundle.positiveDrivers,
      negativeDrivers: driverBundle.negativeDrivers,
      recoveryOpportunities: buildRecoveryOpportunities(state, metrics),
      contributionMap: driverBundle.contributionMap
    };
  }

  function determineTrend(historyLike, nextForecast) {
    const history = Array.isArray(historyLike) ? historyLike : [];
    const points = history.slice(-3).concat([{ harvestScore: nextForecast.harvestScore }]);
    if (points.length < 3) return 'stable';
    const delta = Number(points[points.length - 1].harvestScore || 0) - Number(points[0].harvestScore || 0);
    if (delta >= 1.8) return 'rising';
    if (delta <= -1.8) return 'falling';
    return 'stable';
  }

  function buildForecastReason(previousForecast, nextMetrics) {
    const previousMap = previousForecast && previousForecast.contributionMap && typeof previousForecast.contributionMap === 'object'
      ? previousForecast.contributionMap
      : {};
    const nextMap = nextMetrics && nextMetrics.contributionMap && typeof nextMetrics.contributionMap === 'object'
      ? nextMetrics.contributionMap
      : {};
    let bestId = '';
    let bestDelta = 0;
    for (const key of Object.keys(nextMap)) {
      const delta = Number(nextMap[key] || 0) - Number(previousMap[key] || 0);
      if (Math.abs(delta) > Math.abs(bestDelta)) {
        bestDelta = delta;
        bestId = key;
      }
    }
    if (!bestId) {
      return previousForecast && previousForecast.lastForecastReason
        ? String(previousForecast.lastForecastReason)
        : 'Die Prognose bleibt aktuell vergleichsweise stabil.';
    }
    if (bestDelta > 0) {
      return `${DRIVER_LABELS[bestId] || 'Treiber'} stärkt die Prognose.`;
    }
    if (bestId === 'late_stress') {
      return 'Späte Stressspitzen drücken gerade Finish und Qualität.';
    }
    if (bestId === 'high_risk') {
      return 'Erhöhtes Risiko verkleinert gerade das sichere Erntefenster.';
    }
    return `${DRIVER_LABELS[bestId] || 'Treiber'} bremst die Prognose.`;
  }

  function shouldStoreHistory(previousForecast, nextForecast, previousRunHarvest) {
    const previous = previousForecast && typeof previousForecast === 'object' ? previousForecast : createForecastDefaults();
    const next = nextForecast && typeof nextForecast === 'object' ? nextForecast : createForecastDefaults();
    if (!previous.updatedAtRealMs) return true;
    if (Math.abs((Number(next.harvestScore) || 0) - (Number(previous.harvestScore) || 0)) >= HARVEST_DELTA_THRESHOLD) return true;
    if (Math.abs((Number(next.qualityScore) || 0) - (Number(previous.qualityScore) || 0)) >= QUALITY_DELTA_THRESHOLD) return true;
    if (String(next.forecastTrend || '') !== String(previous.forecastTrend || '')) return true;
    const lastEntry = Array.isArray(previousRunHarvest && previousRunHarvest.forecastHistory)
      ? previousRunHarvest.forecastHistory[previousRunHarvest.forecastHistory.length - 1]
      : null;
    if (!lastEntry) return true;
    return Math.abs((Number(next.simTimeMs) || 0) - (Number(lastEntry.simTimeMs) || 0)) >= (18 * 60 * 1000);
  }

  function buildHistoryEntry(forecast) {
    return {
      updatedAtRealMs: Number(forecast.updatedAtRealMs || 0),
      simDay: Math.max(0, Math.trunc(Number(forecast.simDay) || 0)),
      simTimeMs: Math.max(0, Number(forecast.simTimeMs) || 0),
      harvestScore: round2(Number(forecast.harvestScore) || 0),
      qualityScore: round2(Number(forecast.qualityScore) || 0),
      trend: String(forecast.forecastTrend || 'stable'),
      reason: String(forecast.lastForecastReason || '')
    };
  }

  function updateHarvestForecast(snapshot, options = {}) {
    const state = snapshot && typeof snapshot === 'object' ? snapshot : {};
    if (!state.run || typeof state.run !== 'object') return null;
    state.run.harvest = normalizeRunHarvest(state.run.harvest);
    const runHarvest = state.run.harvest;
    const previous = normalizeForecast(runHarvest.currentForecast);
    const signature = buildSourceSignature(state);
    if (!options.force && previous.lastSourceSignature === signature) {
      return previous;
    }

    const metrics = calculateMetrics(state);
    const next = normalizeForecast({
      ...previous,
      ...metrics,
      updatedAtRealMs: Number.isFinite(Number(options.nowMs)) ? Number(options.nowMs) : Date.now(),
      lastSourceSignature: signature
    });

    next.yieldScore = smoothMetric(previous.yieldScore, next.yieldScore);
    next.qualityScore = smoothMetric(previous.qualityScore, next.qualityScore);
    next.stabilityScore = smoothMetric(previous.stabilityScore, next.stabilityScore);
    next.efficiencyScore = smoothMetric(previous.efficiencyScore, next.efficiencyScore);
    next.challengeScore = smoothMetric(previous.challengeScore, next.challengeScore);
    next.harvestScore = smoothMetric(previous.harvestScore, next.harvestScore);
    next.projectedQualityTier = scoreQualityTier(next.qualityScore);
    next.lastForecastReason = buildForecastReason(previous, next);
    next.forecastTrend = determineTrend(runHarvest.forecastHistory, next);

    if (shouldStoreHistory(previous, next, runHarvest)) {
      runHarvest.forecastHistory = limitArray(runHarvest.forecastHistory.concat([buildHistoryEntry(next)]), HISTORY_LIMIT);
    }
    if (!runHarvest.analysisHistory.length || runHarvest.analysisHistory[runHarvest.analysisHistory.length - 1].reason !== next.lastForecastReason) {
      runHarvest.analysisHistory = limitArray(runHarvest.analysisHistory.concat([{
        updatedAtRealMs: next.updatedAtRealMs,
        reason: next.lastForecastReason,
        harvestScore: next.harvestScore,
        qualityScore: next.qualityScore
      }]), ANALYSIS_LIMIT);
    }
    runHarvest.currentForecast = next;
    return next;
  }

  function buildLocalHarvestInterpretation(summary) {
    const safe = summary && typeof summary === 'object' ? summary : {};
    if (Number(safe.harvestScore) >= 84) return 'Sehr sauberer lokaler Abschluss mit starkem Finish und stabiler Linie.';
    if (Number(safe.harvestScore) >= 72) return 'Guter lokaler Harvest-Abschluss. Ein paar Hebel hätten noch mehr Peak freigelegt.';
    if (Number(safe.harvestScore) >= 58) return 'Solider lokaler Abschluss, aber der Run hat unterwegs spürbar Potenzial liegen lassen.';
    return 'Die lokale Auswertung zeigt einen schwierigen Abschluss mit klaren Bremsen im Run-Verlauf.';
  }

  function resolveBestFlags(profileHarvestLike, summary) {
    const harvest = normalizeProfileHarvest(profileHarvestLike);
    const bests = harvest.bests;
    return {
      bestHarvestScore: !Number.isFinite(Number(bests.bestHarvestScore)) || Number(summary.harvestScore) > Number(bests.bestHarvestScore),
      bestYieldScore: !Number.isFinite(Number(bests.bestYieldScore)) || Number(summary.yieldScore) > Number(bests.bestYieldScore),
      bestQualityScoreHarvest: !Number.isFinite(Number(bests.bestQualityScoreHarvest)) || Number(summary.qualityScore) > Number(bests.bestQualityScoreHarvest),
      bestStabilityScore: !Number.isFinite(Number(bests.bestStabilityScore)) || Number(summary.stabilityScore) > Number(bests.bestStabilityScore),
      bestEfficiencyScore: !Number.isFinite(Number(bests.bestEfficiencyScore)) || Number(summary.efficiencyScore) > Number(bests.bestEfficiencyScore),
      bestChallengeScore: !Number.isFinite(Number(bests.bestChallengeScore)) || Number(summary.challengeScore) > Number(bests.bestChallengeScore)
    };
  }

  function updateProfileHarvestBests(profileLike, summaryLike) {
    const profile = profileLike && typeof profileLike === 'object' ? profileLike : {};
    profile.harvest = normalizeProfileHarvest(profile.harvest);
    const summary = summaryLike && typeof summaryLike === 'object' ? summaryLike : null;
    if (!summary) return profile.harvest;

    const flags = resolveBestFlags(profile.harvest, summary);
    if (flags.bestHarvestScore) profile.harvest.bests.bestHarvestScore = round2(Number(summary.harvestScore) || 0);
    if (flags.bestYieldScore) profile.harvest.bests.bestYieldScore = round2(Number(summary.yieldScore) || 0);
    if (flags.bestQualityScoreHarvest) profile.harvest.bests.bestQualityScoreHarvest = round2(Number(summary.qualityScore) || 0);
    if (flags.bestStabilityScore) profile.harvest.bests.bestStabilityScore = round2(Number(summary.stabilityScore) || 0);
    if (flags.bestEfficiencyScore) profile.harvest.bests.bestEfficiencyScore = round2(Number(summary.efficiencyScore) || 0);
    if (flags.bestChallengeScore) profile.harvest.bests.bestChallengeScore = round2(Number(summary.challengeScore) || 0);
    profile.harvest.history.lastHarvestSummary = { ...summary };
    profile.harvest.history.recentHarvestSummaries = limitArray(profile.harvest.history.recentHarvestSummaries.concat([{
      runId: summary.runId,
      endedAtRealMs: summary.endedAtRealMs,
      endReason: summary.endReason,
      harvestScore: summary.harvestScore,
      qualityScore: summary.qualityScore,
      stageLabel: summary.stageLabel,
      bestFlags: flags
    }]), RECENT_SUMMARIES_LIMIT);
    return profile.harvest;
  }

  function buildRunHarvestSummary(stateLike, reason, nowMs, baseSummary = null) {
    const state = stateLike && typeof stateLike === 'object' ? stateLike : {};
    const forecast = updateHarvestForecast(state, { force: true, nowMs });
    const summary = baseSummary && typeof baseSummary === 'object' ? baseSummary : {};
    const profileHarvest = normalizeProfileHarvest(state.profile && state.profile.harvest);
    const result = {
      runId: summary.runId != null ? summary.runId : Number(state.run && state.run.id || 0),
      endedAtRealMs: Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now(),
      endReason: reason === 'harvest' ? 'harvest' : 'death',
      simDay: Number(summary.simDay || forecast.simDay || 0),
      stageLabel: String(summary.stageLabel || ''),
      yieldScore: round2(Number(forecast && forecast.yieldScore) || 0),
      qualityScore: round2(Number(forecast && forecast.qualityScore) || 0),
      stabilityScore: round2(Number(forecast && forecast.stabilityScore) || 0),
      efficiencyScore: round2(Number(forecast && forecast.efficiencyScore) || 0),
      challengeScore: round2(Number(forecast && forecast.challengeScore) || 0),
      harvestScore: round2(Number(forecast && forecast.harvestScore) || 0),
      projectedQualityTier: String(forecast && forecast.projectedQualityTier || 'normal'),
      qualityBandLabel: qualityTierLabel(forecast && forecast.projectedQualityTier),
      confidenceBand: String(forecast && forecast.confidenceBand || 'medium'),
      localLabel: 'Lokale Harvest-Auswertung',
      verificationHint: 'Für Ranglisten zählt später die verifizierte Server-Wertung.',
      interpretation: '',
      positiveDrivers: Array.isArray(forecast && forecast.positiveDrivers) ? forecast.positiveDrivers.slice(0, 3) : [],
      negativeDrivers: Array.isArray(forecast && forecast.negativeDrivers) ? forecast.negativeDrivers.slice(0, 3) : [],
      lockedLosses: Array.isArray(forecast && forecast.lockedLosses) ? forecast.lockedLosses.slice(0, 3) : [],
      recoveryOpportunities: Array.isArray(forecast && forecast.recoveryOpportunities) ? forecast.recoveryOpportunities.slice(0, 3) : [],
      forecastHistory: Array.isArray(state.run && state.run.harvest && state.run.harvest.forecastHistory)
        ? state.run.harvest.forecastHistory.slice(-10)
        : [],
      bestFlags: resolveBestFlags(profileHarvest, forecast || {})
    };
    result.interpretation = buildLocalHarvestInterpretation(result);
    return result;
  }

  const api = Object.freeze({
    HISTORY_LIMIT,
    ANALYSIS_LIMIT,
    RECENT_SUMMARIES_LIMIT,
    getDefaultRunHarvest,
    getDefaultProfileHarvest,
    normalizeRunHarvest,
    normalizeProfileHarvest,
    updateHarvestForecast,
    buildRunHarvestSummary,
    updateProfileHarvestBests,
    buildLocalHarvestInterpretation,
    qualityTierLabel
  });

  globalScope.GrowSimHarvest = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
}(typeof window !== 'undefined' ? window : globalThis));
