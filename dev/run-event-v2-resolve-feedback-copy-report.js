/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT_JSON = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-168-resolve-feedback-copy-report.json');
const OUT_MD = path.join(ROOT, 'data', 'events', 'catalog', '_planning', 'phase-168-resolve-feedback-copy-report.md');

const feedbackApi = require(path.join(ROOT, 'src', 'events', 'v2', 'preview', 'EventV2ResolveFeedbackCopy.js'));
const resolveModelApi = require(path.join(ROOT, 'src', 'events', 'v2', 'preview', 'EventV2ResolvePreviewModel.js'));

function readJson(relPath) {
  const raw = fs.readFileSync(path.join(ROOT, relPath), 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}

function toMarkdown(report) {
  return [
    '# Phase 168 - Resolve Feedback Copy Report',
    '',
    '- ok: ' + report.ok,
    '- contexts: ' + report.summary.contextCount,
    '- eventSpecificCandidates: ' + report.summary.eventSpecificCandidates,
    '- goodBadDifferent: ' + report.summary.goodBadDifferent,
    '- learningPreviewPresent: ' + report.summary.learningPreviewPresent,
    '- fallbackWorks: ' + report.summary.fallbackWorks,
    '- canResolveFalse: ' + report.summary.canResolveFalse,
    '- canApplyEffectsFalse: ' + report.summary.canApplyEffectsFalse,
    '- runtimeWriteFalse: ' + report.summary.runtimeWriteFalse,
    '- productionFalse: ' + report.summary.productionFalse,
    '- saveStorageWrites: ' + report.summary.saveStorageWrites,
    '',
  ].join('\n');
}

function pickCandidates(items) {
  const fixtureOrder = [
    'fixture_indoor_veg_vpd_mismatch',
    'fixture_outdoor_heat_dry_wind',
    'fixture_stable_healthy_baseline',
  ];
  const picked = [];
  for (const fixtureId of fixtureOrder) {
    const match = items.find((item) => String(item.fixtureId || '') === fixtureId);
    if (match) picked.push(match);
  }
  return picked;
}

function main() {
  const draft = readJson('data/events/catalog/_planning/phase-168-resolve-event-specific-feedback-draft.json');
  const feed = readJson('data/events/catalog/_planning/phase-145-dev-test-candidate-feed-report.json');

  const items = Array.isArray(feed.items) ? feed.items : [];
  const candidates = pickCandidates(items);

  const results = candidates.map((candidate) => {
    const preview = resolveModelApi.buildEventV2ResolvePreview(candidate);
    const options = Array.isArray(preview.options) ? preview.options : [];
    const specificOptions = options.filter((opt) => opt.feedbackSource === 'event_specific_draft');
    const goodOption = options.find((opt) => String(opt.expectedQuality || '') === 'good');
    const badOption = options.find((opt) => String(opt.expectedQuality || '') === 'bad');

    return {
      candidateId: candidate.id,
      eventId: candidate.eventId,
      fixtureId: candidate.fixtureId,
      optionCount: options.length,
      eventSpecificOptionCount: specificOptions.length,
      hasLearningPreview: specificOptions.some((opt) => String(opt.learningPreview || '').trim().length > 0),
      goodBadDifferent: Boolean(goodOption && badOption && goodOption.feedbackPreview !== badOption.feedbackPreview),
      preview,
    };
  });

  const fallbackPreview = resolveModelApi.buildEventV2ResolvePreview({
    id: 'unknown:1',
    eventId: 'unknown_event_for_fallback',
    fixtureId: 'fixture_unknown',
    reason: 'unknown_reason',
    severity: 'warning',
    score: 100,
  });

  const fallbackWorks = Array.isArray(fallbackPreview.options)
    && fallbackPreview.options.every((opt) => opt.feedbackSource === 'generic_fallback');

  const summary = {
    contextCount: Object.keys(feedbackApi.EVENT_V2_RESOLVE_FEEDBACK_BY_CONTEXT || {}).length,
    eventSpecificCandidates: results.filter((r) => r.eventSpecificOptionCount > 0).length,
    goodBadDifferent: results.every((r) => r.goodBadDifferent === true),
    learningPreviewPresent: results.every((r) => r.hasLearningPreview === true),
    fallbackWorks,
    actionsEmpty: results.every((r) => Array.isArray(r.preview.actions) && r.preview.actions.length === 0),
    canResolveFalse: results.every((r) => r.preview.canResolve === false),
    canApplyEffectsFalse: results.every((r) => r.preview.canApplyEffects === false),
    runtimeWriteFalse: results.every((r) => r.preview.runtimeWriteEnabled === false),
    productionFalse: results.every((r) => r.preview.productionEnabled === false),
    saveStorageWrites: results.every((r) => (r.preview.diagnostics || {}).saveWrites === 0) ? 0 : -1,
  };

  const report = {
    ok: summary.contextCount >= 6
      && summary.eventSpecificCandidates >= 3
      && summary.goodBadDifferent
      && summary.learningPreviewPresent
      && summary.fallbackWorks
      && summary.actionsEmpty
      && summary.canResolveFalse
      && summary.canApplyEffectsFalse
      && summary.runtimeWriteFalse
      && summary.productionFalse
      && summary.saveStorageWrites === 0,
    summary,
    results,
    fallbackPreview,
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_MD, toMarkdown(report), 'utf8');

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main();
