'use strict';

const REGISTRY = Object.freeze({
  event: Object.freeze({
    schemaFile: 'event.schema.json',
    requiredTopFields: Object.freeze(['schemaVersion', 'id', 'type', 'category'])
  }),
  chain: Object.freeze({
    schemaFile: 'chain.schema.json',
    requiredTopFields: Object.freeze(['schemaVersion', 'id', 'steps'])
  }),
  'learning-card': Object.freeze({
    schemaFile: 'learning-card.schema.json',
    requiredTopFields: Object.freeze(['schemaVersion', 'id', 'title', 'content'])
  })
});

function getSchemaRegistration(kind) {
  return REGISTRY[kind] || null;
}

module.exports = Object.freeze({
  REGISTRY,
  getSchemaRegistration
});

