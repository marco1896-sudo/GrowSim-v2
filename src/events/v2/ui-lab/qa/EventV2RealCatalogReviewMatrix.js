'use strict';

(function initEventV2RealCatalogReviewMatrix(globalScope) {
  const fs = (typeof require !== 'undefined') ? require('fs') : null;
  const path = (typeof require !== 'undefined') ? require('path') : null;

  const Adapter = (globalScope && globalScope.EventV2CatalogToUiAdapter) || (typeof require !== 'undefined' ? require('../adapter/EventV2CatalogToUiAdapter.js') : null);
  const BudgetQa = (globalScope && globalScope.EventV2BudgetQa) || (typeof require !== 'undefined' ? require('./EventV2BudgetQa.js') : null);
  const TextBudget = (globalScope && globalScope.EventV2UiTextBudgetContract) || (typeof require !== 'undefined' ? require('../contracts/EventV2UiTextBudgetContract.js') : null);

  const EVENT_REVIEW_OVERRIDES = Object.freeze({
    indoor_dry_rootball: {
      uiReadability: 'watch',
      textBudget: 'watch',
      decisionClarity: 'pass',
      learningFit: 'pass',
      aftermathClarity: 'pass',
      assetHeroFit: 'watch',
      overallStatus: 'watch',
      notes: 'Strong cause-effect logic. Dense rootball wording at phone width; hero can stay more specific later.'
    },
    indoor_fan_failure_airflow_drop: {
      uiReadability: 'pass',
      textBudget: 'pass',
      decisionClarity: 'pass',
      learningFit: 'pass',
      aftermathClarity: 'pass',
      assetHeroFit: 'watch',
      overallStatus: 'accept',
      notes: 'Good premium coaching flow. Would benefit from a clearer airflow visual later.'
    },
    indoor_heat_stress_air: {
      uiReadability: 'pass',
      textBudget: 'pass',
      decisionClarity: 'pass',
      learningFit: 'pass',
      aftermathClarity: 'pass',
      assetHeroFit: 'watch',
      overallStatus: 'accept',
      notes: 'Heat stress now reads clearly as an air-and-canopy problem, not a watering reflex. Compact readability and action path are strong enough for accept.'
    },
    indoor_light_burn_canopy_top: {
      uiReadability: 'pass',
      textBudget: 'pass',
      decisionClarity: 'pass',
      learningFit: 'pass',
      aftermathClarity: 'pass',
      assetHeroFit: 'watch',
      overallStatus: 'accept',
      notes: 'The light-versus-nutrient distinction is now fast to read and the choice path is premium-clear even on smaller phone widths.'
    },
    indoor_light_nutrient_tox_early: {
      uiReadability: 'watch',
      textBudget: 'watch',
      decisionClarity: 'watch',
      learningFit: 'pass',
      aftermathClarity: 'pass',
      assetHeroFit: 'watch',
      overallStatus: 'watch',
      notes: 'Good realism, but the topic is cognitively dense and needs very clean copy pacing.'
    },
    indoor_overtraining_stall_mild: {
      uiReadability: 'pass',
      textBudget: 'pass',
      decisionClarity: 'watch',
      learningFit: 'pass',
      aftermathClarity: 'pass',
      assetHeroFit: 'watch',
      overallStatus: 'watch',
      notes: 'Teaching value is strong. A future Buddy coach pose could make the recovery tone feel warmer.'
    },
    indoor_overwatering_early: {
      uiReadability: 'watch',
      textBudget: 'watch',
      decisionClarity: 'pass',
      learningFit: 'pass',
      aftermathClarity: 'pass',
      assetHeroFit: 'watch',
      overallStatus: 'watch',
      notes: 'Very solid learning loop. Symptom and why text sit right at the dense end for 360px.'
    },
    indoor_rootzone_airless_medium: {
      uiReadability: 'pass',
      textBudget: 'pass',
      decisionClarity: 'pass',
      learningFit: 'pass',
      aftermathClarity: 'pass',
      assetHeroFit: 'watch',
      overallStatus: 'accept',
      notes: 'Strong specialist lesson with clear action path. Hero can later zoom into medium structure.'
    },
    indoor_soil_ph_out_of_range: {
      uiReadability: 'watch',
      textBudget: 'pass',
      decisionClarity: 'pass',
      learningFit: 'pass',
      aftermathClarity: 'pass',
      assetHeroFit: 'watch',
      overallStatus: 'watch',
      notes: 'pH framing is now more human and the action path is clearer. Still wants a calmer hero later than the generic fallback.'
    },
    indoor_vpd_mismatch_veg: {
      uiReadability: 'watch',
      textBudget: 'pass',
      decisionClarity: 'pass',
      learningFit: 'pass',
      aftermathClarity: 'pass',
      assetHeroFit: 'watch',
      overallStatus: 'watch',
      notes: 'Systems logic now reads in plainer language. Compact UI is calmer, but the topic still benefits from future climate-specific visual support.'
    },
    outdoor_cold_night_stress: {
      uiReadability: 'pass',
      textBudget: 'watch',
      decisionClarity: 'pass',
      learningFit: 'pass',
      aftermathClarity: 'watch',
      assetHeroFit: 'watch',
      overallStatus: 'watch',
      notes: 'Readable overall. Title and aftermath are both near the top of the slot budget.'
    },
    outdoor_early_pest_pressure_leaf_underside: {
      uiReadability: 'watch',
      textBudget: 'watch',
      decisionClarity: 'pass',
      learningFit: 'pass',
      aftermathClarity: 'pass',
      assetHeroFit: 'watch',
      overallStatus: 'watch',
      notes: 'Good observational lesson. Outdoor pest visual will matter a lot for premium feel.'
    },
    outdoor_heatwave_dry_wind: {
      uiReadability: 'watch',
      textBudget: 'pass',
      decisionClarity: 'pass',
      learningFit: 'pass',
      aftermathClarity: 'pass',
      assetHeroFit: 'watch',
      overallStatus: 'watch',
      notes: 'Heat-plus-wind interplay is clearer and shorter now. Still a strong candidate for dedicated premium art because the fallback hero undersells the drama.'
    },
    outdoor_heavy_rain_waterlogging_risk: {
      uiReadability: 'pass',
      textBudget: 'watch',
      decisionClarity: 'pass',
      learningFit: 'pass',
      aftermathClarity: 'watch',
      assetHeroFit: 'pass',
      overallStatus: 'watch',
      notes: 'Clear and grounded. Reads well once hero tells the story fast.'
    },
    outdoor_pot_dries_by_afternoon: {
      uiReadability: 'watch',
      textBudget: 'pass',
      decisionClarity: 'pass',
      learningFit: 'pass',
      aftermathClarity: 'pass',
      assetHeroFit: 'watch',
      overallStatus: 'watch',
      notes: 'The outdoor rhythm lesson is clearer and calmer now. It stays watch because the final premium lift will likely come more from later visual distinction than from more copy.'
    },
    outdoor_wind_exposure_stem_stress: {
      uiReadability: 'pass',
      textBudget: 'watch',
      decisionClarity: 'watch',
      learningFit: 'pass',
      aftermathClarity: 'pass',
      assetHeroFit: 'watch',
      overallStatus: 'watch',
      notes: 'Nice system link to airflow. Visual distinction from heat or VPD needs help later.'
    },
    shared_early_pest_signs_mild: {
      uiReadability: 'watch',
      textBudget: 'pass',
      decisionClarity: 'pass',
      learningFit: 'pass',
      aftermathClarity: 'pass',
      assetHeroFit: 'watch',
      overallStatus: 'watch',
      notes: 'The mild-pest beat is calmer and more scan-friendly now. A later close-up hero can still lift trust and clarity further.'
    },
    shared_light_distance_error: {
      uiReadability: 'watch',
      textBudget: 'watch',
      decisionClarity: 'pass',
      learningFit: 'pass',
      aftermathClarity: 'watch',
      assetHeroFit: 'watch',
      overallStatus: 'watch',
      notes: 'Generic shared framing works, but it needs sharper visual identity than the current fallback.'
    },
    shared_observation_recovery_after_stress: {
      uiReadability: 'pass',
      textBudget: 'pass',
      decisionClarity: 'pass',
      learningFit: 'pass',
      aftermathClarity: 'pass',
      assetHeroFit: 'watch',
      overallStatus: 'accept',
      notes: 'A nice positive beat. Buddy can make this feel especially premium later.'
    },
    shared_panic_watering_misread: {
      uiReadability: 'pass',
      textBudget: 'pass',
      decisionClarity: 'pass',
      learningFit: 'pass',
      aftermathClarity: 'pass',
      assetHeroFit: 'watch',
      overallStatus: 'accept',
      notes: 'The misread-watering lesson now lands quickly and clearly. Strong signal-to-decision flow makes it accept-ready even before bespoke art.'
    },
    shared_rootbound_warning: {
      uiReadability: 'watch',
      textBudget: 'pass',
      decisionClarity: 'pass',
      learningFit: 'watch',
      aftermathClarity: 'pass',
      assetHeroFit: 'watch',
      overallStatus: 'watch',
      notes: 'Root-pressure language is clearer and the repot-vs-more-water decision now reads faster. Learning fit stays watch until rootbound visuals become more distinctive.'
    },
    shared_substrate_drainage_compaction: {
      uiReadability: 'pass',
      textBudget: 'pass',
      decisionClarity: 'pass',
      learningFit: 'pass',
      aftermathClarity: 'pass',
      assetHeroFit: 'watch',
      overallStatus: 'accept',
      notes: 'Drainage and compaction now feel concrete instead of overly technical. The event reads cleanly enough to accept while still leaving room for later visual polish.'
    }
  });

  const LEARNING_CARD_OVERRIDES = Object.freeze({
    lc_airflow_fundamentals: {
      status: 'accept',
      notes: 'Clear and compact. Good shared backbone card for airflow and wind.'
    },
    lc_climate_vpd_basics: {
      status: 'watch',
      notes: 'Still valuable, but conceptually broad and easier to overload in dense events.'
    },
    lc_light_intensity_distance_basics: {
      status: 'accept',
      notes: 'Specific enough for the remapped light events and easy to scan.'
    },
    lc_pest_observation_basics: {
      status: 'accept',
      notes: 'Very clear fit. Good candidate for later visual checklist treatment.'
    },
    lc_ph_nutrient_uptake_basics: {
      status: 'watch',
      notes: 'Useful, but cognitively heavy. Should stay short and visual-first in UI.'
    },
    lc_recovery_observation_basics: {
      status: 'accept',
      notes: 'A calm premium beat that pairs well with supportive Buddy guidance.'
    },
    lc_rootzone_oxygen_basics: {
      status: 'accept',
      notes: 'Strong specialist card with clear cause and effect.'
    },
    lc_training_recovery_basics: {
      status: 'accept',
      notes: 'Focused and helpful. Nicely closes the old temporary gap.'
    },
    lc_watering_basics: {
      status: 'watch',
      notes: 'Still important, but it carries a lot of event traffic and should not absorb rootbound forever.'
    }
  });

  const CHAIN_OVERRIDES = Object.freeze({
    watering_rootzone_chain: {
      status: 'watch',
      strengths: [
        'The causal arc from panic reaction to drainage and root oxygen is easy to explain.',
        'Resolution through observation fits later Buddy guidance well.'
      ],
      risks: [
        'The outdoor dryback branch can read like a side quest if the UI does not make the branch role explicit.',
        'Rootbound is still outside the chain, so the watering story is not yet the full water-pressure map.'
      ],
      recommendation: 'Treat as storyline-lite in UI rather than a hard gameplay ladder.'
    },
    airflow_climate_chain: {
      status: 'watch',
      strengths: [
        'Indoor airflow to VPD to heat escalation is coherent and realistic.',
        'The outdoor branch gives the chain broader reuse without needing runtime activation.'
      ],
      risks: [
        'The indoor-to-outdoor shift needs explicit framing to avoid feeling like a location jump.',
        'Without differentiated visual cards, wind and dry heat can feel too similar in a compact UI.'
      ],
      recommendation: 'Best shown as a contextual systems storyline, not yet as a player-facing chain wizard.'
    }
  });

  function readJson(absolutePath) {
    return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  }

  function resolveLocaleKey(bundle, key, fallbackValue) {
    if (!bundle || typeof key !== 'string' || key.length === 0) {
      return fallbackValue || '';
    }
    const parts = key.split('.');
    let cursor = bundle;
    for (let i = 0; i < parts.length; i += 1) {
      if (!cursor || typeof cursor !== 'object' || !(parts[i] in cursor)) {
        return fallbackValue || key;
      }
      cursor = cursor[parts[i]];
    }
    return typeof cursor === 'string' ? cursor : (fallbackValue || key);
  }

  function loadCatalog(projectRoot) {
    const catalogRoot = path.join(projectRoot, 'data', 'events', 'catalog');
    const localeBundle = {
      de: readJson(path.join(projectRoot, 'src', 'i18n', 'locales', 'de.json')),
      en: readJson(path.join(projectRoot, 'src', 'i18n', 'locales', 'en.json')),
      es: readJson(path.join(projectRoot, 'src', 'i18n', 'locales', 'es.json'))
    };
    const learningCards = {};
    const learningDir = path.join(catalogRoot, 'learning-cards');
    fs.readdirSync(learningDir)
      .filter((name) => name.endsWith('.learning-card.json'))
      .sort()
      .forEach((name) => {
        const doc = readJson(path.join(learningDir, name));
        learningCards[doc.id] = doc;
      });

    const events = [];
    ['indoor', 'outdoor', 'shared'].forEach((sub) => {
      const dir = path.join(catalogRoot, 'events', sub);
      fs.readdirSync(dir)
        .filter((name) => name.endsWith('.event.json'))
        .sort()
        .forEach((name) => {
          events.push(readJson(path.join(dir, name)));
        });
    });

    const chains = fs.readdirSync(path.join(catalogRoot, 'chains'))
      .filter((name) => name.endsWith('.chain.json'))
      .sort()
      .map((name) => readJson(path.join(catalogRoot, 'chains', name)));

    return { catalogRoot, localeBundle, learningCards, events, chains };
  }

  function countLines(text, charBudgetPerLine) {
    if (typeof text !== 'string' || text.length === 0) return 0;
    const budget = Math.max(1, Number(charBudgetPerLine) || 24);
    return Math.ceil(text.length / budget);
  }

  function buildViewportSignals(uiModel) {
    const title = uiModel.title || '';
    const symptom = uiModel.symptom || '';
    const summary = uiModel.coach && uiModel.coach.summary ? uiModel.coach.summary : '';
    const why = uiModel.coach && uiModel.coach.why ? uiModel.coach.why : '';
    const longestDecisionLabel = Math.max.apply(null, (uiModel.decisions || []).map((item) => (item.label || '').length).concat([0]));

    return {
      v360: {
        titleLines: countLines(title, 18),
        symptomLines: countLines(symptom, 33),
        summaryLines: countLines(summary, 33),
        whyLines: countLines(why, 35),
        decisionLabelRisk: longestDecisionLabel >= 30 ? 'watch' : 'pass'
      },
      v390: {
        titleLines: countLines(title, 21),
        symptomLines: countLines(symptom, 37),
        summaryLines: countLines(summary, 37),
        whyLines: countLines(why, 39),
        decisionLabelRisk: longestDecisionLabel >= 31 ? 'watch' : 'pass'
      },
      v430: {
        titleLines: countLines(title, 23),
        symptomLines: countLines(symptom, 42),
        summaryLines: countLines(summary, 42),
        whyLines: countLines(why, 44),
        decisionLabelRisk: longestDecisionLabel >= 32 ? 'watch' : 'pass'
      },
      v768: {
        titleLines: countLines(title, 32),
        symptomLines: countLines(symptom, 70),
        summaryLines: countLines(summary, 70),
        whyLines: countLines(why, 72),
        decisionLabelRisk: 'pass'
      }
    };
  }

  function buildEventReviewMatrix(options) {
    const projectRoot = (options && options.projectRoot) || process.cwd();
    const locale = (options && options.locale) || 'de';
    const data = loadCatalog(projectRoot);
    const localeDoc = data.localeBundle[locale] || data.localeBundle.de;

    return data.events.map((eventDoc) => {
      const learningDoc = eventDoc.learningCard && eventDoc.learningCard.ref
        ? data.learningCards[eventDoc.learningCard.ref]
        : null;
      const mapped = Adapter.mapEventToUiLabModel(eventDoc, learningDoc || null, data.localeBundle, {
        locale,
        fallbackLocale: 'en',
        compactMode: false
      });
      const budget = BudgetQa.evaluateBudgets(mapped.uiModel, TextBudget, { compactMode: false });
      const compactBudget = BudgetQa.evaluateBudgets(mapped.uiModel, TextBudget, { compactMode: true });
      const override = EVENT_REVIEW_OVERRIDES[eventDoc.id] || {};
      const learningKey = learningDoc && learningDoc.title ? learningDoc.title.key : '';
      const learningTitle = resolveLocaleKey(localeDoc, learningKey, learningDoc ? learningDoc.id : '');
      const viewportSignals = buildViewportSignals(mapped.uiModel);
      return {
        eventId: eventDoc.id,
        mode: eventDoc.mode,
        setup: mapped.uiModel.setup,
        category: eventDoc.category,
        stage: eventDoc.stage,
        title: mapped.uiModel.title,
        learningRef: eventDoc.learningCard ? eventDoc.learningCard.ref : null,
        learningTitle,
        uiReadability: override.uiReadability || (compactBudget.warningCount > 0 ? 'watch' : 'pass'),
        textBudget: override.textBudget || (budget.warningCount > 0 || compactBudget.warningCount > 0 ? 'watch' : 'pass'),
        decisionClarity: override.decisionClarity || 'pass',
        learningFit: override.learningFit || 'pass',
        aftermathClarity: override.aftermathClarity || 'pass',
        assetHeroFit: override.assetHeroFit || (mapped.uiModel.hero && mapped.uiModel.hero.hasHero ? 'pass' : 'watch'),
        overallStatus: override.overallStatus || 'accept',
        notes: override.notes || '',
        lengths: {
          title: (mapped.uiModel.title || '').length,
          symptom: (mapped.uiModel.symptom || '').length,
          coachSummary: (mapped.uiModel.coach && mapped.uiModel.coach.summary || '').length,
          coachWhy: (mapped.uiModel.coach && mapped.uiModel.coach.why || '').length,
          aftermath: (mapped.uiModel.aftermath || '').length,
          decisionLabelMax: Math.max.apply(null, (mapped.uiModel.decisions || []).map((item) => (item.label || '').length).concat([0])),
          decisionDetailMax: Math.max.apply(null, (mapped.uiModel.decisions || []).map((item) => (item.detail || '').length).concat([0])),
          learningBulletMax: Math.max.apply(null, (mapped.uiModel.learningCard && mapped.uiModel.learningCard.bullets || []).map((item) => (item || '').length).concat([0]))
        },
        budgetWarnings: {
          regular: budget.warningCount,
          compact: compactBudget.warningCount
        },
        viewportSignals
      };
    }).sort((a, b) => a.eventId.localeCompare(b.eventId));
  }

  function buildLearningCardReview(options) {
    const projectRoot = (options && options.projectRoot) || process.cwd();
    const locale = (options && options.locale) || 'de';
    const data = loadCatalog(projectRoot);
    const localeDoc = data.localeBundle[locale] || data.localeBundle.de;

    return Object.keys(data.learningCards).sort().map((id) => {
      const card = data.learningCards[id];
      const override = LEARNING_CARD_OVERRIDES[id] || {};
      const title = resolveLocaleKey(localeDoc, card.title && card.title.key, id);
      const subtitle = resolveLocaleKey(localeDoc, card.subtitle && card.subtitle.key, '');
      const bullets = (card.content && Array.isArray(card.content.bullets) ? card.content.bullets : [])
        .map((item) => resolveLocaleKey(localeDoc, item.key, item.key));
      return {
        cardId: id,
        title,
        subtitle,
        linkedEventIds: card.appearsIn && Array.isArray(card.appearsIn.linkedEventIds) ? card.appearsIn.linkedEventIds.slice() : [],
        status: override.status || 'accept',
        notes: override.notes || '',
        lengths: {
          title: title.length,
          subtitle: subtitle.length,
          longestBullet: Math.max.apply(null, bullets.map((item) => item.length).concat([0]))
        }
      };
    });
  }

  function buildChainReview(options) {
    const projectRoot = (options && options.projectRoot) || process.cwd();
    const locale = (options && options.locale) || 'de';
    const data = loadCatalog(projectRoot);
    const localeDoc = data.localeBundle[locale] || data.localeBundle.de;

    return data.chains.map((chainDoc) => {
      const override = CHAIN_OVERRIDES[chainDoc.id] || {};
      const title = resolveLocaleKey(localeDoc, chainDoc.title && chainDoc.title.key, chainDoc.id);
      const summary = resolveLocaleKey(localeDoc, chainDoc.summary && chainDoc.summary.key, '');
      const banner = resolveLocaleKey(localeDoc, chainDoc.uiBanner && chainDoc.uiBanner.labelKey, '');
      return {
        chainId: chainDoc.id,
        title,
        summary,
        banner,
        stepCount: Array.isArray(chainDoc.steps) ? chainDoc.steps.length : 0,
        stepEventIds: Array.isArray(chainDoc.steps) ? chainDoc.steps.map((step) => step.eventId) : [],
        status: override.status || 'watch',
        strengths: override.strengths || [],
        risks: override.risks || [],
        recommendation: override.recommendation || ''
      };
    }).sort((a, b) => a.chainId.localeCompare(b.chainId));
  }

  const api = Object.freeze({
    buildEventReviewMatrix,
    buildLearningCardReview,
    buildChainReview
  });

  globalScope.EventV2RealCatalogReviewMatrix = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
