'use strict';

(function initEventV2CatalogToUiAdapter(globalScope) {
  const isNode = typeof require !== 'undefined';
  function safeRequire(name, fallback) {
    return (globalScope && globalScope[name]) || fallback || {};
  }

  const SlotContract = safeRequire('EventV2UiSlotContract', isNode ? require('../contracts/EventV2UiSlotContract.js') : {});
  const SlotFallbacks = safeRequire('EventV2UiSlotFallbacks', isNode ? require('../contracts/EventV2UiSlotFallbacks.js') : {});
  const TextContract = safeRequire('EventV2UiTextBudgetContract', isNode ? require('../contracts/EventV2UiTextBudgetContract.js') : {});
  const LocaleResolver = safeRequire('EventV2LocaleResolver', isNode ? require('./EventV2LocaleResolver.js') : {});
  const AssetResolver = safeRequire('EventV2AssetResolver', isNode ? require('./EventV2AssetResolver.js') : {});
  const Diagnostics = safeRequire('EventV2UiAdapterDiagnostics', isNode ? require('./EventV2UiAdapterDiagnostics.js') : {});

  function toStageLabel(eventDoc) {
    const stage = eventDoc && eventDoc.triggers && eventDoc.triggers.stage;
    if (stage && (typeof stage.min === 'number' || typeof stage.max === 'number')) {
      return 'S' + (stage.min || '?') + '-S' + (stage.max || '?');
    }
    return eventDoc && eventDoc.stage ? String(eventDoc.stage) : 'S?-S?';
  }

  function toSetup(eventDoc) {
    const modeIn = eventDoc && eventDoc.triggers && eventDoc.triggers.setup && eventDoc.triggers.setup.modeIn;
    if (Array.isArray(modeIn) && modeIn.length === 1) return modeIn[0];
    if (Array.isArray(modeIn) && modeIn.length > 1) return 'shared';
    return 'shared';
  }

  function mapDecisionQuality(option) {
    if (option && option.isDeliberateMistake) return 'risky';
    if (option && Array.isArray(option.recommendedIn) && option.recommendedIn.length > 0) return 'recommended';
    if (option && option.quality && ['recommended', 'situational', 'risky'].indexOf(option.quality) >= 0) return option.quality;
    return SlotFallbacks.FALLBACKS.decisionQuality || 'situational';
  }

  function mapDecisions(eventDoc, localeBundle, options, diagnostics) {
    const list = Array.isArray(eventDoc && eventDoc.options) ? eventDoc.options : [];
    return list.slice(0, 3).map((option, index) => {
      const labelResolved = LocaleResolver.resolveText(option.label, localeBundle, {
        locale: options.locale,
        fallbackLocale: options.fallbackLocale,
        fallbackText: (SlotFallbacks.FALLBACKS.decisionLabel || 'Option') + ' ' + (index + 1)
      });
      if (labelResolved.missing) {
        diagnostics.push(Diagnostics.createDiagnostic(
          'ui_adapter_locale_missing_decision_label',
          Diagnostics.SEVERITY.error,
          'Decision label locale key missing',
          { eventId: eventDoc.id, optionId: option.id, key: option.label && option.label.key }
        ));
      }

      const detailKey = option && option.id ? { key: 'options_details.' + option.id } : null;
      const detailResolved = LocaleResolver.resolveText(
        option.uiDetail || option.detail || detailKey,
        localeBundle,
        {
          locale: options.locale,
          fallbackLocale: options.fallbackLocale,
          fallbackText: SlotFallbacks.FALLBACKS.decisionDetail
        }
      );
      if (detailResolved.missing && detailKey) {
        diagnostics.push(Diagnostics.createDiagnostic(
          'ui_adapter_locale_missing_decision_detail',
          Diagnostics.SEVERITY.info,
          'Decision detail locale key missing, fallback used',
          { eventId: eventDoc.id, optionId: option.id, key: detailKey.key }
        ));
      }
      return {
        id: option.id || ('decision_' + index),
        label: labelResolved.text,
        detail: detailResolved.text,
        quality: mapDecisionQuality(option)
      };
    });
  }

  function mapLearning(learningCardDoc, localeBundle, options, diagnostics) {
    if (!learningCardDoc) {
      return null;
    }

    const title = LocaleResolver.resolveText(learningCardDoc.title, localeBundle, {
      locale: options.locale,
      fallbackLocale: options.fallbackLocale,
      fallbackText: SlotFallbacks.FALLBACKS.learning.title
    });
    const subtitle = LocaleResolver.resolveText(learningCardDoc.subtitle, localeBundle, {
      locale: options.locale,
      fallbackLocale: options.fallbackLocale,
      fallbackText: SlotFallbacks.FALLBACKS.learning.subtitle
    });

    const bullets = (((learningCardDoc || {}).content || {}).bullets || [])
      .slice(0, 3)
      .map((entry) => LocaleResolver.resolveText(entry, localeBundle, {
        locale: options.locale,
        fallbackLocale: options.fallbackLocale,
        fallbackText: ''
      }).text)
      .filter(Boolean);

    if (bullets.length === 0) {
      diagnostics.push(Diagnostics.createDiagnostic(
        'ui_adapter_learning_missing_bullets',
        Diagnostics.SEVERITY.warning,
        'Learning card has no resolved bullets',
        { learningCardId: learningCardDoc.id }
      ));
    }

    return {
      title: title.text,
      subtitle: subtitle.text,
      bullets: bullets
    };
  }

  function pushMissingDiagnostics(eventDoc, uiModel, diagnostics) {
    if (!uiModel.title) {
      diagnostics.push(Diagnostics.createDiagnostic(
        'ui_adapter_missing_title',
        Diagnostics.SEVERITY.blocker,
        'Missing title in mapped UI event',
        { eventId: eventDoc.id }
      ));
    }
    if (!Array.isArray(uiModel.decisions) || uiModel.decisions.length < 2) {
      diagnostics.push(Diagnostics.createDiagnostic(
        'ui_adapter_missing_decisions',
        Diagnostics.SEVERITY.blocker,
        'At least two decisions are required',
        { eventId: eventDoc.id }
      ));
    }
    if (!uiModel.hero || !uiModel.hero.hasHero) {
      diagnostics.push(Diagnostics.createDiagnostic(
        'ui_adapter_missing_hero',
        Diagnostics.SEVERITY.warning,
        'Hero image missing, fallback used',
        { eventId: eventDoc.id }
      ));
    }
    if (!uiModel.learningCard) {
      diagnostics.push(Diagnostics.createDiagnostic(
        'ui_adapter_missing_learning_card',
        Diagnostics.SEVERITY.warning,
        'Learning card reference unresolved or missing',
        { eventId: eventDoc.id }
      ));
    }
    if (!uiModel.aftermath) {
      diagnostics.push(Diagnostics.createDiagnostic(
        'ui_adapter_missing_aftermath',
        Diagnostics.SEVERITY.warning,
        'Aftermath text missing',
        { eventId: eventDoc.id }
      ));
    }
  }

  function pushBudgetDiagnostic(slotName, value, diagnostics, options) {
    if (!TextContract.validateTextLength) return;
    const result = TextContract.validateTextLength(slotName, value, options);
    if (!result || result.status === 'ok' || result.status === 'unknown') return;
    const severity = result.status === 'long' ? Diagnostics.SEVERITY.warning : Diagnostics.SEVERITY.info;
    diagnostics.push(Diagnostics.createDiagnostic(
      'ui_adapter_budget_' + result.status,
      severity,
      'Text budget check for slot "' + slotName + '"',
      { slotName, length: result.length, budget: result.budget }
    ));
  }

  function mapEventToUiLabModel(eventDoc, learningCardDoc, localeBundle, options) {
    const opts = Object.assign({ locale: 'de', fallbackLocale: 'en', compactMode: false }, options || {});
    const diagnostics = [];
    const hero = AssetResolver.resolveHeroAsset(eventDoc, {
      placeholder: SlotFallbacks.FALLBACKS.hero.src
    });

    const titleResolved = LocaleResolver.resolveText(eventDoc && eventDoc.title, localeBundle, {
      locale: opts.locale,
      fallbackLocale: opts.fallbackLocale,
      fallbackText: SlotFallbacks.FALLBACKS.title
    });
    const symptomResolved = LocaleResolver.resolveText(eventDoc && eventDoc.shortSymptom, localeBundle, {
      locale: opts.locale,
      fallbackLocale: opts.fallbackLocale,
      fallbackText: SlotFallbacks.FALLBACKS.symptom
    });
    const coachSummary = LocaleResolver.resolveText(eventDoc && eventDoc.coach && eventDoc.coach.summary, localeBundle, {
      locale: opts.locale,
      fallbackLocale: opts.fallbackLocale,
      fallbackText: SlotFallbacks.FALLBACKS.coachSummary
    });
    const coachWhy = LocaleResolver.resolveText(eventDoc && eventDoc.coach && eventDoc.coach.why, localeBundle, {
      locale: opts.locale,
      fallbackLocale: opts.fallbackLocale,
      fallbackText: SlotFallbacks.FALLBACKS.coachWhy
    });
    const lesson = LocaleResolver.resolveText(eventDoc && eventDoc.aftermathProfile && eventDoc.aftermathProfile.lesson, localeBundle, {
      locale: opts.locale,
      fallbackLocale: opts.fallbackLocale,
      fallbackText: SlotFallbacks.FALLBACKS.aftermath.text
    });
    const heroAlt = LocaleResolver.resolveText({ key: hero.altKey }, localeBundle, {
      locale: opts.locale,
      fallbackLocale: opts.fallbackLocale,
      fallbackText: titleResolved.text || SlotFallbacks.FALLBACKS.hero.alt
    });

    if (titleResolved.missing) {
      diagnostics.push(Diagnostics.createDiagnostic(
        'ui_adapter_locale_missing_title',
        Diagnostics.SEVERITY.error,
        'Title locale key missing',
        { eventId: eventDoc.id, key: eventDoc && eventDoc.title && eventDoc.title.key }
      ));
    }

    const decisions = mapDecisions(eventDoc, localeBundle, opts, diagnostics);
    const learning = mapLearning(learningCardDoc, localeBundle, opts, diagnostics);

    const uiModel = {
      id: eventDoc && eventDoc.id,
      setup: toSetup(eventDoc),
      category: (eventDoc && eventDoc.category) || 'unknown',
      stage: toStageLabel(eventDoc),
      severity: ((eventDoc && eventDoc.severity && eventDoc.severity.level) || 'warning'),
      hero: {
        src: hero.srcNormalized,
        rawSrc: hero.src,
        fallbackSrc: hero.fallbackNormalized,
        alt: heroAlt.text,
        hasHero: hero.hasHero,
        usedFallback: hero.usedFallback
      },
      title: titleResolved.text,
      symptom: symptomResolved.text,
      coach: {
        summary: coachSummary.text,
        why: coachWhy.text,
        actions: Array.isArray(eventDoc && eventDoc.coach && eventDoc.coach.actions)
          ? eventDoc.coach.actions
            .map((entry) => LocaleResolver.resolveText(entry, localeBundle, {
              locale: opts.locale,
              fallbackLocale: opts.fallbackLocale,
              fallbackText: ''
            }).text)
            .filter(Boolean)
          : SlotFallbacks.FALLBACKS.coachActions
      },
      decisions: decisions,
      learningCard: learning,
      aftermath: lesson.text
    };

    pushMissingDiagnostics(eventDoc, uiModel, diagnostics);

    pushBudgetDiagnostic('title', uiModel.title, diagnostics);
    pushBudgetDiagnostic('symptom', uiModel.symptom, diagnostics);
    pushBudgetDiagnostic('coachSummary', uiModel.coach.summary, diagnostics);
    pushBudgetDiagnostic('coachWhy', uiModel.coach.why, diagnostics);
    pushBudgetDiagnostic('aftermath', uiModel.aftermath, diagnostics);
    (uiModel.decisions || []).forEach((item) => {
      pushBudgetDiagnostic('decisionLabel', item.label, diagnostics);
      pushBudgetDiagnostic('decisionDetail', item.detail, diagnostics, {
        maxOverride: opts.compactMode ? TextContract.COMPACT_MODE.decisionDetailMax360 : null
      });
    });

    return {
      uiModel,
      diagnostics,
      summary: Diagnostics.summarizeDiagnostics(diagnostics),
      contract: {
        slotContract: SlotContract.SLOT_CONTRACT || {},
        slotGroups: SlotContract.SLOT_GROUPS || {},
        textBudget: TextContract.TEXT_BUDGET || {}
      }
    };
  }

  const api = Object.freeze({
    mapEventToUiLabModel
  });

  globalScope.EventV2CatalogToUiAdapter = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
