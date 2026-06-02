'use strict';

/**
 * Contract stub for LearningCardV2 documents.
 * Phase 1: contract surface only.
 */
const LearningCardV2Contract = Object.freeze({
  name: 'LearningCardV2',
  schemaVersion: 3,
  requiredFields: Object.freeze([
    'id',
    'title',
    'content',
    'knowledgeProfile'
  ])
});

module.exports = LearningCardV2Contract;
