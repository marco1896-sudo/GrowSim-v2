'use strict';

function createAssertionVersion(input) {
  const value = input || {};
  return Object.freeze({
    version: value.version || 'v1',
    assertionSetId: value.assertionSetId || 'default-assertions',
    createdAt: value.createdAt || new Date().toISOString(),
    reason: value.reason || 'Initial version',
    assertions: Object.freeze(Array.isArray(value.assertions) ? value.assertions : []),
    compatibilityNotes: value.compatibilityNotes || ''
  });
}

module.exports = Object.freeze({ createAssertionVersion });
