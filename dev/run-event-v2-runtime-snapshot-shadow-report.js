#!/usr/bin/env node
/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');
const { evaluateRuntimeShadow } = require('../src/events/v2/shadow/EventV2RuntimeShadowEvaluator.js');
const { createRuntimeSnapshot } = require('../src/events/v2/shadow/EventV2RuntimeSnapshotAdapter.js');

const ROOT = process.cwd();
const FIXTURES_PATH = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-141-runtime-snapshot-fixtures.json');
const OUT_JSON = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-141-runtime-snapshot-shadow-report.json');
const OUT_MD = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-141-runtime-snapshot-shadow-report.md');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function hashStable(value) {
  return JSON.stringify(value);
}

function exists(relPath) {
  if (typeof relPath !== 'string' || !relPath.trim()) return false;
  return fs.existsSync(path.join(ROOT, relPath));
}

function expectedFamilyHit(fixtureId, topCandidates) {
  const ids = topCandidates.map((c) => String(c.eventId || '').toLowerCase());
  const joined = ids.join(' ');
  if (fixtureId.includes('indoor_veg_vpd')) return joined.includes('vpd') || joined.includes('climate');
  if (fixtureId.includes('outdoor_heat_dry_wind')) return joined.includes('heat') || joined.includes('wind') || joined.includes('burn');
  if (fixtureId.includes('stable_healthy_baseline')) return !joined.includes('critical');
  return true;
}

function evaluateFixture(fixture) {
  const fixtureId = String(fixture.id || 'unknown_fixture');
  const beforeHash = hashStable(fixture.state);
  const snapshotEnvelope = createRuntimeSnapshot(fixture.state);
  const result = evaluateRuntimeShadow({ rootDir: ROOT, runtimeSnapshot: fixture.state });
  const afterHash = hashStable(fixture.state);

  const candidates = Array.isArray(result.result && result.result.candidates)
    ? result.result.candidates
    : [];
  const candidatesWithExists = candidates.map((candidate) => ({
    ...candidate,
    imageExists: exists(candidate.imageSrc),
  }));
  const top5 = candidatesWithExists
    .filter((candidate) => candidate.eligible)
    .sort((a, b) => Number(b.score) - Number(a.score) || String(a.eventId || '').localeCompare(String(b.eventId || '')))
    .slice(0, 5)
    .map((candidate) => ({
      eventId: candidate.eventId,
      score: candidate.score,
      reason: candidate.reason,
      environment: candidate.environment,
      category: candidate.category,
      imageSrc: candidate.imageSrc,
    }));

  return {
    fixtureId,
    fixtureLabel: fixture.label || fixtureId,
    snapshotSource: snapshotEnvelope.source,
    snapshotWarnings: snapshotEnvelope.warnings || [],
    missingFields: snapshotEnvelope.missingFields || [],
    eventsEvaluated: candidatesWithExists.length,
    validImages: candidatesWithExists.filter((candidate) => candidate.imageExists).length,
    brokenPaths: candidatesWithExists.filter((candidate) => !candidate.imageExists).length,
    topCandidates: top5,
    expectedEventFamilyHit: expectedFamilyHit(fixtureId, top5),
    noWriteContract: {
      canMutateState: result.canMutateState,
      canMutateSave: result.canMutateSave,
      canActivateGameplay: result.canActivateGameplay,
      stateMutations: result.mutationGuards ? result.mutationGuards.stateMutations : null,
      saveWrites: result.mutationGuards ? result.mutationGuards.saveWrites : null,
      uiActions: result.mutationGuards ? result.mutationGuards.uiActions : null,
      gameplayActivations: result.mutationGuards ? result.mutationGuards.gameplayActivations : null,
    },
    inputMutationDetected: beforeHash !== afterHash,
    readinessStatus: result.inputSummary && result.inputSummary.hasSnapshotScoring
      ? 'runtime_shadow_ready_with_snapshot_scoring'
      : 'runtime_shadow_ready_with_static_scoring',
  };
}

