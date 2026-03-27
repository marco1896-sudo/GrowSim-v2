'use strict';

(function initGrowSimProgression(globalScope) {
  const LEVEL_THRESHOLDS = Object.freeze([
    Object.freeze({ level: 1, xp: 0 }),
    Object.freeze({ level: 2, xp: 150 }),
    Object.freeze({ level: 3, xp: 350 }),
    Object.freeze({ level: 4, xp: 650 }),
    Object.freeze({ level: 5, xp: 1000 }),
    Object.freeze({ level: 6, xp: 1400 })
  ]);

  const DEFAULT_UNLOCKS = Object.freeze({
    setupModes: Object.freeze(['indoor']),
    media: Object.freeze(['soil']),
    lights: Object.freeze(['medium']),
    genetics: Object.freeze(['hybrid'])
  });

  const STAGE_LABELS = Object.freeze([
    'Keimung',
    'Keimling',
    'FrÃ¼he Vegetationsphase',
    'Vegetationsphase',
    'SpÃ¤te Vegetationsphase',
    'VorblÃ¼te',
    'Streckphase',
    'FrÃ¼he BlÃ¼te',
    'BlÃ¼te',
    'Spte BlÃ¼te',
    'Reife',
    'Erntereif'
  ]);

  const SETUP_OPTION_META = Object.freeze({
    genetics: Object.freeze({
      hybrid: Object.freeze({
        title: 'Hybrid',
        effect: 'Ausgewogener Basistyp fÃ¼r stabile Runs.',
        requiredLevel: 1
      }),
      indica: Object.freeze({
        title: 'Hardy Genetics',
        effect: 'Robuster Typ mit weniger Stressspitzen, aber etwas ruhigerem Wachstum.',
        requiredLevel: 2
      }),
      sativa: Object.freeze({
        title: 'Sativa Genetics',
        effect: 'LÃ¤ngerer, wachstumsstarker Run mit hÃ¶herem Pflege- und Stressdruck.',
        requiredLevel: 5
      })
    }),
    setupModes: Object.freeze({
      indoor: Object.freeze({
        title: 'Indoor Run',
        effect: 'Kontrollierter Standardmodus mit stabilen Bedingungen.',
        requiredLevel: 1
      }),
      outdoor: Object.freeze({
        title: 'Outdoor Run',
        effect: 'Neue Startumgebung mit echter Wetter- und Klimadynamik.',
        requiredLevel: 3
      })
    }),
    media: Object.freeze({
      soil: Object.freeze({
        title: 'Soil Medium',
        effect: 'Toleranter Start mit ruhigerem Wasser- und NÃ¤hrstoffverhalten.',
        requiredLevel: 1
      }),
      coco: Object.freeze({
        title: 'Coco Medium',
        effect: 'Reaktiveres Medium mit schnellerem Uptake, aber hÃ¶herem GieÃŸdruck.',
        requiredLevel: 4
      })
    }),
    lights: Object.freeze({
      medium: Object.freeze({
        title: 'Medium Light',
        effect: 'Solider Lichtstandard fÃ¼r stabile Indoor-Runs.',
        requiredLevel: 1
      }),
      high: Object.freeze({
        title: 'High Output Light',
        effect: 'Mehr Wachstumsdruck und hÃ¶heres Potenzial, aber sensibler auf Fehler.',
        requiredLevel: 6
      })
    })
  });

  const SETUP_OPTION_DETAILS = Object.freeze({
    genetics: Object.freeze({
      hybrid: Object.freeze({
        title: 'Hybrid',
        effect: 'Ausgewogener Basistyp fÃ¼r stabile Runs.',
        tag: 'Ausgewogen',
        tradeoff: 'Keine extreme StÃ¤rke, aber auch keine groÃŸe SchwÃ¤che.',
        focus: 'Kontrolle',
        tone: 'balanced'
      }),
      indica: Object.freeze({
        title: 'Hardy Genetics',
        effect: 'Robuster Typ mit mehr Fehlerpuffer, aber langsamerem Wachstum.',
        tag: 'Sicher',
        tradeoff: 'FÃ¤ngt Stress leichter ab, verliert aber Tempo und Peak.',
        focus: 'Safe',
        tone: 'safe'
      }),
      sativa: Object.freeze({
        title: 'Fast Genetics',
        effect: 'Schnellerer Run mit mehr Tempo, aber hohem Klima- und Pflege-Druck.',
        tag: 'Schnell',
        tradeoff: 'Beschleunigt den Run, kippt aber schneller bei Klima- und Pflegefehlern.',
        focus: 'Tempo',
        tone: 'fast'
      })
    }),
    setupModes: Object.freeze({
      indoor: Object.freeze({
        tag: 'Kontrolle',
        tradeoff: 'Planbar und stabil, aber ohne groÃŸe Outdoor-Spitzen.',
        focus: 'Stabil',
        tone: 'balanced'
      }),
      outdoor: Object.freeze({
        tag: 'Unruhig',
        tradeoff: 'Kann effizient sein, aber Klima und Timing werden launischer.',
        focus: 'Varianz',
        tone: 'risky'
      })
    }),
    media: Object.freeze({
      soil: Object.freeze({
        tag: 'Fehlertolerant',
        tradeoff: 'Verzeiht mehr, reagiert aber etwas trÃ¤ger.',
        focus: 'Puffer',
        tone: 'safe'
      }),
      coco: Object.freeze({
        tag: 'Reaktiv',
        tradeoff: 'Kann schneller pushen, kippt aber frÃ¼her bei Pflegefehlern.',
        focus: 'Tempo',
        tone: 'fast'
      })
    }),
    lights: Object.freeze({
      medium: Object.freeze({
        tag: 'Kontrolle',
        tradeoff: 'Weniger Peak, dafÃ¼r gut steuerbar.',
        focus: 'Balance',
        tone: 'balanced'
      }),
      high: Object.freeze({
        title: 'High Output Light',
        effect: 'Mehr Wachstum und mehr Peak, aber deutlich hÃ¶herer Verbrauch und Druck.',
        tag: 'Riskant',
        tradeoff: 'Bringt mehr Output, verlangt aber saubere Wasser- und NÃ¤hrstoffkontrolle.',
        focus: 'Peak',
        tone: 'risky'
      })
    })
  });

  const UNLOCKS_BY_LEVEL = Object.freeze({
    2: Object.freeze([
      Object.freeze({ category: 'genetics', value: 'indica' })
    ]),
    3: Object.freeze([
      Object.freeze({ category: 'setupModes', value: 'outdoor' })
    ]),
    4: Object.freeze([
      Object.freeze({ category: 'media', value: 'coco' })
    ]),
    5: Object.freeze([
      Object.freeze({ category: 'genetics', value: 'sativa' })
    ]),
    6: Object.freeze([
      Object.freeze({ category: 'lights', value: 'high' })
    ])
  });

  const SUMMARY_TEXT = Object.freeze({
    ratings: Object.freeze({
      unstable: Object.freeze({
        title: 'Instabiler Grow',
        hint: 'Der Run ist frÃ¼h oder unter zu viel Druck weggebrochen.'
      }),
      rough: Object.freeze({
        title: 'Wackeliger Run',
        hint: 'Die Runde hatte Potential, lief aber zu unruhig oder zu unsauber.'
      }),
      solid: Object.freeze({
        title: 'Solider Run',
        hint: 'Die wichtigsten Systeme waren unter Kontrolle, aber es blieb Luft nach oben.'
      }),
      strong: Object.freeze({
        title: 'Starker Durchgang',
        hint: 'Du hast den Run gut gesteuert und klare Fortschritte gesichert.'
      }),
      near_perfect: Object.freeze({
        title: 'Nahezu perfekt',
        hint: 'Sehr sauber gespielt: stabil, effizient und bis tief in die spÃ¤te Phase getragen.'
      })
    }),
    highlights: Object.freeze({
      harvest_finish: 'Bis zur Ernte durchgezogen.',
      rescue_comeback: 'Fast verloren, aber noch einmal stabilisiert.',
      stable_phase: 'Sehr stabile Wachstumsphase Ã¼ber weite Strecken.',
      low_stress_finish: 'Stress blieb bis zum Ende erstaunlich niedrig.',
      long_run: 'Der Run hielt lange durch und erreichte eine spÃ¤te Phase.',
      event_handling: 'Mehrere Event-Entscheidungen aktiv ausgespielt.',
      water_window: 'Wasserwerte blieben am Ende im stabilen Bereich.',
      nutrition_window: 'Die NÃ¤hrstoffbalance blieb gut steuerbar.',
      critical_stress: 'Zum Ende hin baute sich kritischer Stress auf.',
      early_collapse: 'Der Run kippte schon in einer frÃ¼hen Phase.',
      high_risk: 'Das Risiko lief spÃ¼rbar aus dem Ruder.'
    }),
    mistakes: Object.freeze({
      early_death: 'Der Run brach zu frÃ¼h weg, bevor er richtig Tempo aufnehmen konnte.',
      late_stress: 'Zu viel Stress in der spÃ¤ten Phase hat den Run deutlich gedrÃ¼ckt.',
      high_risk: 'Das Risiko war zu lange zu hoch und hat den Spielraum verkleinert.',
      water_instability: 'Die Wasserwerte waren nicht stabil genug.',
      nutrition_instability: 'Die NÃ¤hrstoffwerte liefen aus dem Gleichgewicht.',
      weak_finish: 'Zum Run-Ende fehlte der Pflanze die nÃ¶tige Gesundheitsreserve.',
      slow_progress: 'Der Fortschritt blieb fÃ¼r die Run-Dauer zu langsam.'
    }),
    positives: Object.freeze({
      reached_harvest: 'Du hast den Run bis zur Ernte gebracht.',
      healthy_core: 'Die Pflanze blieb Ã¼ber weite Strecken gesund.',
      low_stress: 'Stress blieb lange unter Kontrolle.',
      stable_water: 'Der Wasserhaushalt war gut lesbar und stabil.',
      stable_nutrition: 'Die NÃ¤hrstoffbalance war fÃ¼r V1 solide.',
      active_decisions: 'Du hast mehrere Situationen aktiv ausgespielt.',
      comeback: 'Du hast dich aus einer kritischen Lage wieder herausgezogen.'
    }),
    xp: Object.freeze({
      base: 'Run abgeschlossen',
      survival: 'lange Ã¼berlebt',
      stage: 'spÃ¤te Phase erreicht',
      quality: 'saubere Werte',
      outcome_harvest: 'Ernte geschafft',
      outcome_death: 'Abschluss-XP'
    }),
    fallbacks: Object.freeze({
      highlight: 'Der Run hat dir neue Daten fÃ¼r den nÃ¤chsten Versuch geliefert.',
      mistake: 'Keine einzelne Schwachstelle stach klar heraus.',
      positive: 'Du hast wieder Fortschritt fÃ¼r den nÃ¤chsten Run gesichert.'
    })
  });

  const GOAL_DEFS = Object.freeze({
    survive_day_20: Object.freeze({
      id: 'survive_day_20',
      title: 'Erreiche Tag 20',
      description: 'Halte die Pflanze bis mindestens Tag 20 am Leben.',
      rewardXp: 45,
      target: 20
    }),
    reach_flowering: Object.freeze({
      id: 'reach_flowering',
      title: 'Bringe die Pflanze in die BlÃ¼te',
      description: 'FÃ¼hre den Run sicher bis in die BlÃ¼tephase.',
      rewardXp: 55,
      target: 6
    }),
    stable_grow: Object.freeze({
      id: 'stable_grow',
      title: 'Halte den Grow stabil',
      description: 'Erreiche mindestens Tag 30 und halte den Durchschnittsstress niedrig.',
      rewardXp: 65,
      target: 30
    }),
    clean_finish: Object.freeze({
      id: 'clean_finish',
      title: 'Beende sauber',
      description: 'SchlieÃŸe den Run mit mindestens 70 QualitÃ¤t ab.',
      rewardXp: 70,
      target: 70
    }),
    reach_harvest: Object.freeze({
      id: 'reach_harvest',
      title: 'Erreiche die Ernte',
      description: 'Trage die Pflanze bis zur Erntephase durch.',
      rewardXp: 90,
      target: 11
    })
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

  function cloneDefaultUnlocks() {
    return {
      setupModes: DEFAULT_UNLOCKS.setupModes.slice(),
      media: DEFAULT_UNLOCKS.media.slice(),
      lights: DEFAULT_UNLOCKS.lights.slice(),
      genetics: DEFAULT_UNLOCKS.genetics.slice()
    };
  }

  function buildDefaultStats() {
    return {
      totalRuns: 0,
      deathRuns: 0,
      harvestRuns: 0,
      bestSimDay: 0,
      bestQualityScore: 0
    };
  }

  function getDefaultProfile() {
    return {
      displayName: 'Marco',
      totalXp: 0,
      level: 1,
      unlocks: cloneDefaultUnlocks(),
      stats: buildDefaultStats(),
      lastRunSummary: null
    };
  }

  function getDefaultRunState() {
    return {
      id: 0,
      status: 'idle',
      endReason: null,
      startedAtRealMs: null,
      endedAtRealMs: null,
      finalizedAtRealMs: null,
      setupSnapshot: null,
      goal: null
    };
  }

  function getGoalDefinition(goalId) {
    const key = String(goalId || '').trim();
    if (!key) {
      return null;
    }
    return GOAL_DEFS[key] || null;
  }

  function normalizeRunGoal(goalLike) {
    if (!goalLike || typeof goalLike !== 'object') {
      return null;
    }
    const definition = getGoalDefinition(goalLike.id);
    if (!definition) {
      return null;
    }
    const status = String(goalLike.status || 'active');
    const safeStatus = ['active', 'completed', 'failed'].includes(status) ? status : 'active';
    const progress = Math.max(0, Math.trunc(Number(goalLike.progress) || 0));
    const target = Math.max(1, Math.trunc(Number(goalLike.target) || definition.target || 1));
    return {
      id: definition.id,
      title: definition.title,
      description: definition.description,
      status: safeStatus,
      progress,
      target,
      rewardXp: Math.max(0, Math.trunc(Number(goalLike.rewardXp) || definition.rewardXp || 0)),
      progressText: typeof goalLike.progressText === 'string' ? goalLike.progressText : '',
      statusText: typeof goalLike.statusText === 'string' ? goalLike.statusText : '',
      resultText: typeof goalLike.resultText === 'string' ? goalLike.resultText : ''
    };
  }

  function chooseRunGoal(profileLike, runLike) {
    const profile = normalizeProfile(profileLike);
    const run = normalizeRunState(runLike);
    const setup = run.setupSnapshot && typeof run.setupSnapshot === 'object' ? run.setupSnapshot : {};
    const isFragileBuild = setup.genetics === 'sativa' || setup.light === 'high' || setup.medium === 'coco';
    const pool = isFragileBuild
      ? ['survive_day_20', 'reach_flowering', 'reach_flowering']
      : ['survive_day_20', 'reach_flowering', 'stable_grow'];
    if (profile.level >= 2) {
      pool.push('clean_finish');
    }
    if (!isFragileBuild && profile.level >= 3) {
      pool.push('reach_harvest');
    }
    if (isFragileBuild && profile.level >= 4) {
      pool.push('stable_grow');
    }
    if (isFragileBuild && profile.level >= 5) {
      pool.push('reach_harvest');
    }
    const seed = Math.max(
      0,
      Math.trunc(Number(profile.stats.totalRuns || 0))
      + Math.trunc(Number(run.id || 0))
      + Math.trunc(Number(profile.level || 1))
    );
    const selectedId = pool[seed % pool.length];
    return normalizeRunGoal(getGoalDefinition(selectedId));
  }

  function ensureArrayValues(list, fallbackValues) {
    if (!Array.isArray(list)) {
      return fallbackValues.slice();
    }
    const normalized = [];
    for (const rawValue of list) {
      const value = String(rawValue || '').trim();
      if (!value || normalized.includes(value)) {
        continue;
      }
      normalized.push(value);
    }
    return normalized.length ? normalized : fallbackValues.slice();
  }

  function normalizeProfile(profileLike) {
    const defaults = getDefaultProfile();
    const profile = profileLike && typeof profileLike === 'object' ? profileLike : {};
    const unlocks = profile.unlocks && typeof profile.unlocks === 'object' ? profile.unlocks : {};
    const normalized = {
      displayName: typeof profile.displayName === 'string' && profile.displayName.trim() ? profile.displayName.trim() : defaults.displayName,
      totalXp: Math.max(0, Math.trunc(Number(profile.totalXp) || 0)),
      level: 1,
      unlocks: {
        setupModes: ensureArrayValues(unlocks.setupModes, DEFAULT_UNLOCKS.setupModes),
        media: ensureArrayValues(unlocks.media, DEFAULT_UNLOCKS.media),
        lights: ensureArrayValues(unlocks.lights, DEFAULT_UNLOCKS.lights),
        genetics: ensureArrayValues(unlocks.genetics, DEFAULT_UNLOCKS.genetics)
      },
      stats: {
        totalRuns: Math.max(0, Math.trunc(Number(profile.stats && profile.stats.totalRuns) || 0)),
        deathRuns: Math.max(0, Math.trunc(Number(profile.stats && profile.stats.deathRuns) || 0)),
        harvestRuns: Math.max(0, Math.trunc(Number(profile.stats && profile.stats.harvestRuns) || 0)),
        bestSimDay: Math.max(0, Math.trunc(Number(profile.stats && profile.stats.bestSimDay) || 0)),
        bestQualityScore: round2(Math.max(0, Number(profile.stats && profile.stats.bestQualityScore) || 0))
      },
      lastRunSummary: profile.lastRunSummary && typeof profile.lastRunSummary === 'object'
        ? { ...profile.lastRunSummary }
        : null
    };

    normalized.level = getLevelForXp(normalized.totalXp);
    return normalized;
  }

  function normalizeRunState(runLike) {
    const defaults = getDefaultRunState();
    const run = runLike && typeof runLike === 'object' ? runLike : {};
    const status = String(run.status || defaults.status);
    const allowedStatuses = new Set(['idle', 'active', 'downed', 'ended']);
    return {
      id: Math.max(0, Math.trunc(Number(run.id) || 0)),
      status: allowedStatuses.has(status) ? status : defaults.status,
      endReason: run.endReason === 'death' || run.endReason === 'harvest' ? run.endReason : null,
      startedAtRealMs: Number.isFinite(Number(run.startedAtRealMs)) ? Number(run.startedAtRealMs) : null,
      endedAtRealMs: Number.isFinite(Number(run.endedAtRealMs)) ? Number(run.endedAtRealMs) : null,
      finalizedAtRealMs: run.finalizedAtRealMs == null || run.finalizedAtRealMs === ''
        ? null
        : (Number.isFinite(Number(run.finalizedAtRealMs)) ? Number(run.finalizedAtRealMs) : null),
      setupSnapshot: run.setupSnapshot && typeof run.setupSnapshot === 'object'
        ? { ...run.setupSnapshot }
        : null,
      goal: normalizeRunGoal(run.goal)
    };
  }

  function isRunFinalized(runLike) {
    return runLike != null
      && runLike.finalizedAtRealMs != null
      && Number.isFinite(Number(runLike.finalizedAtRealMs));
  }

  function getLevelForXp(totalXp) {
    const safeXp = Math.max(0, Math.trunc(Number(totalXp) || 0));
    let resolvedLevel = 1;
    for (const entry of LEVEL_THRESHOLDS) {
      if (safeXp >= entry.xp) {
        resolvedLevel = entry.level;
      }
    }
    return resolvedLevel;
  }

  function getLevelThreshold(level) {
    const entry = LEVEL_THRESHOLDS.find((candidate) => candidate.level === Number(level));
    return entry ? entry.xp : LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1].xp;
  }

  function getNextLevelThreshold(level) {
    const entry = LEVEL_THRESHOLDS.find((candidate) => candidate.level === Number(level) + 1);
    return entry ? entry.xp : null;
  }

  function getLevelProgress(profileLike) {
    const profile = normalizeProfile(profileLike);
    const currentLevel = profile.level;
    const currentThreshold = getLevelThreshold(currentLevel);
    const nextThreshold = getNextLevelThreshold(currentLevel);
    if (nextThreshold == null) {
      return {
        level: currentLevel,
        currentXp: profile.totalXp,
        currentLevelXp: profile.totalXp - currentThreshold,
        requiredXp: 0,
        xpPercent: 100,
        nextLevel: null,
        nextThreshold: null
      };
    }

    const currentLevelXp = Math.max(0, profile.totalXp - currentThreshold);
    const requiredXp = Math.max(1, nextThreshold - currentThreshold);
    return {
      level: currentLevel,
      currentXp: profile.totalXp,
      currentLevelXp,
      requiredXp,
      xpPercent: Math.round(clamp(currentLevelXp / requiredXp, 0, 1) * 100),
      nextLevel: currentLevel + 1,
      nextThreshold
    };
  }

  function getUnlockMeta(category, value) {
    const group = SETUP_OPTION_META[String(category || '')];
    if (!group) {
      return null;
    }
    const baseMeta = group[String(value || '')] || null;
    const detailGroup = SETUP_OPTION_DETAILS[String(category || '')];
    const detailMeta = detailGroup ? (detailGroup[String(value || '')] || null) : null;
    if (!baseMeta && !detailMeta) {
      return null;
    }
    return {
      ...(baseMeta || {}),
      ...(detailMeta || {})
    };
  }

  function isSetupOptionUnlocked(profileLike, category, value) {
    const profile = normalizeProfile(profileLike);
    const unlocks = profile.unlocks[String(category || '')];
    return Array.isArray(unlocks) && unlocks.includes(String(value || ''));
  }

  function sanitizeSetupChoice(profileLike, category, value, fallbackValue) {
    const safeValue = String(value || '').trim();
    if (safeValue && isSetupOptionUnlocked(profileLike, category, safeValue)) {
      return safeValue;
    }
    return String(fallbackValue || '').trim();
  }

  function getSetupOptionPresentation(profileLike, category, value) {
    const meta = getUnlockMeta(category, value) || { title: String(value || ''), effect: '', requiredLevel: 1 };
    return {
      category: String(category || ''),
      value: String(value || ''),
      title: meta.title,
      effect: meta.effect,
      requiredLevel: Number(meta.requiredLevel || 1),
      unlocked: isSetupOptionUnlocked(profileLike, category, value),
      tag: String(meta.tag || ''),
      tradeoff: String(meta.tradeoff || ''),
      focus: String(meta.focus || ''),
      tone: String(meta.tone || 'balanced')
    };
  }

  function getRunBuildPresentation(setupLike) {
    const setup = setupLike && typeof setupLike === 'object' ? setupLike : {};
    const geneticsMeta = getUnlockMeta('genetics', setup.genetics || 'hybrid') || {};
    const mediumMeta = getUnlockMeta('media', setup.medium || 'soil') || {};
    const lightMeta = getUnlockMeta('lights', setup.light || 'medium') || {};
    const modeMeta = getUnlockMeta('setupModes', setup.mode || 'indoor') || {};

    let title = 'Balanced Control';
    let tag = 'Ausgewogen';
    let description = 'Solider Kontroll-Run mit guter Fehlertoleranz und ohne harte Peaks.';
    let tradeoff = 'Kein extremer Vorteil, aber auch keine groÃŸe Sollbruchstelle.';
    let tone = 'balanced';

    if (String(setup.light || '') === 'high') {
      title = 'High Pressure Push';
      tag = 'Riskant';
      description = 'Mehr Lichtdruck fÃ¼r starken Output, aber nur wenn Wasser und Nahrung sauber nachkommen.';
      tradeoff = 'Hherer Verbrauch und deutlich mehr Stress bei Fehlern.';
      tone = 'risky';
    } else if (String(setup.genetics || '') === 'sativa') {
      title = 'Fast Cycle';
      tag = 'Schnell';
      description = 'Spiel auf Tempo: frÃ¼herer Fortschritt, aber sensibler gegen Klima- und Pflegefehler.';
      tradeoff = 'Der Run kippt schneller, wenn Wasser, Klima oder NÃ¤hrstoffe nicht sitzen.';
      tone = 'fast';
    } else if (String(setup.genetics || '') === 'indica') {
      title = 'Safe Control';
      tag = 'Sicher';
      description = 'Mehr Fehlerpuffer und ruhigere Stresskurven fÃ¼r kontrollierte Runs.';
      tradeoff = 'Weniger Wachstumstempo und weniger Peak-Potenzial.';
      tone = 'safe';
    } else if (String(setup.medium || '') === 'coco') {
      title = 'Reactive Feed';
      tag = 'Reaktiv';
      description = 'Coco reagiert schnell und kann pushen, will aber konstante Pflege.';
      tradeoff = 'Mehr Wasser- und NÃ¤hrstoffdruck Ã¼ber den ganzen Run.';
      tone = 'fast';
    }

    const loadout = [
      geneticsMeta.title || String(setup.genetics || 'Hybrid'),
      mediumMeta.title || String(setup.medium || 'Soil'),
      lightMeta.title || String(setup.light || 'Medium')
    ].join(' Â· ');

    return {
      title,
      tag,
      description,
      tradeoff,
      tone,
      loadout,
      supportText: `Mode: ${modeMeta.title || String(setup.mode || 'Indoor')}`
    };
  }

  function deriveQualityScoreFromState(snapshot) {
    const stateLike = snapshot && typeof snapshot === 'object' ? snapshot : {};
    const lifecycleScore = Number(stateLike.plant && stateLike.plant.lifecycle && stateLike.plant.lifecycle.qualityScore);
    if (Number.isFinite(lifecycleScore)) {
      return round2(clamp(lifecycleScore, 0, 100));
    }

    const status = stateLike.status || {};
    const health = clamp(Number(status.health) || 0, 0, 100);
    const stress = clamp(Number(status.stress) || 0, 0, 100);
    const risk = clamp(Number(status.risk) || 0, 0, 100);
    const stageIndex = clampInt(Number(stateLike.plant && stateLike.plant.stageIndex) || 0, 0, 11);
    const stageScore = clamp((stageIndex / 11) * 100, 0, 100);
    return round2(clamp((health * 0.45) + ((100 - stress) * 0.25) + ((100 - risk) * 0.15) + (stageScore * 0.15), 0, 100));
  }

  function getQualityTier(score) {
    const safeScore = clamp(Number(score) || 0, 0, 100);
    if (safeScore >= 85) {
      return 'perfect';
    }
    if (safeScore >= 60) {
      return 'normal';
    }
    return 'degraded';
  }

  function computeXpBreakdown(summaryLike) {
    const summary = summaryLike && typeof summaryLike === 'object' ? summaryLike : {};
    const simDay = Math.max(0, Math.trunc(Number(summary.simDay) || 0));
    const stageIndex = clampInt(Number(summary.stageIndex) || 0, 0, 11);
    const qualityScore = clamp(Number(summary.qualityScore) || 0, 0, 100);
    const goal = summary.goal && typeof summary.goal === 'object' ? summary.goal : null;
    const isHarvest = String(summary.endReason || '') === 'harvest';
    const breakdown = {
      base: isHarvest ? 40 : 24,
      survival: Math.min(80, simDay * 4),
      stage: stageIndex * 12,
      quality: Math.round(qualityScore / 6),
      outcome: isHarvest ? 90 : 0,
      goal: goal && goal.status === 'completed'
        ? Math.max(0, Math.trunc(Number(goal.rewardXp) || 0))
        : 0
    };
    const total = Object.values(breakdown).reduce((sum, value) => sum + (Number(value) || 0), 0);
    return {
      ...breakdown,
      total: Math.max(0, Math.trunc(total))
    };
  }

  function addUniqueFeedback(list, key, text, limit) {
    if (!Array.isArray(list) || !key || !text) {
      return;
    }
    if (list.some((entry) => entry && entry.key === key)) {
      return;
    }
    if (list.length >= limit) {
      return;
    }
    list.push({ key, text });
  }

  function resolveRunRating(summary) {
    const endReason = String(summary.endReason || 'death');
    const health = clamp(Number(summary.finalHealth) || 0, 0, 100);
    const stress = clamp(Number(summary.finalStress) || 0, 0, 100);
    const risk = clamp(Number(summary.finalRisk) || 0, 0, 100);
    const quality = clamp(Number(summary.qualityScore) || 0, 0, 100);
    const stageIndex = clampInt(Number(summary.stageIndex) || 0, 0, 11);
    const simDay = Math.max(0, Math.trunc(Number(summary.simDay) || 0));

    let key = 'rough';
    if (endReason === 'harvest' && quality >= 88 && health >= 78 && stress <= 28 && risk <= 24) {
      key = 'near_perfect';
    } else if ((endReason === 'harvest' && quality >= 72) || (quality >= 76 && stageIndex >= 9 && health >= 62 && stress <= 45)) {
      key = 'strong';
    } else if ((quality >= 58 && stageIndex >= 6 && health >= 45 && stress <= 62) || simDay >= 40) {
      key = 'solid';
    } else if (endReason === 'death' && (simDay < 20 || quality < 40 || health < 28 || stress >= 82 || risk >= 82)) {
      key = 'unstable';
    }

    const rating = SUMMARY_TEXT.ratings[key] || SUMMARY_TEXT.ratings.rough;
    return {
      key,
      title: rating.title,
      hint: rating.hint
    };
  }

  function buildHighlights(summary) {
    const highlights = [];
    const setup = summary.setup && typeof summary.setup === 'object' ? summary.setup : {};
    if (summary.endReason === 'harvest') {
      addUniqueFeedback(highlights, 'harvest_finish', SUMMARY_TEXT.highlights.harvest_finish, 4);
    }
    if (summary.rescueUsed) {
      addUniqueFeedback(highlights, 'rescue_comeback', SUMMARY_TEXT.highlights.rescue_comeback, 4);
    }
    if (String(setup.genetics || '') === 'indica' && summary.finalStress <= 42) {
      addUniqueFeedback(highlights, 'hardy_cushion', 'Hardy Genetics haben Stressspitzen sichtbar abgefedert.', 4);
    }
    if (String(setup.genetics || '') === 'sativa' && summary.stageIndex >= 7) {
      addUniqueFeedback(highlights, 'fast_cycle', 'Fast Genetics haben das Wachstum bis in spÃ¤te Phasen beschleunigt.', 4);
    }
    if (String(setup.light || '') === 'high' && summary.stageIndex >= 7) {
      addUniqueFeedback(highlights, 'high_output_push', 'High Output Light hat den Run frÃ¼h auf Output getrimmt.', 4);
    }
    if (summary.qualityScore >= 80) {
      addUniqueFeedback(highlights, 'stable_phase', SUMMARY_TEXT.highlights.stable_phase, 4);
    }
    if (summary.finalStress <= 24 && summary.stageIndex >= 7) {
      addUniqueFeedback(highlights, 'low_stress_finish', SUMMARY_TEXT.highlights.low_stress_finish, 4);
    }
    if (summary.simDay >= 68) {
      addUniqueFeedback(highlights, 'long_run', SUMMARY_TEXT.highlights.long_run, 4);
    }
    if (summary.eventsCount >= 4) {
      addUniqueFeedback(highlights, 'event_handling', SUMMARY_TEXT.highlights.event_handling, 4);
    }
    if (summary.finalWater >= 48 && summary.finalWater <= 76) {
      addUniqueFeedback(highlights, 'water_window', SUMMARY_TEXT.highlights.water_window, 4);
    }
    if (summary.finalNutrition >= 42 && summary.finalNutrition <= 74) {
      addUniqueFeedback(highlights, 'nutrition_window', SUMMARY_TEXT.highlights.nutrition_window, 4);
    }
    if (summary.finalStress >= 72) {
      addUniqueFeedback(highlights, 'critical_stress', SUMMARY_TEXT.highlights.critical_stress, 4);
    }
    if (summary.endReason === 'death' && summary.simDay < 24) {
      addUniqueFeedback(highlights, 'early_collapse', SUMMARY_TEXT.highlights.early_collapse, 4);
    }
    if (summary.finalRisk >= 68) {
      addUniqueFeedback(highlights, 'high_risk', SUMMARY_TEXT.highlights.high_risk, 4);
    }
    if (!highlights.length) {
      addUniqueFeedback(highlights, 'fallback', SUMMARY_TEXT.fallbacks.highlight, 4);
    }
    return highlights.slice(0, 4);
  }

  function buildMistakes(summary) {
    const mistakes = [];
    const setup = summary.setup && typeof summary.setup === 'object' ? summary.setup : {};
    if (summary.endReason === 'death' && summary.simDay < 24) {
      addUniqueFeedback(mistakes, 'early_death', SUMMARY_TEXT.mistakes.early_death, 3);
    }
    if (summary.finalStress >= 58 || (summary.endReason === 'death' && summary.finalStress >= 45)) {
      addUniqueFeedback(mistakes, 'late_stress', SUMMARY_TEXT.mistakes.late_stress, 3);
    }
    if (summary.finalRisk >= 56) {
      addUniqueFeedback(mistakes, 'high_risk', SUMMARY_TEXT.mistakes.high_risk, 3);
    }
    if (summary.finalWater <= 34 || summary.finalWater >= 88) {
      addUniqueFeedback(mistakes, 'water_instability', SUMMARY_TEXT.mistakes.water_instability, 3);
    }
    if (summary.finalNutrition <= 34 || summary.finalNutrition >= 84) {
      addUniqueFeedback(mistakes, 'nutrition_instability', SUMMARY_TEXT.mistakes.nutrition_instability, 3);
    }
    if (summary.finalHealth <= 40) {
      addUniqueFeedback(mistakes, 'weak_finish', SUMMARY_TEXT.mistakes.weak_finish, 3);
    }
    if (summary.endReason === 'death' && summary.stageIndex <= 5) {
      addUniqueFeedback(mistakes, 'slow_progress', SUMMARY_TEXT.mistakes.slow_progress, 3);
    }
    if (String(setup.genetics || '') === 'sativa' && (summary.finalStress >= 54 || summary.finalRisk >= 52)) {
      addUniqueFeedback(mistakes, 'fast_genetics_pressure', 'Fast Genetics haben den Run deutlich anfÃ¤lliger fÃ¼r Druck und Fehler gemacht.', 3);
    }
    if (String(setup.light || '') === 'high' && (summary.finalWater <= 38 || summary.finalNutrition <= 38 || summary.finalStress >= 58)) {
      addUniqueFeedback(mistakes, 'high_output_pressure', 'High Output Light hat Wasser-, Futter- und Stressdruck sichtbar erhÃ¶ht.', 3);
    }
    if (String(setup.genetics || '') === 'indica' && summary.endReason === 'death' && summary.stageIndex <= 5) {
      addUniqueFeedback(mistakes, 'hardy_tempo_loss', 'Der sichere Build hat Zeit gekauft, aber das langsamere Tempo blieb ein Nachteil.', 3);
    }
    if (!mistakes.length) {
      addUniqueFeedback(mistakes, 'fallback', SUMMARY_TEXT.fallbacks.mistake, 3);
    }
    return mistakes.slice(0, 3);
  }

  function buildPositives(summary) {
    const positives = [];
    const setup = summary.setup && typeof summary.setup === 'object' ? summary.setup : {};
    if (summary.endReason === 'harvest') {
      addUniqueFeedback(positives, 'reached_harvest', SUMMARY_TEXT.positives.reached_harvest, 2);
    }
    if (summary.qualityScore >= 72 || summary.finalHealth >= 72) {
      addUniqueFeedback(positives, 'healthy_core', SUMMARY_TEXT.positives.healthy_core, 2);
    }
    if (summary.finalStress <= 28) {
      addUniqueFeedback(positives, 'low_stress', SUMMARY_TEXT.positives.low_stress, 2);
    }
    if (summary.finalWater >= 48 && summary.finalWater <= 76) {
      addUniqueFeedback(positives, 'stable_water', SUMMARY_TEXT.positives.stable_water, 2);
    }
    if (summary.finalNutrition >= 42 && summary.finalNutrition <= 74) {
      addUniqueFeedback(positives, 'stable_nutrition', SUMMARY_TEXT.positives.stable_nutrition, 2);
    }
    if (summary.eventsCount >= 3) {
      addUniqueFeedback(positives, 'active_decisions', SUMMARY_TEXT.positives.active_decisions, 2);
    }
    if (summary.rescueUsed && summary.endReason === 'harvest') {
      addUniqueFeedback(positives, 'comeback', SUMMARY_TEXT.positives.comeback, 2);
    }
    if (String(setup.genetics || '') === 'indica' && summary.finalHealth >= 70) {
      addUniqueFeedback(positives, 'hardy_finish', 'Hardy Genetics haben den Run stabil und fehlertolerant gehalten.', 2);
    }
    if (String(setup.genetics || '') === 'sativa' && summary.simDay >= 40 && summary.stageIndex >= 7) {
      addUniqueFeedback(positives, 'fast_progress', 'Fast Genetics haben Tempo in den Run gebracht, ohne komplett zu kollabieren.', 2);
    }
    if (String(setup.light || '') === 'high' && summary.endReason === 'harvest' && summary.qualityScore >= 72) {
      addUniqueFeedback(positives, 'high_output_reward', 'High Output Light hat den zusÃ¤tzlichen Druck in echten Fortschritt verwandelt.', 2);
    }
    if (!positives.length) {
      addUniqueFeedback(positives, 'fallback', SUMMARY_TEXT.fallbacks.positive, 2);
    }
    return positives.slice(0, 2);
  }

  function buildXpNotices(summary) {
    const breakdown = summary.xpBreakdown || {};
    const notices = [];
    const mapping = [
      { key: 'base', label: SUMMARY_TEXT.xp.base },
      { key: 'survival', label: SUMMARY_TEXT.xp.survival },
      { key: 'stage', label: SUMMARY_TEXT.xp.stage },
      { key: 'quality', label: SUMMARY_TEXT.xp.quality },
      { key: 'outcome', label: summary.endReason === 'harvest' ? SUMMARY_TEXT.xp.outcome_harvest : SUMMARY_TEXT.xp.outcome_death },
      { key: 'goal', label: 'Run-Ziel geschafft' }
    ];
    for (const entry of mapping) {
      const xp = Math.trunc(Number(breakdown[entry.key]) || 0);
      if (xp <= 0) {
        continue;
      }
      notices.push({
        key: entry.key,
        label: entry.label,
        xp
      });
    }
    return notices.slice(0, 6);
  }

  function buildSummaryInsights(summaryLike) {
    const summary = summaryLike && typeof summaryLike === 'object' ? summaryLike : {};
    const rating = resolveRunRating(summary);
    return {
      rating,
      highlights: buildHighlights(summary),
      mistakes: buildMistakes(summary),
      positives: buildPositives(summary),
      xpNotices: buildXpNotices(summary)
    };
  }

  function buildRunSummaryFromState(snapshot, reason, nowMs) {
    const stateLike = snapshot && typeof snapshot === 'object' ? snapshot : {};
    const run = normalizeRunState(stateLike.run);
    const setup = stateLike.setup && typeof stateLike.setup === 'object'
      ? { ...stateLike.setup }
      : (run.setupSnapshot ? { ...run.setupSnapshot } : null);
    const simDay = Math.max(0, Math.trunc(Number(stateLike.simulation && stateLike.simulation.simDay) || 0));
    const stageIndex = clampInt(Number(stateLike.plant && stateLike.plant.stageIndex) || 0, 0, 11);
    const qualityScore = deriveQualityScoreFromState(stateLike);
    const qualityTier = getQualityTier(qualityScore);
    const actions = Array.isArray(stateLike.history && stateLike.history.actions) ? stateLike.history.actions : [];
    const events = Array.isArray(stateLike.history && stateLike.history.events) ? stateLike.history.events : [];
    const rescueUsed = Boolean(stateLike.meta && stateLike.meta.rescue && stateLike.meta.rescue.used);

    return {
      runId: run.id,
      endedAtRealMs: Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now(),
      endReason: reason === 'harvest' ? 'harvest' : 'death',
      simDay,
      stageIndex,
      stageLabel: STAGE_LABELS[stageIndex] || 'Unbekannte Phase',
      qualityScore,
      qualityTier,
      finalHealth: clamp(Number(stateLike.status && stateLike.status.health) || 0, 0, 100),
      finalStress: clamp(Number(stateLike.status && stateLike.status.stress) || 0, 0, 100),
      finalRisk: clamp(Number(stateLike.status && stateLike.status.risk) || 0, 0, 100),
      finalWater: clamp(Number(stateLike.status && stateLike.status.water) || 0, 0, 100),
      finalNutrition: clamp(Number(stateLike.status && stateLike.status.nutrition) || 0, 0, 100),
      averageHealth: round2(Number(stateLike.plant && stateLike.plant.averageHealth) || 0),
      averageStress: round2(Number(stateLike.plant && stateLike.plant.averageStress) || 0),
      actionsCount: actions.length,
      eventsCount: events.length,
      rescueUsed,
      setup,
      build: getRunBuildPresentation(setup),
      goal: evaluateRunGoal(run.goal, stateLike, {
        finalize: false,
        endReason: reason
      }),
      xpBreakdown: null,
      awardedXp: 0,
      levelBefore: 1,
      levelAfter: 1,
      unlockedThisRun: [],
      rating: null,
      highlights: [],
      mistakes: [],
      positives: [],
      xpNotices: []
    };
  }

  function goalFailureText(definition, summaryLike) {
    const summary = summaryLike && typeof summaryLike === 'object' ? summaryLike : {};
    const simDay = Math.max(0, Math.trunc(Number(summary.simDay) || 0));
    const stageLabel = String(summary.stageLabel || 'frühe Phase');
    const qualityScore = clamp(Number(summary.qualityScore) || 0, 0, 100);
    const averageStress = round2(Number(summary.averageStress) || Number(summary.finalStress) || 0);

    switch (definition && definition.id) {
      case 'survive_day_20':
        return `Der Run endete bei Tag ${simDay}. Bis Tag 20 hat es diesmal nicht gereicht.`;
      case 'reach_flowering':
        return `Die Pflanze blieb vor der Blüte stecken und endete in ${stageLabel}.`;
      case 'stable_grow':
        return simDay < definition.target
          ? `Der Grow kam nur bis Tag ${simDay} und blieb damit unter dem Stabilitätsziel.`
          : `Der Durchschnittsstress lag mit ${averageStress.toFixed(1)} zu hoch für einen stabilen Durchgang.`;
      case 'clean_finish':
        return `Der Abschluss lag mit Qualität ${qualityScore.toFixed(1)} unter dem Zielwert von ${definition.target}.`;
      case 'reach_harvest':
        return 'Die Pflanze erreichte die Erntephase nicht.';
      default:
        return 'Dieses Run-Ziel wurde knapp verfehlt.';
    }
  }

  function evaluateRunGoal(goalLike, snapshot, options = {}) {
    const stateLike = snapshot && typeof snapshot === 'object' ? snapshot : {};
    const goal = normalizeRunGoal(goalLike);
    if (!goal) {
      return null;
    }
    const definition = getGoalDefinition(goal.id);
    if (!definition) {
      return null;
    }

    const finalize = Boolean(options && options.finalize);
    const endReason = options && options.endReason === 'harvest' ? 'harvest' : 'death';
    const simDay = Math.max(0, Math.trunc(Number(stateLike.simulation && stateLike.simulation.simDay) || 0));
    const stageIndex = clampInt(Number(stateLike.plant && stateLike.plant.stageIndex) || 0, 0, 11);
    const phase = String(stateLike.plant && stateLike.plant.phase || '');
    const qualityScore = deriveQualityScoreFromState(stateLike);
    const averageStress = round2(Number(stateLike.plant && stateLike.plant.averageStress) || Number(stateLike.status && stateLike.status.stress) || 0);

    let progress = goal.progress;
    let status = goal.status === 'completed' ? 'completed' : (goal.status === 'failed' ? 'failed' : 'active');
    let progressText = goal.progressText;
    let statusText = goal.statusText;
    let resultText = goal.resultText;

    switch (definition.id) {
      case 'survive_day_20': {
        progress = Math.min(definition.target, simDay);
        progressText = `Tag ${progress}/${definition.target}`;
        if (simDay >= definition.target) {
          status = 'completed';
          statusText = 'Ziel erreicht';
          resultText = 'Du hast die kritische Frühphase überstanden und Tag 20 erreicht.';
        } else if (finalize) {
          status = 'failed';
          statusText = 'Ziel verfehlt';
          resultText = goalFailureText(definition, { simDay });
        } else {
          statusText = 'Läuft';
        }
        break;
      }
      case 'reach_flowering': {
        progress = Math.min(definition.target, phase === 'flowering' || endReason === 'harvest' ? definition.target : stageIndex);
        progressText = phase === 'flowering' || endReason === 'harvest'
          ? 'Blüte erreicht'
          : `Phase ${Math.max(0, progress)}/${definition.target}`;
        if (phase === 'flowering' || endReason === 'harvest') {
          status = 'completed';
          statusText = 'Ziel erreicht';
          resultText = 'Die Pflanze hat die Blütephase sicher erreicht.';
        } else if (finalize) {
          status = 'failed';
          statusText = 'Ziel verfehlt';
          resultText = goalFailureText(definition, {
            stageLabel: STAGE_LABELS[stageIndex] || 'frühe Phase'
          });
        } else {
          statusText = 'Läuft';
        }
        break;
      }
      case 'stable_grow': {
        progress = Math.min(definition.target, simDay);
        progressText = `Tag ${progress}/${definition.target} · Ø Stress ${averageStress.toFixed(1)}`;
        if (finalize && simDay >= definition.target && averageStress <= 30) {
          status = 'completed';
          statusText = 'Ziel erreicht';
          resultText = 'Der Grow blieb über lange Strecken stabil und kontrolliert.';
        } else if (finalize) {
          status = 'failed';
          statusText = 'Ziel verfehlt';
          resultText = goalFailureText(definition, {
            simDay,
            averageStress,
            finalStress: averageStress
          });
        } else {
          status = 'active';
          statusText = averageStress <= 30 ? 'Stabil' : 'Unter Druck';
        }
        break;
      }
      case 'clean_finish': {
        progress = Math.min(definition.target, Math.round(qualityScore));
        progressText = `Qualität ${progress}/${definition.target}`;
        if (finalize && endReason === 'harvest' && qualityScore >= definition.target) {
          status = 'completed';
          statusText = 'Ziel erreicht';
          resultText = 'Der Run wurde mit einer starken Abschlussqualität beendet.';
        } else if (finalize) {
          status = 'failed';
          statusText = 'Ziel verfehlt';
          resultText = goalFailureText(definition, { qualityScore });
        } else {
          statusText = 'In Arbeit';
        }
        break;
      }
      case 'reach_harvest': {
        progress = endReason === 'harvest' || phase === 'harvest' ? definition.target : stageIndex;
        progress = Math.min(definition.target, progress);
        progressText = endReason === 'harvest' || phase === 'harvest'
          ? 'Ernte erreicht'
          : `${STAGE_LABELS[Math.max(0, stageIndex)] || 'Frühe Phase'}`;
        if (endReason === 'harvest' || phase === 'harvest') {
          status = 'completed';
          statusText = 'Ziel erreicht';
          resultText = 'Die Pflanze wurde erfolgreich bis zur Ernte getragen.';
        } else if (finalize) {
          status = 'failed';
          statusText = 'Ziel verfehlt';
          resultText = goalFailureText(definition, {});
        } else {
          statusText = 'Läuft';
        }
        break;
      }
      default:
        break;
    }

    return {
      ...goal,
      title: definition.title,
      description: definition.description,
      progress,
      target: definition.target,
      rewardXp: definition.rewardXp,
      status,
      statusText,
      progressText,
      resultText
    };
  }

  function resolveUnlocksForLevelRange(fromLevel, toLevel) {
    const unlocked = [];
    const startLevel = Math.max(1, Math.trunc(Number(fromLevel) || 1)) + 1;
    const endLevel = Math.max(1, Math.trunc(Number(toLevel) || 1));
    for (let level = startLevel; level <= endLevel; level += 1) {
      const rewards = UNLOCKS_BY_LEVEL[level];
      if (!Array.isArray(rewards)) {
        continue;
      }
      for (const reward of rewards) {
        const meta = getUnlockMeta(reward.category, reward.value);
        unlocked.push({
          category: reward.category,
          value: reward.value,
          level,
          title: meta ? meta.title : reward.value,
          effect: meta ? meta.effect : ''
        });
      }
    }
    return unlocked;
  }

  function mergeUnlockReward(profile, reward) {
    if (!profile || !reward) {
      return false;
    }
    const category = String(reward.category || '');
    const value = String(reward.value || '');
    if (!category || !value || !Array.isArray(profile.unlocks[category])) {
      return false;
    }
    if (profile.unlocks[category].includes(value)) {
      return false;
    }
    profile.unlocks[category].push(value);
    return true;
  }

  function finalizeRunState(snapshot, reason, nowMs) {
    const stateLike = snapshot && typeof snapshot === 'object' ? snapshot : {};
    stateLike.profile = normalizeProfile(stateLike.profile);
    stateLike.run = normalizeRunState(stateLike.run);

    if (isRunFinalized(stateLike.run)) {
      return {
        finalized: false,
        alreadyFinalized: true,
        profile: stateLike.profile,
        run: stateLike.run,
        summary: stateLike.profile.lastRunSummary || null
      };
    }

    const safeReason = reason === 'harvest' ? 'harvest' : 'death';
    const endedAtRealMs = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
    const summary = buildRunSummaryFromState(stateLike, safeReason, endedAtRealMs);
    summary.goal = evaluateRunGoal(stateLike.run.goal, stateLike, {
      finalize: true,
      endReason: safeReason
    });
    const xpBreakdown = computeXpBreakdown(summary);
    const previousLevel = getLevelForXp(stateLike.profile.totalXp);
    stateLike.profile.totalXp += xpBreakdown.total;
    stateLike.profile.level = getLevelForXp(stateLike.profile.totalXp);

    const unlockedThisRun = [];
    for (const reward of resolveUnlocksForLevelRange(previousLevel, stateLike.profile.level)) {
      if (mergeUnlockReward(stateLike.profile, reward)) {
        unlockedThisRun.push(reward);
      }
    }

    stateLike.profile.stats.totalRuns += 1;
    if (safeReason === 'death') {
      stateLike.profile.stats.deathRuns += 1;
    } else {
      stateLike.profile.stats.harvestRuns += 1;
    }
    stateLike.profile.stats.bestSimDay = Math.max(stateLike.profile.stats.bestSimDay, summary.simDay);
    stateLike.profile.stats.bestQualityScore = round2(Math.max(stateLike.profile.stats.bestQualityScore, summary.qualityScore));

    summary.xpBreakdown = xpBreakdown;
    summary.awardedXp = xpBreakdown.total;
    summary.levelBefore = previousLevel;
    summary.levelAfter = stateLike.profile.level;
    summary.unlockedThisRun = unlockedThisRun;
    const insights = buildSummaryInsights(summary);
    summary.rating = insights.rating;
    summary.highlights = insights.highlights;
    summary.mistakes = insights.mistakes;
    summary.positives = insights.positives;
    summary.xpNotices = insights.xpNotices;

    stateLike.profile.lastRunSummary = summary;
    stateLike.run.status = 'ended';
    stateLike.run.endReason = safeReason;
    stateLike.run.endedAtRealMs = endedAtRealMs;
    stateLike.run.finalizedAtRealMs = endedAtRealMs;
    stateLike.run.goal = summary.goal;

    return {
      finalized: true,
      alreadyFinalized: false,
      profile: stateLike.profile,
      run: stateLike.run,
      summary
    };
  }

  function shouldAutoFinalizeHarvest(snapshot) {
    const stateLike = snapshot && typeof snapshot === 'object' ? snapshot : {};
    const run = normalizeRunState(stateLike.run);
    if (run.status !== 'active' || isRunFinalized(run)) {
      return false;
    }
    const plant = stateLike.plant || {};
    const phase = String(plant.phase || '');
    const stageIndex = clampInt(Number(plant.stageIndex) || 0, 0, 11);
    const stageKey = String(plant.stageKey || '');
    return phase === 'harvest' && (stageIndex >= 11 || stageKey === 'stage_12');
  }

  const api = Object.freeze({
    LEVEL_THRESHOLDS,
    SETUP_OPTION_META,
    UNLOCKS_BY_LEVEL,
    getDefaultProfile,
    getDefaultRunState,
    getGoalDefinition,
    normalizeRunGoal,
    chooseRunGoal,
    evaluateRunGoal,
    normalizeProfile,
    normalizeRunState,
    getLevelForXp,
    getLevelThreshold,
    getNextLevelThreshold,
    getLevelProgress,
    getUnlockMeta,
    isSetupOptionUnlocked,
    sanitizeSetupChoice,
    getSetupOptionPresentation,
    getRunBuildPresentation,
    deriveQualityScoreFromState,
    getQualityTier,
    computeXpBreakdown,
    buildSummaryInsights,
    resolveRunRating,
    buildRunSummaryFromState,
    finalizeRunState,
    shouldAutoFinalizeHarvest,
    isRunFinalized,
    SUMMARY_TEXT
  });

  globalScope.GrowSimProgression = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
}(typeof window !== 'undefined' ? window : globalThis));
