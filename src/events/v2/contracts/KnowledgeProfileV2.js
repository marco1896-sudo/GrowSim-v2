'use strict';

/**
 * Contract stub for KnowledgeProfileV2 shape.
 * Phase 1: fixed domain keys, no runtime behavior.
 */
const KnowledgeProfileV2Contract = Object.freeze({
  name: 'KnowledgeProfileV2',
  domains: Object.freeze([
    'watering',
    'nutrients',
    'climate_vpd',
    'light_ppfd',
    'rootzone',
    'pests',
    'training',
    'harvest',
    'patience',
    'observation'
  ])
});

module.exports = KnowledgeProfileV2Contract;
