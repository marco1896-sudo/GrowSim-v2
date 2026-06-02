'use strict';

const FAMILY_BY_STAGE = Object.freeze({
  development: Object.freeze({ schema: 1.0, i18n: 0.8, asset: 0.8, crossReference: 1.0, quality: 0.9, scoring: 0.6, future: 0.5 }),
  internal: Object.freeze({ schema: 1.1, i18n: 0.9, asset: 0.9, crossReference: 1.1, quality: 1.0, scoring: 0.7, future: 0.5 }),
  beta: Object.freeze({ schema: 1.2, i18n: 1.0, asset: 1.0, crossReference: 1.2, quality: 1.1, scoring: 0.8, future: 0.5 }),
  releaseCandidate: Object.freeze({ schema: 1.3, i18n: 1.1, asset: 1.1, crossReference: 1.3, quality: 1.2, scoring: 0.9, future: 0.5 }),
  production: Object.freeze({ schema: 1.4, i18n: 1.2, asset: 1.2, crossReference: 1.4, quality: 1.3, scoring: 1.0, future: 0.5 })
});

function getCalibration(stage) {
  const key = FAMILY_BY_STAGE[stage] ? stage : 'development';
  return Object.freeze({
    stage: key,
    ruleFamilyWeights: Object.freeze(Object.assign({}, FAMILY_BY_STAGE[key]))
  });
}

module.exports = Object.freeze({
  getCalibration
});
