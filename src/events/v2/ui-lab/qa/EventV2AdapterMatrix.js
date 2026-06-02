'use strict';

(function initEventV2AdapterMatrix(globalScope) {
  const fs = (typeof require !== 'undefined') ? require('fs') : null;
  const path = (typeof require !== 'undefined') ? require('path') : null;

  const Adapter = (globalScope && globalScope.EventV2CatalogToUiAdapter) || (typeof require !== 'undefined' ? require('../adapter/EventV2CatalogToUiAdapter.js') : null);
  const SlotContract = (globalScope && globalScope.EventV2UiSlotContract) || (typeof require !== 'undefined' ? require('../contracts/EventV2UiSlotContract.js') : null);
  const TextBudget = (globalScope && globalScope.EventV2UiTextBudgetContract) || (typeof require !== 'undefined' ? require('../contracts/EventV2UiTextBudgetContract.js') : null);
  const Completeness = (globalScope && globalScope.EventV2SlotCompleteness) || (typeof require !== 'undefined' ? require('./EventV2SlotCompleteness.js') : null);
  const BudgetQa = (globalScope && globalScope.EventV2BudgetQa) || (typeof require !== 'undefined' ? require('./EventV2BudgetQa.js') : null);
  const BridgeGate = (globalScope && globalScope.EventV2BridgeReadinessGate) || (typeof require !== 'undefined' ? require('./EventV2BridgeReadinessGate.js') : null);
  const Baseline = (globalScope && globalScope.EventV2SlotQaBaseline) || (typeof require !== 'undefined' ? require('./EventV2SlotQaBaseline.js') : null);

  function readJson(absolutePath) {
    return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  }

  function listEventFiles(catalogRoot) {
    const subDirs = ['indoor', 'outdoor', 'shared'];
    const files = [];
    subDirs.forEach((sub) => {
      const dir = path.join(catalogRoot, 'events', sub);
      fs.readdirSync(dir)
        .filter((name) => name.endsWith('.event.json'))
        .forEach((name) => files.push(path.join(dir, name)));
    });
    return files.sort();
  }

  function loadLearningCardIndex(catalogRoot) {
    const dir = path.join(catalogRoot, 'learning-cards');
    const index = {};
    fs.readdirSync(dir)
      .filter((name) => name.endsWith('.learning-card.json'))
      .forEach((name) => {
        const doc = readJson(path.join(dir, name));
        index[doc.id] = doc;
      });
    return index;
  }

  function buildLocaleBundle(projectRoot) {
    return {
      de: readJson(path.join(projectRoot, 'src', 'i18n', 'locales', 'de.json')),
      en: readJson(path.join(projectRoot, 'src', 'i18n', 'locales', 'en.json')),
      es: readJson(path.join(projectRoot, 'src', 'i18n', 'locales', 'es.json'))
    };
  }

  function rowStatus(condition) {
    return condition ? 'ok' : 'missing_or_fallback';
  }

  function runFullAdapterMatrix(options) {
    const projectRoot = options.projectRoot;
    const catalogRoot = path.join(projectRoot, 'data', 'events', 'catalog');
    const localeBundle = buildLocaleBundle(projectRoot);
    const learningIndex = loadLearningCardIndex(catalogRoot);
    const eventFiles = listEventFiles(catalogRoot);

    const rows = eventFiles.map((eventPath) => {
      const eventDoc = readJson(eventPath);
      const learningDoc = eventDoc.learningCard && eventDoc.learningCard.ref ? learningIndex[eventDoc.learningCard.ref] : null;
      const mapped = Adapter.mapEventToUiLabModel(eventDoc, learningDoc || null, localeBundle, {
        locale: (options && options.locale) || 'de',
        fallbackLocale: (options && options.fallbackLocale) || 'en',
        compactMode: Boolean(options && options.compactMode)
      });

      const completeness = Completeness.evaluateSlotCompleteness(mapped.uiModel, SlotContract);
      const budget = BudgetQa.evaluateBudgets(mapped.uiModel, TextBudget, { compactMode: Boolean(options && options.compactMode) });
      const bridge = BridgeGate.evaluateBridgeReadiness({
        completeness: completeness,
        diagnosticSummary: mapped.summary,
        budgetWarningCount: budget.warningCount,
        learningMissingOptional: completeness.optionalMissing.indexOf('learningCard') >= 0
      });

      return {
        eventId: mapped.uiModel.id,
        setup: mapped.uiModel.setup,
        category: mapped.uiModel.category,
        stage: mapped.uiModel.stage,
        heroStatus: mapped.uiModel.hero && mapped.uiModel.hero.hasHero ? 'ok' : 'fallback',
        titleStatus: rowStatus(Boolean(mapped.uiModel.title)),
        symptomStatus: rowStatus(Boolean(mapped.uiModel.symptom)),
        coachStatus: rowStatus(Boolean(mapped.uiModel.coach && mapped.uiModel.coach.summary && mapped.uiModel.coach.why)),
        decisionsCount: Array.isArray(mapped.uiModel.decisions) ? mapped.uiModel.decisions.length : 0,
        learningStatus: mapped.uiModel.learningCard ? 'mapped' : 'missing_optional',
        aftermathStatus: mapped.uiModel.aftermath ? 'mapped' : 'missing_or_fallback',
        blocker: mapped.summary.blocker || 0,
        error: mapped.summary.error || 0,
        warning: mapped.summary.warning || 0,
        info: (mapped.summary.info || 0) + budget.infoCount,
        budgetWarnings: budget.warningCount,
        budgetFindings: budget.findings,
        requiredMissing: completeness.requiredMissing,
        recommendedMissing: completeness.recommendedMissing,
        optionalMissing: completeness.optionalMissing,
        requiredComplete: completeness.requiredComplete,
        bridgeReadiness: bridge.bridgeReadiness,
        bridgeReasons: bridge.reasons
      };
    });

    return {
      rows,
      baseline: Baseline.buildSlotQaBaseline(rows)
    };
  }

  const api = Object.freeze({
    runFullAdapterMatrix
  });

  globalScope.EventV2AdapterMatrix = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

