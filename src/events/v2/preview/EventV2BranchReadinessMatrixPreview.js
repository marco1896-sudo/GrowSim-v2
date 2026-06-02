'use strict';

const fs = require('fs');
const path = require('path');

const REFERENCE_EVENT_ID = 'indoor_dry_rootball';
const DEFAULT_CANDIDATE_EVENT_ID = 'shared_panic_watering_misread';

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cloneJson(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}

function getCatalogEventFileById(rootDir, eventId) {
  const eventsRoot = path.join(rootDir, 'data', 'events', 'catalog', 'events');
  const files = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    entries.forEach((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      if (entry.isFile() && entry.name.endsWith('.event.json')) files.push(full);
    });
  }
  walk(eventsRoot);

  for (const file of files) {
    const parsed = readJson(file);
    if (parsed && String(parsed.id || '') === String(eventId || '')) {
      return {
        event: parsed,
        filePath: file,
      };
    }
  }
  return null;
}

function selectEventV2BranchReadinessCandidate(input) {
  const safeInput = isPlainObject(input) ? input : {};
  const rootDir = safeInput.rootDir ? path.resolve(String(safeInput.rootDir)) : process.cwd();
  const candidateEventId = typeof safeInput.candidateEventId === 'string'
    ? safeInput.candidateEventId
    : DEFAULT_CANDIDATE_EVENT_ID;

  const referenceLookup = getCatalogEventFileById(rootDir, REFERENCE_EVENT_ID);
  const candidateLookup = getCatalogEventFileById(rootDir, candidateEventId);

  return {
    rootDir,
    referenceEventId: REFERENCE_EVENT_ID,
    candidateEventId,
    referenceLookup,
    candidateLookup,
    reason: 'three-option-shared-event-with-clear-correct-neutral-mistake-paths',
  };
}

function classifyEventV2ResolveBranch(option) {
  const safe = isPlainObject(option) ? option : {};
  const optionId = String(safe.id || '');
  const intent = String(safe.intent || '');
  const effects = isPlainObject(safe.effects) ? safe.effects : {};
  const hasNumericEffect = Object.values(effects).some((value) => Number.isFinite(Number(value)));
  const risk = Number(effects.risk || 0);
  const stress = Number(effects.stress || 0);
  const health = Number(effects.health || 0);
  const isMistake = safe.isDeliberateMistake === true || intent === 'misread_signal';
  const isRecommended = Array.isArray(safe.recommendedIn) && safe.recommendedIn.length > 0;

  let semanticRole = 'neutral';
  let expectedDeltaType = 'neutral';
  if (isMistake || risk > 0 || stress > 0 || health < 0) {
    semanticRole = 'negative';
    expectedDeltaType = 'negative';
  } else if (isRecommended || risk < 0 || stress < 0 || health > 0) {
    semanticRole = 'recommended';
    expectedDeltaType = 'beneficial';
  }

  return {
    optionId,
    semanticRole,
    expectedDeltaType,
    hasApplyPreviewPath: hasNumericEffect,
    hasHistoryPreviewPath: optionId.length > 0,
    hasPersistPayloadPath: optionId.length > 0,
    readyForWriteSimulation: hasNumericEffect,
    warnings: [],
    errors: optionId.length > 0 ? [] : ['missing_option_id'],
  };
}

function normalizeBranchRoles(branches) {
  const list = branches.map((entry) => cloneJson(entry));
  const hasRecommended = list.some((entry) => entry.semanticRole === 'recommended');
  const hasNegative = list.some((entry) => entry.semanticRole === 'negative');
  const neutrals = list.filter((entry) => entry.semanticRole === 'neutral');

  if (!hasRecommended && list.length > 0) {
    list[0].semanticRole = 'recommended';
    list[0].expectedDeltaType = 'beneficial';
    list[0].warnings.push('semantic_role_promoted_to_recommended');
  }
  if (!hasNegative && list.length > 1) {
    const idx = list.length - 1;
    list[idx].semanticRole = 'negative';
    list[idx].expectedDeltaType = 'negative';
    list[idx].warnings.push('semantic_role_promoted_to_negative');
  }
  if (neutrals.length === 0 && list.length > 2) {
    list[1].semanticRole = 'neutral';
    list[1].expectedDeltaType = 'neutral';
    list[1].warnings.push('semantic_role_adjusted_to_neutral');
  }
  return list;
}

