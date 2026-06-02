'use strict';

const { createReportSnapshot } = require('./ReportSnapshot');

function createBaselineSnapshot(input) {
  const value = input || {};
  const snapshot = createReportSnapshot(value.snapshot || value);
  return Object.freeze({
    id: value.id || snapshot.id || 'baseline',
    label: value.label || snapshot.label || 'Baseline',
    createdAt: value.createdAt || snapshot.createdAt,
    snapshot: snapshot,
    metadata: Object.freeze(value.metadata || {})
  });
}

module.exports = Object.freeze({
  createBaselineSnapshot
});
