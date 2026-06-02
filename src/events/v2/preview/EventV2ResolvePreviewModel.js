'use strict';

(function (globalScope) {
  const FALLBACK_COPY_LABELS = Object.freeze({
    devTest: 'Testmodus',
    noWrite: 'Nur Vorschau \u00b7 nichts wird gespeichert',
    noResolve: 'Keine Entscheidung m\u00f6glich',
    noGameplayActivation: 'Kein Einfluss auf deinen Spielstand',
  });

  let previewCopyLabels = FALLBACK_COPY_LABELS;
  let feedbackCopyApi = null;
  if (typeof module !== 'undefined' && module.exports) {
    try {
      previewCopyLabels = require('./EventV2PreviewCopyLabels.js').EVENT_V2_PREVIEW_COPY_LABELS || FALLBACK_COPY_LABELS;
    } catch (_) {
      previewCopyLabels = FALLBACK_COPY_LABELS;
    }
    try {
      feedbackCopyApi = require('./EventV2ResolveFeedbackCopy.js');
    } catch (_) {
      feedbackCopyApi = null;
    }
  } else if (globalScope && globalScope.EventV2PreviewCopyLabels) {
    previewCopyLabels = globalScope.EventV2PreviewCopyLabels.EVENT_V2_PREVIEW_COPY_LABELS || FALLBACK_COPY_LABELS;
    feedbackCopyApi = globalScope.EventV2ResolveFeedbackCopy || null;
  }

  const RESOLVE_PREVIEW_DEFAULT_QUESTION = 'Was m\u00f6chtest du tun?';
  const RESOLVE_PREVIEW_DEFAULT_MODE = 'event_v2_resolve_preview_no_write';

  function toSafeString(value, fallback) {
    const text = typeof value === 'string' ? value.trim() : '';
    return text || String(fallback || '');
  }

  function toSafeNumber(value, fallback) {
    const num = Number(value);
    return Number.isFinite(num) ? num : Number(fallback || 0);
  }

  function pickStrategy(candidate) {
    const eventId = toSafeString(candidate && candidate.eventId, '').toLowerCase();
    const severity = toSafeString(candidate && candidate.severity, '').toLowerCase();
    const score = toSafeNumber(candidate && candidate.score, 0);
    const isBaseline = String(candidate && candidate.fixtureId || '').includes('healthy_baseline');
    const isStressy = score >= 120
      || severity === 'high'
      || /heat|dry|stress|mismatch|rootball|risk/.test(eventId);
    if (isBaseline) return 'baseline';
    if (isStressy) return 'stress';
    return 'mixed';
  }

  function createOption(optionId, label, expectedQuality, feedbackPreview, plannedEffectsPreview) {
    return {
      optionId: toSafeString(optionId, 'observe'),
      label: toSafeString(label, 'Erst beobachten'),
      intent: optionId,
      expectedQuality: expectedQuality === 'bad' ? 'bad' : 'good',
      feedbackPreview: toSafeString(feedbackPreview, 'Vorschau-Feedback ist aktuell nicht verf\u00fcgbar.'),
      plannedEffectsPreview: {
        stress: toSafeNumber(plannedEffectsPreview && plannedEffectsPreview.stress, 0),
        risk: toSafeNumber(plannedEffectsPreview && plannedEffectsPreview.risk, 0),
        notes: ['preview_only_no_write'],
      },
      canApply: false,
      canResolve: false,
    };
  }

  function buildOptionsForStrategy(strategy) {
    if (strategy === 'baseline') {
      return [
        createOption('observe', 'Weiter beobachten', 'good', 'Gute Entscheidung: Beobachtung h\u00e4lt die Lage stabil und vermeidet \u00dcbersteuerung.', { stress: 0, risk: -1 }),
        createOption('wait', 'Noch nichts \u00e4ndern', 'good', 'Plausibel: Bei stabiler Lage ist kontrolliertes Abwarten oft sinnvoll.', { stress: 0, risk: 0 }),
        createOption('overreact', 'Unn\u00f6tig eingreifen', 'bad', 'Riskant: Unn\u00f6tige Eingriffe k\u00f6nnen neue Stresssignale ausl\u00f6sen.', { stress: 2, risk: 1 }),
      ];
    }
    if (strategy === 'stress') {
      return [
        createOption('inspect', 'Erst genauer pr\u00fcfen', 'good', 'Gute Entscheidung: Eine kurze Pr\u00fcfung verhindert falsche Ma\u00dfnahmen.', { stress: 0, risk: -1 }),
        createOption('stabilize', 'Bedingungen vorsichtig stabilisieren', 'good', 'Plausibel: Sanfte Stabilisierung kann Druck kontrolliert senken.', { stress: -1, risk: -1 }),
        createOption('overreact', 'Sofort stark eingreifen', 'bad', 'Das w\u00e4re wahrscheinlich zu viel und k\u00f6nnte zus\u00e4tzlichen Stress erzeugen.', { stress: 2, risk: 1 }),
      ];
    }
    return [
      createOption('observe', 'Erst beobachten', 'good', 'Plausibel: Beobachtung schafft Klarheit vor einer Anpassung.', { stress: 0, risk: -1 }),
      createOption('stabilize', 'Vorsichtig stabilisieren', 'good', 'Gute Entscheidung: Kleine Korrekturen sind in gemischten Lagen oft robuster.', { stress: -1, risk: 0 }),
      createOption('overreact', 'Zu stark reagieren', 'bad', 'Riskant: \u00dcberreaktionen verschlechtern gemischte Lagen oft.', { stress: 1, risk: 1 }),
    ];
  }

  function buildEventV2ResolvePreview(candidate, options) {
    const safeCandidate = candidate && typeof candidate === 'object' ? candidate : {};
    const opts = options && typeof options === 'object' ? options : {};
    const strategy = pickStrategy(safeCandidate);
    const builtOptions = buildOptionsForStrategy(strategy).slice(0, 3);
    const minTwo = builtOptions.length >= 2 ? builtOptions : [
      createOption('observe', 'Erst beobachten', 'good', 'Gute Entscheidung: Erst beobachten verhindert unn\u00f6tigen Stress.', { stress: 0, risk: -1 }),
      createOption('overreact', 'Sofort stark eingreifen', 'bad', 'Das w\u00e4re wahrscheinlich zu viel und k\u00f6nnte zus\u00e4tzlichen Stress erzeugen.', { stress: 2, risk: 1 }),
    ];
    const enrichedOptions = minTwo.map((option) => {
      if (feedbackCopyApi && typeof feedbackCopyApi.enrichResolvePreviewOptionWithFeedback === 'function') {
        return feedbackCopyApi.enrichResolvePreviewOptionWithFeedback(safeCandidate, option);
      }
      return Object.assign({}, option, {
        learningPreview: '',
        feedbackSource: 'generic_fallback',
        feedbackContext: null,
      });
    });

    return {
      ok: true,
      mode: RESOLVE_PREVIEW_DEFAULT_MODE,
      eventId: toSafeString(safeCandidate.eventId, 'unknown_event'),
      candidateId: safeCandidate.id == null ? null : String(safeCandidate.id),
      title: toSafeString(safeCandidate.title, safeCandidate.eventId || 'Event V2 Candidate'),
      question: toSafeString(opts.question, RESOLVE_PREVIEW_DEFAULT_QUESTION),
      options: enrichedOptions,
      safetyLabels: [
        previewCopyLabels.devTest,
        previewCopyLabels.noWrite,
        previewCopyLabels.noResolve,
        previewCopyLabels.noGameplayActivation,
      ],
      actions: [],
      selectedCandidate: null,
      persistedSelectedCandidate: null,
      canResolve: false,
      canApplyEffects: false,
      canActivateGameplay: false,
      canMutateState: false,
      canMutateSave: false,
      runtimeWriteEnabled: false,
      productionEnabled: false,
      diagnostics: {
        stateMutations: 0,
        saveWrites: 0,
        localStorageWrites: 0,
        indexedDbWrites: 0,
        uiActions: 0,
        gameplayActivations: 0,
      },
    };
  }

  const api = Object.freeze({
    buildEventV2ResolvePreview,
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (globalScope && globalScope.window) {
    globalScope.EventV2ResolvePreviewModel = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
