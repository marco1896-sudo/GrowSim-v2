'use strict';

function createReadinessProfile(input) {
  const value = input || {};
  return Object.freeze({
    id: value.id || 'development',
    minHealthScore: Number.isFinite(Number(value.minHealthScore)) ? Number(value.minHealthScore) : 70,
    minStageCoverage: Number.isFinite(Number(value.minStageCoverage)) ? Number(value.minStageCoverage) : 2,
    minModeCoverage: Number.isFinite(Number(value.minModeCoverage)) ? Number(value.minModeCoverage) : 2,
    minCategoryCoverage: Number.isFinite(Number(value.minCategoryCoverage)) ? Number(value.minCategoryCoverage) : 2
  });
}

module.exports = Object.freeze({
  createReadinessProfile
});
