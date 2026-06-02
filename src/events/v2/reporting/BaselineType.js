'use strict';

const BaselineType = Object.freeze({
  EXAMPLES_ONLY: 'examplesOnly',
  FIXTURES: 'fixtures',
  DEVELOPMENT: 'development',
  RELEASE_CANDIDATE: 'releaseCandidate',
  STRICT: 'strict'
});

function normalizeBaselineType(value) {
  const raw = String(value || '').trim();
  const values = Object.values(BaselineType);
  return values.indexOf(raw) >= 0 ? raw : BaselineType.DEVELOPMENT;
}

module.exports = Object.freeze({
  BaselineType,
  normalizeBaselineType
});
