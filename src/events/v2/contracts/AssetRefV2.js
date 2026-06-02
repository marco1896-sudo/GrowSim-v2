'use strict';

/**
 * Contract stub for AssetRefV2 documents.
 * Phase 1: reference shape only.
 */
const AssetRefV2Contract = Object.freeze({
  name: 'AssetRefV2',
  requiredFields: Object.freeze([
    'assetId',
    'groupId',
    'tier',
    'path'
  ])
});

module.exports = AssetRefV2Contract;
