'use strict';

const RULES = Object.freeze({
  schemaPresence: Object.freeze({
    id: 'schema_presence',
    description: 'Expected schema file must exist for each known example type.'
  }),
  supportedExampleType: Object.freeze({
    id: 'supported_example_type',
    description: 'Example file suffix must map to event/chain/learning-card.'
  }),
  jsonRootObject: Object.freeze({
    id: 'json_root_object',
    description: 'Parsed JSON root should be an object.'
  }),
  // TODO(phase-3+): add AssetRef, i18n, stage/setup/category and QR checks.
});

module.exports = RULES;
