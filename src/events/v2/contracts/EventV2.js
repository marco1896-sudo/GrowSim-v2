'use strict';

/**
 * Contract stub for EventV2 documents.
 * Phase 1: read-only contract metadata only.
 */
const EventV2Contract = Object.freeze({
  name: 'EventV2',
  schemaVersion: 3,
  requiredFields: Object.freeze([
    'eventId',
    'schemaVersion',
    'title',
    'category',
    'setup',
    'stageRange',
    'severity',
    'eventType'
  ])
});

module.exports = EventV2Contract;