function validateEventV2BranchReadinessEntry(entry) {
  const safe = isPlainObject(entry) ? entry : {};
  const errors = [];
  if (!safe.optionId) errors.push('missing_option_id');
  if (!['recommended', 'neutral', 'negative'].includes(safe.semanticRole)) errors.push('invalid_semantic_role');
  if (!['beneficial', 'neutral', 'negative'].includes(safe.expectedDeltaType)) errors.push('invalid_delta_type');
  if (safe.hasApplyPreviewPath !== true) errors.push('missing_apply_preview_path');
  if (safe.hasHistoryPreviewPath !== true) errors.push('missing_history_preview_path');
  if (safe.hasPersistPayloadPath !== true) errors.push('missing_persist_payload_path');
  return {
    ok: errors.length === 0,
    errors,
  };
}

function summarizeEventV2BranchReadinessMatrix(matrix) {
  const safe = isPlainObject(matrix) ? matrix : {};
  const branches = Array.isArray(safe.branches) ? safe.branches : [];
  const roles = new Set(branches.map((entry) => entry.semanticRole));
  const validations = branches.map((entry) => validateEventV2BranchReadinessEntry(entry));
  const validCount = validations.filter((entry) => entry.ok).length;
  const allValid = validCount === branches.length && branches.length > 0;

  let readiness = 'blocked';
  if (allValid && branches.length >= 3 && roles.has('recommended') && roles.has('neutral') && roles.has('negative')) {
    readiness = 'ready';
  } else if (allValid && branches.length >= 2) {
    readiness = 'partial';
  }

  return {
    readiness,
    branchCount: branches.length,
    validBranches: validCount,
    roleCoverage: {
      recommended: roles.has('recommended'),
      neutral: roles.has('neutral'),
      negative: roles.has('negative'),
    },
    validationErrors: validations.flatMap((entry) => entry.errors),
  };
}

function createEventV2BranchReadinessMatrix(input) {
  const selection = selectEventV2BranchReadinessCandidate(input);
  const errors = [];
  const warnings = [];

  if (!selection.referenceLookup) {
    errors.push('reference_event_not_found');
  }
  if (!selection.candidateLookup) {
    errors.push('candidate_event_not_found');
  }
  if (errors.length > 0) {
    return {
      ok: false,
      reportType: 'event-v2-branch-readiness-matrix',
      candidateEventId: selection.candidateEventId,
      comparedAgainst: selection.referenceEventId,
      candidateReason: selection.reason,
      readiness: 'blocked',
      branchCount: 0,
      branches: [],
      safety: {
        productiveWrite: false,
        usedProductiveStorage: false,
        mutatedInputState: false,
        productiveCutover: false,
      },
      warnings,
      errors,
    };
  }

  const candidateEvent = selection.candidateLookup.event;
  const rawOptions = Array.isArray(candidateEvent.options) ? candidateEvent.options : [];
  const classified = rawOptions.map((option) => classifyEventV2ResolveBranch(option));
  const normalized = normalizeBranchRoles(classified);
  const branches = normalized.map((entry, index) => ({
    branchId: entry.semanticRole === 'recommended'
      ? 'recommended'
      : entry.semanticRole === 'neutral'
        ? 'neutral'
        : 'negative',
    optionId: entry.optionId,
    semanticRole: entry.semanticRole,
    hasApplyPreviewPath: entry.hasApplyPreviewPath,
    hasHistoryPreviewPath: entry.hasHistoryPreviewPath,
    hasPersistPayloadPath: entry.hasPersistPayloadPath,
    expectedDeltaType: entry.expectedDeltaType,
    readyForWriteSimulation: entry.readyForWriteSimulation,
    warnings: entry.warnings.slice(),
    errors: entry.errors.slice(),
    order: index,
  }));

  const summary = summarizeEventV2BranchReadinessMatrix({
    branches,
  });
  if (summary.validationErrors.length > 0) {
    summary.validationErrors.forEach((error) => errors.push(error));
  }

  return {
    ok: errors.length === 0 && summary.readiness !== 'blocked',
    reportType: 'event-v2-branch-readiness-matrix',
    candidateEventId: candidateEvent.id,
    comparedAgainst: selection.referenceEventId,
    candidateReason: selection.reason,
    readiness: summary.readiness,
    branchCount: summary.branchCount,
    branches,
    safety: {
      productiveWrite: false,
      usedProductiveStorage: false,
      mutatedInputState: false,
      productiveCutover: false,
    },
    warnings,
    errors,
  };
}

function runEventV2BranchReadinessMatrixPreview(input) {
  return createEventV2BranchReadinessMatrix(input);
}

module.exports = Object.freeze({
  selectEventV2BranchReadinessCandidate,
  createEventV2BranchReadinessMatrix,
  classifyEventV2ResolveBranch,
  validateEventV2BranchReadinessEntry,
  summarizeEventV2BranchReadinessMatrix,
  runEventV2BranchReadinessMatrixPreview,
});

