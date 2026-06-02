'use strict';

const { createReportSnapshot } = require('./ReportSnapshot');
const { computeDeltaReport } = require('./DeltaReport');
const { normalizeBaselineType } = require('./BaselineType');

function createBaselineRegistry(initialItems) {
  const map = new Map();

  (Array.isArray(initialItems) ? initialItems : []).forEach((item) => {
    const baseline = registerBaseline(item);
    map.set(baseline.id, baseline);
  });

  function registerBaseline(input) {
    const value = input || {};
    const snapshot = createReportSnapshot(value.snapshot || value);
    const id = value.id || snapshot.id || ('baseline_' + String(map.size + 1));
    const baseline = Object.freeze({
      id,
      type: normalizeBaselineType(value.type),
      label: value.label || id,
      snapshot
    });
    map.set(id, baseline);
    return baseline;
  }

  function getBaseline(id) {
    return map.get(id) || null;
  }

  function listBaselines() {
    return Object.freeze(Array.from(map.values()));
  }

  function compareAgainst(id, snapshotInput) {
    const baseline = getBaseline(id);
    if (!baseline) return null;
    const snapshot = createReportSnapshot(snapshotInput || {});
    return computeDeltaReport(baseline.snapshot, snapshot);
  }

  return Object.freeze({
    registerBaseline,
    getBaseline,
    listBaselines,
    compareAgainst
  });
}

module.exports = Object.freeze({
  createBaselineRegistry
});
