'use strict';

const { createRuleProfile } = require('./RuleProfile');

const PROFILES = Object.freeze({
  event: createRuleProfile({
    type: 'event',
    requiredFields: ['id', 'schemaVersion', 'type', 'category', 'title', 'options', 'triggers'],
    recommendedFields: ['shortSymptom', 'i18n', 'assets', 'severity', 'authoring'],
    optionalFields: ['learningCard', 'chainHooks', 'rewards', 'aftermathProfile'],
    futureFields: ['telemetry', 'migration'],
    severityOverrides: {
      qr_missing_stages: 'error'
    }
  }),
  chain: createRuleProfile({
    type: 'chain',
    requiredFields: ['id', 'schemaVersion', 'steps'],
    recommendedFields: ['title', 'summary', 'telemetry', 'authoring'],
    optionalFields: ['preconditions', 'uiBanner'],
    futureFields: ['expectedSpanSimHours'],
    severityOverrides: {
      qr_missing_category: 'info'
    }
  }),
  'learning-card': createRuleProfile({
    type: 'learning-card',
    requiredFields: ['id', 'schemaVersion', 'title', 'content', 'knowledgeProfile'],
    recommendedFields: ['i18n', 'presentation', 'appearsIn', 'authoring'],
    optionalFields: ['subtitle'],
    futureFields: ['telemetry'],
    severityOverrides: {}
  }),
  unknown: createRuleProfile({
    type: 'unknown',
    requiredFields: ['id'],
    recommendedFields: [],
    optionalFields: [],
    futureFields: [],
    severityOverrides: {}
  })
});

function getRuleProfile(kind) {
  return PROFILES[kind] || PROFILES.unknown;
}

module.exports = Object.freeze({
  PROFILES,
  getRuleProfile
});

