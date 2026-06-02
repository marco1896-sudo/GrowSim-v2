'use strict';

function createDriftTolerance(input) {
  const value = input || {};
  return Object.freeze({
    allowedScoreDelta: Number.isFinite(Number(value.allowedScoreDelta)) ? Number(value.allowedScoreDelta) : 0,
    allowedNewWarnings: Number.isFinite(Number(value.allowedNewWarnings)) ? Number(value.allowedNewWarnings) : 0,
    allowedNewErrors: Number.isFinite(Number(value.allowedNewErrors)) ? Number(value.allowedNewErrors) : 0,
    allowedNewBlockers: Number.isFinite(Number(value.allowedNewBlockers)) ? Number(value.allowedNewBlockers) : 0,
    allowTrafficLightRegression: value.allowTrafficLightRegression === true,
    allowDecisionRegression: value.allowDecisionRegression === true
  });
}

module.exports = Object.freeze({
  createDriftTolerance
});
