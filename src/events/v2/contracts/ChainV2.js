'use strict';

/**
 * Contract stub for Event Chain V2 documents.
 * Phase 1: structural metadata only.
 */
const ChainV2Contract = Object.freeze({
  name: 'ChainV2',
  schemaVersion: 3,
  requiredFields: Object.freeze([
    'chainId',
    'title',
    'setup',
    'acts'
  ])
});

module.exports = ChainV2Contract;
