'use strict';

const { createReportSnapshot } = require('./ReportSnapshot');
const { computeDeltaReport } = require('./DeltaReport');

function createSnapshotHistory(input) {
  const value = input || {};
  const baseline = value.baseline || null;
  const snapshots = Array.isArray(value.snapshots) ? value.snapshots.slice() : [];

  function addSnapshot(snapshotInput) {
    const snapshot = createReportSnapshot(snapshotInput);
    snapshots.push(snapshot);
    return snapshot;
  }

  function getLatestSnapshot() {
    return snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  }

  function compareLatestToBaseline() {
    const latest = getLatestSnapshot();
    if (!baseline || !latest) {
      return null;
    }
    return computeDeltaReport(baseline, latest);
  }

  function listSnapshots() {
    return Object.freeze(snapshots.slice());
  }

  return Object.freeze({
    baseline,
    addSnapshot,
    getLatestSnapshot,
    compareLatestToBaseline,
    listSnapshots
  });
}

module.exports = Object.freeze({
  createSnapshotHistory
});
