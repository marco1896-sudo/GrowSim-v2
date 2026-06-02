'use strict';

function classifyCatalogEntry(fileName) {
  const lower = String(fileName || '').toLowerCase();
  if (lower.endsWith('.event.json')) return 'event';
  if (lower.endsWith('.chain.json')) return 'chain';
  if (lower.endsWith('.learning-card.json')) return 'learning-card';
  return 'unknown';
}

function classifyCatalogRecord(record) {
  const fromFile = classifyCatalogEntry(record && record.fileName);
  if (fromFile !== 'unknown') return fromFile;
  const type = String(record && record.data && record.data.type || '').toLowerCase();
  if (type === 'event' || type === 'story_beat') return 'event';
  if (type === 'chain') return 'chain';
  if (type === 'learning-card' || type === 'learning_card') return 'learning-card';
  return 'unknown';
}

module.exports = Object.freeze({
  classifyCatalogEntry,
  classifyCatalogRecord
});
