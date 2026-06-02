'use strict';

const { createAssertionVersion } = require('./AssertionVersion');
const { DEFAULT_ASSERTIONS } = require('./ScenarioAssertionRegistry');

const REGISTRY = Object.freeze([
  Object.freeze({
    version: 'v1',
    assertionSetId: 'default-assertions',
    createdAt: '2026-05-12T00:00:00.000Z',
    reason: 'Initial deterministic assertion set.',
    assertions: DEFAULT_ASSERTIONS,
    compatibilityNotes: 'Compatible with Phase 13+ assertion modules.'
  })
]);

function listAssertionVersions() {
  return Object.freeze(REGISTRY.map((entry) => createAssertionVersion(entry)));
}

function getAssertionVersion(version) {
  const found = REGISTRY.find((entry) => entry.version === version);
  return found ? createAssertionVersion(found) : null;
}

function getLatestAssertionVersion() {
  return REGISTRY.length > 0 ? createAssertionVersion(REGISTRY[REGISTRY.length - 1]) : null;
}

module.exports = Object.freeze({ listAssertionVersions, getAssertionVersion, getLatestAssertionVersion });
