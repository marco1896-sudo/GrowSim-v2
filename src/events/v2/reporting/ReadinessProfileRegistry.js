'use strict';

const { createReadinessProfile } = require('./ReadinessProfile');

const PROFILES = Object.freeze({
  development: Object.freeze({ id: 'development', minHealthScore: 60, minStageCoverage: 2, minModeCoverage: 2, minCategoryCoverage: 2 }),
  internal: Object.freeze({ id: 'internal', minHealthScore: 68, minStageCoverage: 2, minModeCoverage: 2, minCategoryCoverage: 3 }),
  beta: Object.freeze({ id: 'beta', minHealthScore: 75, minStageCoverage: 3, minModeCoverage: 2, minCategoryCoverage: 3 }),
  releaseCandidate: Object.freeze({ id: 'releaseCandidate', minHealthScore: 82, minStageCoverage: 3, minModeCoverage: 3, minCategoryCoverage: 4 }),
  production: Object.freeze({ id: 'production', minHealthScore: 90, minStageCoverage: 4, minModeCoverage: 3, minCategoryCoverage: 4 })
});

function getReadinessProfile(name) {
  const key = PROFILES[name] ? name : 'development';
  return createReadinessProfile(PROFILES[key]);
}

function hasReadinessProfile(name) {
  return Boolean(PROFILES[name]);
}

function listReadinessProfiles() {
  return Object.freeze(Object.keys(PROFILES).map((key) => createReadinessProfile(PROFILES[key])));
}

module.exports = Object.freeze({
  PROFILES,
  getReadinessProfile,
  listReadinessProfiles,
  hasReadinessProfile
});
