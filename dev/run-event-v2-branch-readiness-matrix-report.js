#!/usr/bin/env node
/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const {
  runEventV2BranchReadinessMatrixPreview,
} = require('../src/events/v2/preview/EventV2BranchReadinessMatrixPreview.js');

function writeArtifacts(rootDir, report) {
  const planningDir = path.join(rootDir, 'data', 'events', 'catalog', '_planning');
  fs.mkdirSync(planningDir, { recursive: true });

  const jsonPath = path.join(planningDir, 'phase-next-v2-branch-readiness-matrix-report.json');
  const mdPath = path.join(planningDir, 'phase-next-v2-branch-readiness-matrix-report.md');
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const markdown = [
    '# Event V2 Branch Readiness Matrix Report',
    '',
    `- ok: ${report.ok}`,
    `- candidateEventId: ${report.candidateEventId}`,
    `- comparedAgainst: ${report.comparedAgainst}`,
    `- readiness: ${report.readiness}`,
    `- branchCount: ${report.branchCount}`,
    `- productiveWrite: ${report.safety.productiveWrite}`,
    `- usedProductiveStorage: ${report.safety.usedProductiveStorage}`,
    `- mutatedInputState: ${report.safety.mutatedInputState}`,
    `- errors: ${report.errors.length}`,
    `- warnings: ${report.warnings.length}`,
    '',
  ].join('\n');
  fs.writeFileSync(mdPath, markdown, 'utf8');
  return { jsonPath, mdPath };
}

function main() {
  const report = runEventV2BranchReadinessMatrixPreview({
    candidateEventId: 'shared_panic_watering_misread',
  });

  assert.strictEqual(report.reportType, 'event-v2-branch-readiness-matrix', 'reportType mismatch');
  assert.strictEqual(report.comparedAgainst, 'indoor_dry_rootball', 'reference event mismatch');
  assert.strictEqual(typeof report.candidateEventId, 'string', 'candidate event id required');
  assert.strictEqual(report.candidateEventId.length > 0, true, 'candidate event id must be non-empty');
  assert.strictEqual(Array.isArray(report.branches), true, 'branches must exist');
  assert.strictEqual(report.branches.length >= 1, true, 'at least one branch required');
  assert.strictEqual(['ready', 'partial', 'blocked'].includes(report.readiness), true, 'readiness invalid');
  assert.strictEqual(report.safety.productiveWrite, false, 'productive write must stay false');
  assert.strictEqual(report.safety.usedProductiveStorage, false, 'productive storage must stay false');
  assert.strictEqual(report.safety.mutatedInputState, false, 'input mutation must stay false');
  assert.strictEqual(typeof JSON.stringify(report), 'string', 'report must be json serializable');

  report.branches.forEach((branch) => {
    assert.strictEqual(typeof branch.optionId, 'string', 'optionId required');
    assert.strictEqual(branch.optionId.length > 0, true, 'optionId non-empty');
  });

  const artifacts = writeArtifacts(process.cwd(), report);
  const output = {
    ok: true,
    mode: 'event_v2_branch_readiness_matrix_report',
    summary: {
      matrixCreated: true,
      referenceEventPresent: report.comparedAgainst === 'indoor_dry_rootball',
      candidateEventPresent: report.candidateEventId.length > 0,
      branchesRecognized: report.branches.length > 0,
      readinessValid: ['ready', 'partial', 'blocked'].includes(report.readiness),
      safetyNoProductiveWrite: report.safety.productiveWrite === false,
      safetyNoProductiveStorage: report.safety.usedProductiveStorage === false,
      safetyNoMutation: report.safety.mutatedInputState === false,
      jsonSerializable: typeof JSON.stringify(report) === 'string',
    },
    artifacts,
  };

  console.log(JSON.stringify(output, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}