function toMarkdown(report) {
  const lines = [
    '# Phase 141 - Runtime Snapshot Shadow Report',
    '',
    `- fixturesChecked: ${report.summary.fixturesChecked}`,
    `- eventsPerFixture: ${report.summary.eventsPerFixture}`,
    `- totalEvaluations: ${report.summary.totalEvaluations}`,
    `- totalBrokenPaths: ${report.summary.totalBrokenPaths}`,
    `- canMutateStateFalse: ${report.summary.canMutateStateFalse}`,
    `- canMutateSaveFalse: ${report.summary.canMutateSaveFalse}`,
    `- canActivateGameplayFalse: ${report.summary.canActivateGameplayFalse}`,
    `- stateMutations: ${report.summary.stateMutations}`,
    `- saveWrites: ${report.summary.saveWrites}`,
    `- uiActions: ${report.summary.uiActions}`,
    `- gameplayActivations: ${report.summary.gameplayActivations}`,
    `- inputMutationDetected: ${report.summary.inputMutationDetected}`,
    `- status: ${report.status}`,
    '',
  ];

  for (const fixture of report.fixtures) {
    lines.push(`## ${fixture.fixtureId}`);
    lines.push(`- readinessStatus: ${fixture.readinessStatus}`);
    lines.push(`- eventsEvaluated: ${fixture.eventsEvaluated}`);
    lines.push(`- validImages: ${fixture.validImages}`);
    lines.push(`- brokenPaths: ${fixture.brokenPaths}`);
    lines.push(`- expectedEventFamilyHit: ${fixture.expectedEventFamilyHit}`);
    lines.push(`- inputMutationDetected: ${fixture.inputMutationDetected}`);
    lines.push('- topCandidates:');
    for (const top of fixture.topCandidates) {
      lines.push(`  - ${top.eventId} (${top.score})`);
    }
    lines.push('');
  }

  return lines.join('\n') + '\n';
}

function main() {
  const fixtures = readJson(FIXTURES_PATH);
  const fixtureResults = fixtures.map(evaluateFixture);

  const noWriteAll = fixtureResults.every((fixture) =>
    fixture.noWriteContract.canMutateState === false
      && fixture.noWriteContract.canMutateSave === false
      && fixture.noWriteContract.canActivateGameplay === false
      && fixture.noWriteContract.stateMutations === 0
      && fixture.noWriteContract.saveWrites === 0
      && fixture.noWriteContract.uiActions === 0
      && fixture.noWriteContract.gameplayActivations === 0
  );

  const summary = {
    fixturesChecked: fixtureResults.length,
    eventsPerFixture: fixtureResults.length > 0 ? fixtureResults[0].eventsEvaluated : 0,
    totalEvaluations: fixtureResults.reduce((sum, fixture) => sum + fixture.eventsEvaluated, 0),
    totalBrokenPaths: fixtureResults.reduce((sum, fixture) => sum + fixture.brokenPaths, 0),
    canMutateStateFalse: fixtureResults.every((fixture) => fixture.noWriteContract.canMutateState === false),
    canMutateSaveFalse: fixtureResults.every((fixture) => fixture.noWriteContract.canMutateSave === false),
    canActivateGameplayFalse: fixtureResults.every((fixture) => fixture.noWriteContract.canActivateGameplay === false),
    stateMutations: fixtureResults.reduce((sum, fixture) => sum + Number(fixture.noWriteContract.stateMutations || 0), 0),
    saveWrites: fixtureResults.reduce((sum, fixture) => sum + Number(fixture.noWriteContract.saveWrites || 0), 0),
    uiActions: fixtureResults.reduce((sum, fixture) => sum + Number(fixture.noWriteContract.uiActions || 0), 0),
    gameplayActivations: fixtureResults.reduce((sum, fixture) => sum + Number(fixture.noWriteContract.gameplayActivations || 0), 0),
    inputMutationDetected: fixtureResults.some((fixture) => fixture.inputMutationDetected),
  };

  const status = noWriteAll
    ? 'runtime_shadow_ready_with_snapshot_scoring'
    : 'runtime_shadow_blocked_mutation_risk';

  const report = {
    ok: summary.fixturesChecked >= 3
      && summary.eventsPerFixture === 22
      && summary.totalBrokenPaths === 0
      && summary.inputMutationDetected === false
      && noWriteAll,
    phase: '141',
    status,
    summary,
    fixtures: fixtureResults,
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_MD, toMarkdown(report), 'utf8');

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main();
