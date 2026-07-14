'use strict';

(function attachGrowSimBuddyCareRiskEngine(globalScope) {
  const STATUS_PRIORITY = Object.freeze({
    red: 0,
    yellow: 1,
    gray: 2,
    green: 3
  });

  const STATUS_LABEL_KEYS = Object.freeze({
    gray: 'buddyCare.risk.status.gray',
    green: 'buddyCare.risk.status.green',
    yellow: 'buddyCare.risk.status.yellow',
    red: 'buddyCare.risk.status.red'
  });

  const STATUS_MESSAGE_KEYS = Object.freeze({
    gray: 'buddyCare.risk.message.gray',
    green: 'buddyCare.risk.message.green',
    yellow: 'buddyCare.risk.message.yellow',
    red: 'buddyCare.risk.message.red'
  });

  const STATUS_DIARY_TIP_KEYS = Object.freeze({
    yellow: 'buddyCare.risk.diary_tip.yellow',
    red: 'buddyCare.risk.diary_tip.red'
  });

  const STATUS_RECOMMENDATION_KEYS = Object.freeze({
    gray: Object.freeze([
      'buddyCare.risk.recommendation.gray_check',
      'buddyCare.risk.recommendation.gray_data',
      'buddyCare.risk.recommendation.gray_diary'
    ]),
    green: Object.freeze([
      'buddyCare.risk.recommendation.green_routine',
      'buddyCare.risk.recommendation.green_note',
      'buddyCare.risk.recommendation.green_tomorrow'
    ]),
    yellow: Object.freeze([
      'buddyCare.risk.recommendation.yellow_document',
      'buddyCare.risk.recommendation.yellow_compare',
      'buddyCare.risk.recommendation.yellow_not_many_changes'
    ]),
    red: Object.freeze([
      'buddyCare.risk.recommendation.red_check',
      'buddyCare.risk.recommendation.red_document',
      'buddyCare.risk.recommendation.red_compare'
    ])
  });

  const AGGREGATE_MESSAGE_KEYS = Object.freeze({
    all_gray: 'buddyCare.risk.aggregate.all_gray',
    all_green: 'buddyCare.risk.aggregate.all_green',
    has_yellow: 'buddyCare.risk.aggregate.has_yellow',
    has_red: 'buddyCare.risk.aggregate.has_red'
  });

  const COPY = Object.freeze({
    de: Object.freeze({
      [STATUS_LABEL_KEYS.gray]: 'Noch zu wenig Daten',
      [STATUS_LABEL_KEYS.green]: 'Unauffaellig',
      [STATUS_LABEL_KEYS.yellow]: 'Genauer beobachten',
      [STATUS_LABEL_KEYS.red]: 'Heute pruefen',
      [STATUS_MESSAGE_KEYS.gray]: 'Ich brauche noch einen Tagescheck, bevor ich die Pflanze sinnvoll einschaetzen kann.',
      [STATUS_MESSAGE_KEYS.green]: 'Alles wirkt unauffaellig. Heute reicht eine ruhige Kontrolle.',
      [STATUS_MESSAGE_KEYS.yellow]: 'Eine Sache faellt auf. Kein Grund zur Panik - beobachte genauer und vergleiche morgen erneut.',
      [STATUS_MESSAGE_KEYS.red]: 'Mehrere Signale fallen auf. Pruefe die Pflanze heute in Ruhe und dokumentiere die Veraenderung.',
      [STATUS_RECOMMENDATION_KEYS.gray[0]]: 'Tagescheck starten',
      [STATUS_RECOMMENDATION_KEYS.gray[1]]: 'Pflanzendaten pruefen',
      [STATUS_RECOMMENDATION_KEYS.gray[2]]: 'ersten Tagebuch-Eintrag ergaenzen',
      [STATUS_RECOMMENDATION_KEYS.green[0]]: 'Routine beibehalten',
      [STATUS_RECOMMENDATION_KEYS.green[1]]: 'optional Notiz ergaenzen',
      [STATUS_RECOMMENDATION_KEYS.green[2]]: 'morgen erneut kurz pruefen',
      [STATUS_RECOMMENDATION_KEYS.yellow[0]]: 'auffaellige Stelle dokumentieren',
      [STATUS_RECOMMENDATION_KEYS.yellow[1]]: 'morgen erneut vergleichen',
      [STATUS_RECOMMENDATION_KEYS.yellow[2]]: 'nicht mehrere Dinge gleichzeitig aendern',
      [STATUS_RECOMMENDATION_KEYS.red[0]]: 'Pflanze heute in Ruhe pruefen',
      [STATUS_RECOMMENDATION_KEYS.red[1]]: 'Beobachtung notieren',
      [STATUS_RECOMMENDATION_KEYS.red[2]]: 'morgen Vergleich durchfuehren',
      [AGGREGATE_MESSAGE_KEYS.all_gray]: 'Buddy sagt: Starte mit einem kurzen Tagescheck, damit ich deine Pflanzen besser einordnen kann.',
      [AGGREGATE_MESSAGE_KEYS.all_green]: 'Buddy sagt: Heute wirkt alles ruhig. Halte deine Routine bei und dokumentiere kurz.',
      [AGGREGATE_MESSAGE_KEYS.has_yellow]: 'Buddy sagt: Eine Pflanze solltest du genauer beobachten. Kein Grund zur Panik - ein sauberer Vergleich hilft.',
      [AGGREGATE_MESSAGE_KEYS.has_red]: 'Buddy sagt: Eine Pflanze braucht heute deine Aufmerksamkeit. Pruefe sie in Ruhe und dokumentiere, was du siehst.',
      [STATUS_DIARY_TIP_KEYS.yellow]: 'Buddy-Tipp: Ergaenze heute eine kurze Notiz, damit du morgen vergleichen kannst.',
      [STATUS_DIARY_TIP_KEYS.red]: 'Buddy-Tipp: Dokumentiere die auffaellige Stelle heute besonders genau.'
    }),
    en: Object.freeze({
      [STATUS_LABEL_KEYS.gray]: 'Not enough data yet',
      [STATUS_LABEL_KEYS.green]: 'Looks calm',
      [STATUS_LABEL_KEYS.yellow]: 'Watch more closely',
      [STATUS_LABEL_KEYS.red]: 'Check today',
      [STATUS_MESSAGE_KEYS.gray]: 'I still need a daily check before I can place this plant more clearly.',
      [STATUS_MESSAGE_KEYS.green]: 'Everything looks calm. A quiet check is enough today.',
      [STATUS_MESSAGE_KEYS.yellow]: 'One thing stands out. No reason to panic - watch more closely and compare again tomorrow.',
      [STATUS_MESSAGE_KEYS.red]: 'Several signals stand out. Check the plant calmly today and document the change.',
      [STATUS_RECOMMENDATION_KEYS.gray[0]]: 'start a daily check',
      [STATUS_RECOMMENDATION_KEYS.gray[1]]: 'review plant data',
      [STATUS_RECOMMENDATION_KEYS.gray[2]]: 'add a first diary note',
      [STATUS_RECOMMENDATION_KEYS.green[0]]: 'keep your routine',
      [STATUS_RECOMMENDATION_KEYS.green[1]]: 'optionally add a note',
      [STATUS_RECOMMENDATION_KEYS.green[2]]: 'check again briefly tomorrow',
      [STATUS_RECOMMENDATION_KEYS.yellow[0]]: 'document the noticeable spot',
      [STATUS_RECOMMENDATION_KEYS.yellow[1]]: 'compare again tomorrow',
      [STATUS_RECOMMENDATION_KEYS.yellow[2]]: 'do not change several things at once',
      [STATUS_RECOMMENDATION_KEYS.red[0]]: 'check the plant calmly today',
      [STATUS_RECOMMENDATION_KEYS.red[1]]: 'write down the observation',
      [STATUS_RECOMMENDATION_KEYS.red[2]]: 'compare again tomorrow',
      [AGGREGATE_MESSAGE_KEYS.all_gray]: 'Buddy says: Start with a short daily check so I can place your plants more clearly.',
      [AGGREGATE_MESSAGE_KEYS.all_green]: 'Buddy says: Everything feels calm today. Keep your routine and add a short note.',
      [AGGREGATE_MESSAGE_KEYS.has_yellow]: 'Buddy says: One plant deserves a closer look. No reason to panic - a clean comparison helps.',
      [AGGREGATE_MESSAGE_KEYS.has_red]: 'Buddy says: One plant needs your attention today. Check it calmly and document what you see.',
      [STATUS_DIARY_TIP_KEYS.yellow]: 'Buddy tip: Add a short note today so you can compare tomorrow.',
      [STATUS_DIARY_TIP_KEYS.red]: 'Buddy tip: Document the noticeable area especially carefully today.'
    }),
    es: Object.freeze({
      [STATUS_LABEL_KEYS.gray]: 'Aun faltan datos',
      [STATUS_LABEL_KEYS.green]: 'Sin senales llamativas',
      [STATUS_LABEL_KEYS.yellow]: 'Observar con mas atencion',
      [STATUS_LABEL_KEYS.red]: 'Revisar hoy',
      [STATUS_MESSAGE_KEYS.gray]: 'Todavia necesito un daily check antes de poder ubicar mejor esta planta.',
      [STATUS_MESSAGE_KEYS.green]: 'Todo parece tranquilo. Hoy basta con una revision serena.',
      [STATUS_MESSAGE_KEYS.yellow]: 'Hay una senal llamativa. No hay motivo para entrar en panico: observa con mas atencion y compara manana.',
      [STATUS_MESSAGE_KEYS.red]: 'Hay varias senales llamativas. Revisa la planta con calma hoy y documenta el cambio.',
      [STATUS_RECOMMENDATION_KEYS.gray[0]]: 'iniciar daily check',
      [STATUS_RECOMMENDATION_KEYS.gray[1]]: 'revisar los datos de la planta',
      [STATUS_RECOMMENDATION_KEYS.gray[2]]: 'anadir la primera nota al diario',
      [STATUS_RECOMMENDATION_KEYS.green[0]]: 'mantener la rutina',
      [STATUS_RECOMMENDATION_KEYS.green[1]]: 'anadir una nota opcional',
      [STATUS_RECOMMENDATION_KEYS.green[2]]: 'volver a revisar manana brevemente',
      [STATUS_RECOMMENDATION_KEYS.yellow[0]]: 'documentar la zona llamativa',
      [STATUS_RECOMMENDATION_KEYS.yellow[1]]: 'comparar otra vez manana',
      [STATUS_RECOMMENDATION_KEYS.yellow[2]]: 'no cambiar varias cosas a la vez',
      [STATUS_RECOMMENDATION_KEYS.red[0]]: 'revisar la planta con calma hoy',
      [STATUS_RECOMMENDATION_KEYS.red[1]]: 'anotar la observacion',
      [STATUS_RECOMMENDATION_KEYS.red[2]]: 'hacer la comparacion manana',
      [AGGREGATE_MESSAGE_KEYS.all_gray]: 'Buddy dice: Empieza con un daily check corto para que pueda ubicar mejor tus plantas.',
      [AGGREGATE_MESSAGE_KEYS.all_green]: 'Buddy dice: Hoy todo parece tranquilo. Mantén tu rutina y deja una nota breve.',
      [AGGREGATE_MESSAGE_KEYS.has_yellow]: 'Buddy dice: Una planta merece una observacion mas atenta. No hay motivo para el panico: una comparacion limpia ayuda.',
      [AGGREGATE_MESSAGE_KEYS.has_red]: 'Buddy dice: Una planta necesita tu atencion hoy. Revisa con calma y documenta lo que ves.',
      [STATUS_DIARY_TIP_KEYS.yellow]: 'Consejo de Buddy: anade hoy una nota breve para poder comparar manana.',
      [STATUS_DIARY_TIP_KEYS.red]: 'Consejo de Buddy: documenta hoy con especial cuidado la zona llamativa.'
    })
  });

  function normalizeLocale(locale) {
    const safeLocale = String(locale || '').trim().toLowerCase();
    if (safeLocale === 'de' || safeLocale.startsWith('de-')) {
      return 'de';
    }
    if (safeLocale === 'es' || safeLocale.startsWith('es-')) {
      return 'es';
    }
    return 'en';
  }

  function getCopyValue(key, locale) {
    const safeLocale = normalizeLocale(locale);
    const languagePack = COPY[safeLocale] || COPY.en;
    return languagePack[key] || COPY.en[key] || String(key || '');
  }

  function toArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function normalizeTimestamp(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    const safeValue = String(value || '').trim();
    if (!safeValue) {
      return null;
    }
    const parsed = Date.parse(safeValue);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function normalizeNow(now) {
    return normalizeTimestamp(now) || Date.now();
  }

  function getCheckTimestamp(check) {
    const safeCheck = check && typeof check === 'object' ? check : {};
    return normalizeTimestamp(safeCheck.createdAtIso)
      || normalizeTimestamp(safeCheck.createdAt)
      || normalizeTimestamp(safeCheck.dayKey);
  }

  function isAttentionWorthy(check) {
    const safeCheck = check && typeof check === 'object' ? check : {};
    return (safeCheck.leafState !== 'normal' && safeCheck.leafState !== 'unknown')
      || safeCheck.pestsVisible === 'yes'
      || safeCheck.pestsVisible === 'unsure'
      || (safeCheck.environmentStress !== 'normal' && safeCheck.environmentStress !== 'unknown')
      || safeCheck.growthState === 'slow'
      || (safeCheck.mediumMoisture === 'wet' && safeCheck.leafState === 'hanging');
  }

  function createSignal(plantId, nowMs, riskType, severity, titleKey, messageKey, recommendedActionType) {
    return Object.freeze({
      id: `${String(plantId || '').trim() || 'plant'}:${riskType}:${severity}`,
      plantId: String(plantId || '').trim(),
      detectedAt: new Date(normalizeNow(nowMs)).toISOString(),
      riskType,
      severity,
      titleKey,
      messageKey,
      recommendedActionType
    });
  }

  function hasDiaryIssueTagToday(entries) {
    return toArray(entries).some((entry) => (
      entry
      && Array.isArray(entry.tags)
      && entry.tags.some((tag) => String(tag || '').trim().toLowerCase() === 'issue')
    ));
  }

  function countRecentAttentionChecks(checks, nowMs, withinMs) {
    return toArray(checks).filter((check) => {
      if (!isAttentionWorthy(check)) {
        return false;
      }
      const timestamp = getCheckTimestamp(check);
      if (!Number.isFinite(timestamp)) {
        return false;
      }
      return nowMs - timestamp <= withinMs;
    }).length;
  }

  function evaluatePlantCareRisk(plant, context = {}) {
    const safePlant = plant && typeof plant === 'object' ? plant : null;
    const safePlantId = String(safePlant && safePlant.id || '').trim();
    const latestDailyCheck = context && context.latestDailyCheck && typeof context.latestDailyCheck === 'object'
      ? context.latestDailyCheck
      : null;
    const dailyChecks = toArray(context && context.dailyChecks);
    const todayDiaryEntries = toArray(context && context.todayDiaryEntries);
    const nowMs = normalizeNow(context && context.now);
    const signals = [];
    let yellowSignalCount = 0;
    const latestCheckNeedsAttention = String(context && context.dailyCheckStatus || '').trim().toLowerCase() === 'needs_attention';

    function addYellowSignal(riskType, titleKey, messageKey, recommendedActionType) {
      yellowSignalCount += 1;
      signals.push(createSignal(safePlantId, nowMs, riskType, 'medium', titleKey, messageKey, recommendedActionType));
    }

    if (!safePlant || !safePlantId || !latestDailyCheck) {
      return Object.freeze({
        plantId: safePlantId,
        status: 'gray',
        priority: STATUS_PRIORITY.gray,
        labelKey: STATUS_LABEL_KEYS.gray,
        buddyMessageKey: STATUS_MESSAGE_KEYS.gray,
        recommendationKeys: STATUS_RECOMMENDATION_KEYS.gray.slice(),
        diaryTipKey: '',
        signals: Object.freeze([])
      });
    }

    if (latestDailyCheck.pestsVisible === 'yes') {
      signals.push(createSignal(safePlantId, nowMs, 'pest_watch', 'high', 'buddyCare.risk.signal.pest_title', 'buddyCare.risk.signal.pest_message', 'check'));
    }
    if (latestDailyCheck.mediumMoisture === 'wet' && latestDailyCheck.leafState === 'hanging') {
      signals.push(createSignal(safePlantId, nowMs, 'moisture_watch', 'high', 'buddyCare.risk.signal.moisture_title', 'buddyCare.risk.signal.moisture_message', 'review'));
    }

    if (latestDailyCheck.leafState !== 'normal' && latestDailyCheck.leafState !== 'unknown') {
      addYellowSignal('leaf_watch', 'buddyCare.risk.signal.leaf_title', 'buddyCare.risk.signal.leaf_message', 'observe');
    }
    if (latestDailyCheck.growthState === 'slow') {
      addYellowSignal('general', 'buddyCare.risk.signal.growth_title', 'buddyCare.risk.signal.growth_message', 'observe');
    }
    if (latestDailyCheck.environmentStress !== 'normal' && latestDailyCheck.environmentStress !== 'unknown') {
      addYellowSignal('environment_watch', 'buddyCare.risk.signal.environment_title', 'buddyCare.risk.signal.environment_message', 'review');
    }
    if (latestDailyCheck.pestsVisible === 'unsure') {
      addYellowSignal('pest_watch', 'buddyCare.risk.signal.pest_unsure_title', 'buddyCare.risk.signal.pest_unsure_message', 'check');
    }
    if (hasDiaryIssueTagToday(todayDiaryEntries)) {
      addYellowSignal('general', 'buddyCare.risk.signal.diary_issue_title', 'buddyCare.risk.signal.diary_issue_message', 'document');
    }
    if (latestCheckNeedsAttention && yellowSignalCount === 0 && !signals.length) {
      addYellowSignal('general', 'buddyCare.risk.signal.attention_title', 'buddyCare.risk.signal.attention_message', 'observe');
    }

    if (countRecentAttentionChecks(dailyChecks, nowMs, 48 * 60 * 60 * 1000) >= 2) {
      signals.push(createSignal(safePlantId, nowMs, 'repeat_attention', 'high', 'buddyCare.risk.signal.repeat_title', 'buddyCare.risk.signal.repeat_message', 'review'));
    }

    const highSignals = signals.filter((signal) => signal.severity === 'high');
    if (highSignals.length > 0 || yellowSignalCount >= 2) {
      return Object.freeze({
        plantId: safePlantId,
        status: 'red',
        priority: STATUS_PRIORITY.red,
        labelKey: STATUS_LABEL_KEYS.red,
        buddyMessageKey: STATUS_MESSAGE_KEYS.red,
        recommendationKeys: STATUS_RECOMMENDATION_KEYS.red.slice(),
        diaryTipKey: STATUS_DIARY_TIP_KEYS.red,
        signals: Object.freeze(signals.slice())
      });
    }

    if (yellowSignalCount >= 1) {
      return Object.freeze({
        plantId: safePlantId,
        status: 'yellow',
        priority: STATUS_PRIORITY.yellow,
        labelKey: STATUS_LABEL_KEYS.yellow,
        buddyMessageKey: STATUS_MESSAGE_KEYS.yellow,
        recommendationKeys: STATUS_RECOMMENDATION_KEYS.yellow.slice(),
        diaryTipKey: STATUS_DIARY_TIP_KEYS.yellow,
        signals: Object.freeze(signals.slice())
      });
    }

    return Object.freeze({
      plantId: safePlantId,
      status: 'green',
      priority: STATUS_PRIORITY.green,
      labelKey: STATUS_LABEL_KEYS.green,
      buddyMessageKey: STATUS_MESSAGE_KEYS.green,
      recommendationKeys: STATUS_RECOMMENDATION_KEYS.green.slice(),
      diaryTipKey: '',
      signals: Object.freeze([])
    });
  }

  function resolvePlantContext(plantId, context = {}) {
    const safePlantId = String(plantId || '').trim();
    const latestDailyCheck = context && context.latestDailyCheckByPlantId && context.latestDailyCheckByPlantId[safePlantId]
      ? context.latestDailyCheckByPlantId[safePlantId]
      : context.latestDailyCheck;
    const dailyChecks = context && context.dailyChecksByPlantId && Array.isArray(context.dailyChecksByPlantId[safePlantId])
      ? context.dailyChecksByPlantId[safePlantId]
      : (Array.isArray(context.dailyChecks)
        ? context.dailyChecks.filter((entry) => String(entry && entry.plantId || '').trim() === safePlantId)
        : []);
    const diaryEntries = context && context.diaryEntriesByPlantId && Array.isArray(context.diaryEntriesByPlantId[safePlantId])
      ? context.diaryEntriesByPlantId[safePlantId]
      : (Array.isArray(context.diaryEntries)
        ? context.diaryEntries.filter((entry) => String(entry && entry.plantId || '').trim() === safePlantId)
        : []);
    const todayDiaryEntries = context && context.todayDiaryEntriesByPlantId && Array.isArray(context.todayDiaryEntriesByPlantId[safePlantId])
      ? context.todayDiaryEntriesByPlantId[safePlantId]
      : (Array.isArray(context.todayDiaryEntries)
        ? context.todayDiaryEntries.filter((entry) => String(entry && entry.plantId || '').trim() === safePlantId)
        : []);
    const todayTasks = context && context.todayTasksByPlantId && Array.isArray(context.todayTasksByPlantId[safePlantId])
      ? context.todayTasksByPlantId[safePlantId]
      : (Array.isArray(context.todayTasks) ? context.todayTasks : []);
    return {
      latestDailyCheck,
      dailyChecks,
      diaryEntries,
      todayDiaryEntries,
      todayTasks,
      now: context && context.now
    };
  }

  function evaluateAllPlantCareRisks(plants, context = {}) {
    return toArray(plants)
      .map((plant) => {
        const safePlant = plant && typeof plant === 'object' ? plant : {};
        return evaluatePlantCareRisk(safePlant, resolvePlantContext(safePlant.id, context));
      })
      .sort((left, right) => {
        const leftPriority = Number(left && left.priority);
        const rightPriority = Number(right && right.priority);
        const priorityDelta = (Number.isFinite(leftPriority) ? leftPriority : 99) - (Number.isFinite(rightPriority) ? rightPriority : 99);
        if (priorityDelta !== 0) {
          return priorityDelta;
        }
        return String(left.plantId || '').localeCompare(String(right.plantId || ''));
      });
  }

  function getRiskLabel(status, locale = 'en') {
    const safeStatus = String(status || '').trim().toLowerCase();
    return getCopyValue(STATUS_LABEL_KEYS[safeStatus] || STATUS_LABEL_KEYS.gray, locale);
  }

  function getRiskBuddyMessage(status, signals, locale = 'en') {
    const safeStatus = String(status || '').trim().toLowerCase();
    const safeSignals = toArray(signals);
    if (safeStatus === 'red' && safeSignals.some((signal) => signal && signal.riskType === 'repeat_attention')) {
      return getCopyValue(STATUS_MESSAGE_KEYS.red, locale);
    }
    return getCopyValue(STATUS_MESSAGE_KEYS[safeStatus] || STATUS_MESSAGE_KEYS.gray, locale);
  }

  function getRiskRecommendations(status, signals, locale = 'en') {
    const safeStatus = String(status || '').trim().toLowerCase();
    const safeSignals = toArray(signals);
    let keys = STATUS_RECOMMENDATION_KEYS[safeStatus] || STATUS_RECOMMENDATION_KEYS.gray;
    if (safeStatus === 'red' && safeSignals.some((signal) => signal && signal.riskType === 'pest_watch')) {
      keys = STATUS_RECOMMENDATION_KEYS.red;
    }
    return keys.map((key) => getCopyValue(key, locale));
  }

  function getAggregateRiskSummaryKey(evaluations) {
    const safeEvaluations = toArray(evaluations);
    if (!safeEvaluations.length || safeEvaluations.every((entry) => entry && entry.status === 'gray')) {
      return AGGREGATE_MESSAGE_KEYS.all_gray;
    }
    if (safeEvaluations.some((entry) => entry && entry.status === 'red')) {
      return AGGREGATE_MESSAGE_KEYS.has_red;
    }
    if (safeEvaluations.some((entry) => entry && entry.status === 'yellow')) {
      return AGGREGATE_MESSAGE_KEYS.has_yellow;
    }
    return AGGREGATE_MESSAGE_KEYS.all_green;
  }

  const api = Object.freeze({
    STATUS_PRIORITY,
    STATUS_LABEL_KEYS,
    STATUS_MESSAGE_KEYS,
    STATUS_RECOMMENDATION_KEYS,
    STATUS_DIARY_TIP_KEYS,
    AGGREGATE_MESSAGE_KEYS,
    evaluatePlantCareRisk,
    evaluateAllPlantCareRisks,
    getAggregateRiskSummaryKey,
    getRiskLabel,
    getRiskBuddyMessage,
    getRiskRecommendations
  });

  globalScope.GrowSimBuddyCareRiskEngine = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
