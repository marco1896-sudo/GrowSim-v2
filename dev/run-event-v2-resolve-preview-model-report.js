#!/usr/bin/env node
/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');
const { createDevTestNoWriteModeModel } = require('../src/events/v2/preview/EventV2DevTestNoWriteModeModel.js');
const { buildEventV2ResolvePreview } = require('../src/events/v2/preview/EventV2ResolvePreviewModel.js');

const ROOT = process.cwd();
const OUT_JSON = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-164-resolve-preview-model-report.json');
const OUT_MD = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-164-resolve-preview-model-report.md');

function pickFixtureTopCandidate(items, fixtureId) {
  const list = Array.isArray(items) ? items.filter((entry) => String(entry.fixtureId || '') === fixtureId) : [];
  if (!list.length) return null;
  return list.slice().sort((a, b) => Number(a.rank || 999) - Number(b.rank || 999))[0] || null;
}

function validatePreview(preview) {
  const options = Array.isArray(preview && preview.options) ? preview.options : [];
  return {
    ok: Boolean(preview && preview.ok === true),
    questionPresent: typeof preview.question === 'string' && preview.question.trim().length > 0,
    optionCount: options.length,
    optionCountValid: options.length >= 2 && options.length <= 3,
    optionsValid: options.every((opt) =>
      typeof opt.optionId === 'string'
      && typeof opt.label === 'string'
      && typeof opt.expectedQuality === 'string'
      && typeof opt.feedbackPreview === 'string'
      && opt.plannedEffectsPreview
      && typeof opt.plannedEffectsPreview === 'object'
      && opt.canApply === false
      && opt.canResolve === false),
    actionsEmpty: Array.isArray(preview.actions) && preview.actions.length === 0,
    selectedCandidateNull: preview.selectedCandidate === null,
    persistedSelectedCandidateNull: preview.persistedSelectedCandidate === null,
    canResolveFalse: preview.canResolve === false,
    canApplyEffectsFalse: preview.canApplyEffects === false,
    runtimeWriteFalse: preview.runtimeWriteEnabled === false,
    productionFalse: preview.productionEnabled === false,
    saveWrites: Number(preview && preview.diagnostics && preview.diagnostics.saveWrites || 0),
    localStorageWrites: Number(preview && preview.diagnostics && preview.diagnostics.localStorageWrites || 0),
    indexedDbWrites: Number(preview && preview.diagnostics && preview.diagnostics.indexedDbWrites || 0),
  };
}

function toMarkdown(report) {
  const lines = [
    '# Phase 164 - Resolve Preview Model Report',
    '',
    `- ok: ${report.ok}`,
    `- candidatesChecked: ${report.summary.candidatesChecked}`,
    `- optionsMin: ${report.summary.optionsMin}`,
    `- optionsMax: ${report.summary.optionsMax}`,
    `- questionPresent: ${report.summary.questionPresent}`,
    `- feedbackPreviewPresent: ${report.summary.feedbackPreviewPresent}`,
    `- plannedEffectsPreviewPresent: ${report.summary.plannedEffectsPreviewPresent}`,
    `- canResolveFalse: ${report.summary.canResolveFalse}`,
    `- canApplyEffectsFalse: ${report.summary.canApplyEffectsFalse}`,
    `- actionsEmpty: ${report.summary.actionsEmpty}`,
    `- selectedCandidateNull: ${report.summary.selectedCandidateNull}`,
    `- persistedSelectedCandidateNull: ${report.summary.persistedSelectedCandidateNull}`,
    `- runtimeWriteFalse: ${report.summary.runtimeWriteFalse}`,
    `- productionFalse: ${report.summary.productionFalse}`,
    `- saveStorageWrites: ${report.summary.saveStorageWrites}`,
    '',
  ];
  return lines.join('\n') + '\n';
}

function main() {
  const model = createDevTestNoWriteModeModel({
    rootDir: ROOT,
    environment: 'local',
    hostname: 'localhost',
    explicitDevPreview: true,
    enableRuntimeShadowDev: true,
  });

  const items = Array.isArray(model.candidateItems) ? model.candidateItems : [];
  const targets = [
    pickFixtureTopCandidate(items, 'fixture_indoor_veg_vpd_mismatch'),
    pickFixtureTopCandidate(items, 'fixture_outdoor_heat_dry_wind'),
    pickFixtureTopCandidate(items, 'fixture_stable_healthy_baseline'),
  ].filter(Boolean);

  const previews = targets.map((candidate) => {
    const preview = buildEventV2ResolvePreview(candidate);
    return {
      fixtureId: candidate.fixtureId,
      candidateId: candidate.id || null,
      eventId: candidate.eventId || null,
      preview,
      checks: validatePreview(preview),
    };
  });

  const allChecks = previews.map((entry) => entry.checks);
  const optionCounts = previews.map((entry) => entry.checks.optionCount);
  const summary = {
    candidatesChecked: previews.length,
    optionsMin: optionCounts.length ? Math.min(...optionCounts) : 0,
    optionsMax: optionCounts.length ? Math.max(...optionCounts) : 0,
    questionPresent: allChecks.every((c) => c.questionPresent),
    feedbackPreviewPresent: previews.every((entry) => entry.preview.options.every((opt) => typeof opt.feedbackPreview === 'string' && opt.feedbackPreview.trim().length > 0)),
    plannedEffectsPreviewPresent: previews.every((entry) => entry.preview.options.every((opt) => opt.plannedEffectsPreview && typeof opt.plannedEffectsPreview === 'object')),
    canResolveFalse: allChecks.every((c) => c.canResolveFalse),
    canApplyEffectsFalse: allChecks.every((c) => c.canApplyEffectsFalse),
    actionsEmpty: allChecks.every((c) => c.actionsEmpty),
    selectedCandidateNull: allChecks.every((c) => c.selectedCandidateNull),
    persistedSelectedCandidateNull: allChecks.every((c) => c.persistedSelectedCandidateNull),
    runtimeWriteFalse: allChecks.every((c) => c.runtimeWriteFalse),
    productionFalse: allChecks.every((c) => c.productionFalse),
    saveStorageWrites: allChecks.reduce((sum, c) => sum + c.saveWrites + c.localStorageWrites + c.indexedDbWrites, 0),
  };

  const ok = model.enabled === true
    && previews.length >= 3
    && allChecks.every((c) => c.ok && c.questionPresent && c.optionCountValid && c.optionsValid)
    && summary.feedbackPreviewPresent
    && summary.plannedEffectsPreviewPresent
    && summary.canResolveFalse
    && summary.canApplyEffectsFalse
    && summary.actionsEmpty
    && summary.selectedCandidateNull
    && summary.persistedSelectedCandidateNull
    && summary.runtimeWriteFalse
    && summary.productionFalse
    && summary.saveStorageWrites === 0;

  const report = {
    ok,
    mode: 'event_v2_resolve_preview_no_write',
    sourceModeEnabled: model.enabled === true,
    summary,
    previews,
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_MD, toMarkdown(report), 'utf8');

  console.log(JSON.stringify(report, null, 2));
  process.exit(ok ? 0 : 1);
}

main();

