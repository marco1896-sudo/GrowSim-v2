'use strict';

const { createDeltaGatePolicy } = require('./DeltaGatePolicy');

const PRESETS = Object.freeze({
  relaxed: Object.freeze({ allowedNewErrors: 5, minHealthScore: 45, allowRequiredEscalations: true, blockedEscalationFamilies: [], familyEscalationBudget: { schema: 3, crossReference: 3 } }),
  development: Object.freeze({ allowedNewErrors: 2, minHealthScore: 60, allowRequiredEscalations: false, blockedEscalationFamilies: ['crossReference'], familyEscalationBudget: { schema: 2, asset: 2, quality: 2 } }),
  releaseCandidate: Object.freeze({ allowedNewErrors: 0, minHealthScore: 75, allowRequiredEscalations: false, blockedEscalationFamilies: ['schema', 'crossReference', 'asset'], familyEscalationBudget: { i18n: 1, quality: 1 } }),
  strict: Object.freeze({ allowedNewErrors: 0, minHealthScore: 85, allowRequiredEscalations: false, blockOnAnyEscalation: true, blockedEscalationFamilies: ['schema', 'i18n', 'asset', 'crossReference', 'quality'], familyEscalationBudget: { scoring: 0, future: 0 } })
});

function createPresetPolicy(presetName, overrides) {
  const key = PRESETS[presetName] ? presetName : 'development';
  const config = Object.assign({}, PRESETS[key], overrides || {});
  return createDeltaGatePolicy(Object.assign({ name: 'preset_' + key }, config));
}

function listPresetNames() {
  return Object.freeze(Object.keys(PRESETS));
}

module.exports = Object.freeze({
  PRESETS,
  createPresetPolicy,
  listPresetNames
});
