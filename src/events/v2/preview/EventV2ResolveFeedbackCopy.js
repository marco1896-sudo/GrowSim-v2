'use strict';

(function (globalScope) {
  const EVENT_V2_RESOLVE_FEEDBACK_BY_CONTEXT = Object.freeze({
    vpd_mismatch: Object.freeze({
      inspect: Object.freeze({ quality: 'good', short: 'Gute Wahl: Erst prüfen verhindert unnötigen Aktionismus.', learning: 'Bei VPD-Hinweisen wirken Symptome schnell wie Wasserstress. Prüfe Klima und Substrat vor Eingriffen.' }),
      stabilize: Object.freeze({ quality: 'good', short: 'Sinnvoll: Kleine Klima-Korrekturen sind sicherer als harte Eingriffe.', learning: 'VPD stabilisiert man schrittweise, damit kein zusätzlicher Stress entsteht.' }),
      overreact: Object.freeze({ quality: 'bad', short: 'Riskant: Zu starke Eingriffe können den Stress erhöhen.', learning: 'Starkes Gießen oder Düngen ohne Prüfung kann aus einem Hinweis ein echtes Problem machen.' }),
    }),
    dry_rootball: Object.freeze({
      inspect: Object.freeze({ quality: 'good', short: 'Gute Wahl: Erst Feuchteverlauf prüfen, bevor du nachgießt.', learning: 'Ein trockener Rootball braucht oft gestufte Rehydrierung statt hektischer Sofortmaßnahmen.' }),
      stabilize: Object.freeze({ quality: 'good', short: 'Gut: Vorsichtig stabilisieren statt überkorrigieren.', learning: 'Kleine, kontrollierte Anpassungen helfen, Wasseraufnahme wieder ins Gleichgewicht zu bringen.' }),
      overreact: Object.freeze({ quality: 'bad', short: 'Riskant: Zu viel auf einmal kann Wurzelstress verschärfen.', learning: 'Überreaktionen führen oft zu Wechselstress zwischen Trockenheit und Überversorgung.' }),
    }),
    outdoor_heat_dry_wind: Object.freeze({
      inspect: Object.freeze({ quality: 'good', short: 'Gute Wahl: Hitze und Wind zuerst sauber einschätzen.', learning: 'Bei Hitzeereignissen entscheidet das Mikroklima über die richtige Reaktion.' }),
      stabilize: Object.freeze({ quality: 'good', short: 'Sinnvoll: Schutz und Klima sanft stabilisieren.', learning: 'Schrittweise Entlastung reduziert Transpirationsdruck ohne neuen Schock.' }),
      overreact: Object.freeze({ quality: 'bad', short: 'Riskant: Harte Gegenmaßnahmen können zusätzliche Instabilität auslösen.', learning: 'Extremreaktionen bei Hitze/Wind verschlechtern oft die Regenerationsfähigkeit.' }),
    }),
    panic_watering: Object.freeze({
      inspect: Object.freeze({ quality: 'good', short: 'Gute Wahl: Erst Ursache prüfen statt reflexartig zu gießen.', learning: 'Nicht jedes Hängen ist Durst. Kontextcheck verhindert Fehlentscheidungen.' }),
      stabilize: Object.freeze({ quality: 'good', short: 'Gut: Ruhig stabilisieren statt hektisch handeln.', learning: 'Bei Fehlinterpretationen hilft ein kurzer Diagnose-Schritt mehr als schnelle Aktion.' }),
      overreact: Object.freeze({ quality: 'bad', short: 'Riskant: Panikreaktionen verstärken oft das Problem.', learning: 'Blindes Nachgießen kann aus Stressanzeichen schnell Überwässerung machen.' }),
    }),
    overwatering_early: Object.freeze({
      inspect: Object.freeze({ quality: 'good', short: 'Gute Wahl: Substrat und Drainage zuerst prüfen.', learning: 'Frühe Überwässerung erkennt man besser über Muster als über Einzelzeichen.' }),
      stabilize: Object.freeze({ quality: 'good', short: 'Sinnvoll: Wasserregime vorsichtig beruhigen.', learning: 'Ein ruhiger Rhythmus stabilisiert Wurzelraum besser als starke Gegenkorrekturen.' }),
      overreact: Object.freeze({ quality: 'bad', short: 'Riskant: Harte Korrekturen können Wurzeln zusätzlich belasten.', learning: 'Zu starke Gegensteuerung erzeugt oft Folgestress statt Entlastung.' }),
    }),
    healthy_baseline: Object.freeze({
      observe: Object.freeze({ quality: 'good', short: 'Gute Wahl: Bei stabiler Lage ist Beobachten oft optimal.', learning: 'Baseline-Phasen profitieren von Konstanz und ruhiger Verlaufskontrolle.' }),
      wait: Object.freeze({ quality: 'good', short: 'Plausibel: Noch nichts ändern hält die Ruhe im System.', learning: 'Nicht jede Lage braucht Aktion. Stabilität ist hier ein Qualitätsmerkmal.' }),
      overreact: Object.freeze({ quality: 'bad', short: 'Riskant: Unnötiger Eingriff stört einen gesunden Zustand.', learning: 'Bei stabiler Basis kann Übersteuerung neue Probleme erst erzeugen.' }),
    }),
  });

  const CONTEXT_RULES = Object.freeze([
    { key: 'vpd_mismatch', test: (ctx) => /vpd/.test(ctx.eventId) || /vpd/.test(ctx.reason) },
    { key: 'dry_rootball', test: (ctx) => /dry_rootball|rootball/.test(ctx.eventId) },
    { key: 'outdoor_heat_dry_wind', test: (ctx) => /heatwave|dry_wind/.test(ctx.eventId) || /outdoor/.test(ctx.fixtureId) && /heat|dry/.test(ctx.eventId + ' ' + ctx.reason) },
    { key: 'panic_watering', test: (ctx) => /panic_watering|misread/.test(ctx.eventId) },
    { key: 'overwatering_early', test: (ctx) => /overwatering_early/.test(ctx.eventId) },
    { key: 'healthy_baseline', test: (ctx) => /healthy_baseline/.test(ctx.fixtureId) || /baseline/.test(ctx.eventId) },
  ]);

  function safeLower(value) {
    return String(value || '').toLowerCase();
  }

  function deriveContextKey(candidate) {
    const ctx = {
      eventId: safeLower(candidate && candidate.eventId),
      fixtureId: safeLower(candidate && candidate.fixtureId),
      reason: safeLower(candidate && candidate.reason),
    };
    for (const rule of CONTEXT_RULES) {
      if (rule.test(ctx)) return rule.key;
    }
    return null;
  }

  function toFallbackPayload(option, fallback) {
    const source = fallback && typeof fallback === 'object' ? fallback : {};
    return {
      quality: String(source.quality || option.expectedQuality || 'good'),
      short: String(source.short || option.feedbackPreview || 'Vorschau-Feedback ist aktuell nicht verfügbar.'),
      learning: String(source.learning || ''),
      feedbackSource: 'generic_fallback',
      contextKey: null,
    };
  }

  function getEventV2ResolveFeedbackCopy(eventId, optionId, fallback, contextHint) {
    const key = safeLower(contextHint);
    const optionKey = safeLower(optionId);
    const byContext = key && EVENT_V2_RESOLVE_FEEDBACK_BY_CONTEXT[key]
      ? EVENT_V2_RESOLVE_FEEDBACK_BY_CONTEXT[key]
      : null;
    if (!byContext || !byContext[optionKey]) {
      return toFallbackPayload({ optionId, expectedQuality: fallback && fallback.quality, feedbackPreview: fallback && fallback.short }, fallback);
    }
    const entry = byContext[optionKey];
    return {
      quality: String(entry.quality || 'good'),
      short: String(entry.short || ''),
      learning: String(entry.learning || ''),
      feedbackSource: 'event_specific_draft',
      contextKey: key,
    };
  }

  function enrichResolvePreviewOptionWithFeedback(candidate, option) {
    const safeOption = option && typeof option === 'object' ? option : {};
    const contextKey = deriveContextKey(candidate);
    const copy = getEventV2ResolveFeedbackCopy(
      candidate && candidate.eventId,
      safeOption.optionId,
      {
        quality: safeOption.expectedQuality,
        short: safeOption.feedbackPreview,
        learning: safeOption.learningPreview || '',
      },
      contextKey
    );

    return Object.assign({}, safeOption, {
      expectedQuality: copy.quality === 'bad' ? 'bad' : 'good',
      feedbackPreview: copy.short || safeOption.feedbackPreview || 'Vorschau-Feedback ist aktuell nicht verfügbar.',
      learningPreview: copy.learning || '',
      feedbackSource: copy.feedbackSource,
      feedbackContext: copy.contextKey,
      canApply: false,
      canResolve: false,
    });
  }

  const api = Object.freeze({
    EVENT_V2_RESOLVE_FEEDBACK_BY_CONTEXT,
    getEventV2ResolveFeedbackCopy,
    enrichResolvePreviewOptionWithFeedback,
    deriveContextKey,
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (globalScope && globalScope.window) {
    globalScope.EventV2ResolveFeedbackCopy = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
