#!/usr/bin/env node
/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const CATALOG_ROOT = path.join(ROOT, 'data', 'events', 'catalog');
const EVENT_ROOT = path.join(CATALOG_ROOT, 'events');
const CHAIN_ROOT = path.join(CATALOG_ROOT, 'chains');
const LEARNING_ROOT = path.join(CATALOG_ROOT, 'learning-cards');
const LOCALE_ROOT = path.join(ROOT, 'src', 'i18n', 'locales');
const OUT_JSON = path.join(CATALOG_ROOT, '_planning', 'phase-final-v2-final-catalog-audit.json');
const OUT_MD = path.join(CATALOG_ROOT, '_planning', 'phase-final-v2-final-catalog-audit.md');

const VALID_CATEGORIES = new Set(['water', 'nutrition', 'environment', 'pest', 'disease', 'positive', 'special']);
const VALID_SEVERITIES = new Set(['info', 'warning', 'critical', 'emergency']);
const VALID_PHASES = new Set(['germination', 'seedling', 'vegetative', 'preflower', 'flowering', 'ripening', 'harvest']);
const VALID_MODES = new Set(['indoor', 'outdoor', 'greenhouse']);

function toPosix(absPath) {
  return path.relative(ROOT, absPath).replace(/\\/g, '/');
}

function readJson(absPath) {
  return JSON.parse(fs.readFileSync(absPath, 'utf8').replace(/^\uFEFF/, ''));
}

function walk(dir, suffix) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, suffix));
    else if (entry.isFile() && entry.name.endsWith(suffix)) out.push(full);
  }
  return out.sort();
}

function getByPath(target, dottedPath) {
  const parts = String(dottedPath || '').split('.');
  let cursor = target;
  for (const part of parts) {
    if (!cursor || typeof cursor !== 'object' || !(part in cursor)) return undefined;
    cursor = cursor[part];
  }
  return cursor;
}

function resolveLocaleKey(locale, key) {
  if (!locale || !key) return undefined;
  if (Object.prototype.hasOwnProperty.call(locale, key)) return locale[key];
  return getByPath(locale, key);
}

function existsRel(relPath) {
  return typeof relPath === 'string' && relPath.trim() && fs.existsSync(path.join(ROOT, relPath));
}

function createReport() {
  return {
    ok: true,
    summary: {
      eventsChecked: 0,
      chainsChecked: 0,
      learningCardsChecked: 0,
      idsChecked: 0,
      duplicateIds: 0,
      missingI18nKeys: 0,
      missingAssets: 0,
      invalidReferences: 0,
      invalidRequiredFields: 0,
    },
    errors: [],
    warnings: [],
    infos: [],
  };
}

function push(report, level, code, message, details) {
  report[level].push(Object.assign({ code, message }, details || {}));
}

function requireField(report, doc, field, sourcePath) {
  if (doc[field] === undefined || doc[field] === null || doc[field] === '') {
    report.summary.invalidRequiredFields += 1;
    push(report, 'errors', 'missing_required_field', `${field} is required.`, { sourcePath, field, id: doc.id || null });
    return false;
  }
  return true;
}

function collectRequiredKeys(doc) {
  const keys = new Set(Array.isArray(doc && doc.i18n && doc.i18n.requiredKeys) ? doc.i18n.requiredKeys : []);
  const directRefs = [
    doc && doc.title,
    doc && doc.shortSymptom,
    doc && doc.longDescription,
    doc && doc.cause && doc.cause.explanation,
    doc && doc.coach && doc.coach.summary,
    doc && doc.coach && doc.coach.why,
    doc && doc.aftermathProfile && doc.aftermathProfile.lesson,
  ];
  directRefs.forEach((ref) => {
    if (ref && ref.key) keys.add(ref.key);
  });
  if (Array.isArray(doc && doc.options)) {
    doc.options.forEach((option) => {
      if (option && option.label && option.label.key) keys.add(option.label.key);
    });
  }
  if (doc && doc.assets && doc.assets.cover && doc.assets.cover.altKey) {
    keys.add(doc.assets.cover.altKey);
  }
  return Array.from(keys).sort();
}

function validateI18n(report, doc, locales, sourcePath) {
  const keys = collectRequiredKeys(doc);
  for (const localeName of Object.keys(locales)) {
    for (const key of keys) {
      const value = resolveLocaleKey(locales[localeName], key);
      if (typeof value !== 'string' || value.trim() === '') {
        report.summary.missingI18nKeys += 1;
        push(report, 'errors', 'missing_i18n_key', `Missing ${localeName} locale key.`, {
          sourcePath,
          id: doc.id || null,
          locale: localeName,
          key,
        });
      }
    }
  }
}

function validateEvent(report, doc, sourcePath, learningIds, chainIds, locales) {
  ['schemaVersion', 'id', 'type', 'category', 'title', 'shortSymptom', 'options', 'triggers', 'eligibility', 'pressure', 'severity', 'escalationProfile', 'aftermathProfile', 'ui', 'assets', 'i18n', 'telemetry', 'authoring'].forEach((field) => {
    requireField(report, doc, field, sourcePath);
  });

  if (doc.schemaVersion !== 3) push(report, 'errors', 'invalid_schema_version', 'Event schemaVersion must be 3.', { sourcePath, id: doc.id });
  if (doc.type !== 'event') push(report, 'errors', 'invalid_event_type', 'Active catalog event type must be event.', { sourcePath, id: doc.id, type: doc.type });
  if (!VALID_CATEGORIES.has(doc.category)) push(report, 'errors', 'invalid_category', 'Invalid event category.', { sourcePath, id: doc.id, category: doc.category });

  const severity = doc && doc.severity && doc.severity.level;
  if (!VALID_SEVERITIES.has(severity)) push(report, 'errors', 'invalid_severity', 'Invalid event severity.', { sourcePath, id: doc.id, severity });

  const stage = doc && doc.triggers && doc.triggers.stage;
  if (stage) {
    ['min', 'max'].forEach((key) => {
      if (stage[key] !== undefined && (!Number.isFinite(Number(stage[key])) || Number(stage[key]) < 0)) {
        push(report, 'errors', 'invalid_stage_range', 'Stage range must be non-negative numbers.', { sourcePath, id: doc.id, stage });
      }
    });
  }

  const allowedPhases = doc && doc.eligibility && doc.eligibility.allowedPhases;
  if (!Array.isArray(allowedPhases) || allowedPhases.length === 0) {
    push(report, 'errors', 'missing_allowed_phases', 'Event must define eligibility.allowedPhases.', { sourcePath, id: doc.id });
  } else {
    allowedPhases.forEach((phase) => {
      if (!VALID_PHASES.has(phase)) push(report, 'errors', 'invalid_allowed_phase', 'Invalid allowed phase.', { sourcePath, id: doc.id, phase });
    });
  }

  const modeIn = doc && doc.triggers && doc.triggers.setup && doc.triggers.setup.modeIn;
  if (Array.isArray(modeIn)) {
    modeIn.forEach((mode) => {
      if (!VALID_MODES.has(mode)) push(report, 'errors', 'invalid_setup_mode', 'Invalid trigger setup mode.', { sourcePath, id: doc.id, mode });
    });
  }

  if (!Array.isArray(doc.options) || doc.options.length < 2) {
    push(report, 'errors', 'missing_decisions', 'Event must define at least two options.', { sourcePath, id: doc.id });
  } else {
    const hasRecommended = doc.options.some((option) => Array.isArray(option.recommendedIn) && option.recommendedIn.length > 0);
    const hasMistake = doc.options.some((option) => option && option.isDeliberateMistake === true);
    if (!hasRecommended) push(report, 'warnings', 'missing_recommended_option', 'Event has no clearly recommended option.', { sourcePath, id: doc.id });
    if (!hasMistake) push(report, 'warnings', 'missing_deliberate_mistake', 'Event has no deliberate mistake option.', { sourcePath, id: doc.id });
    doc.options.forEach((option) => {
      if (!option || !option.id || !option.label || !option.label.key || !option.intent || !option.effects) {
        push(report, 'errors', 'invalid_option_shape', 'Option is missing id, label, intent, or effects.', { sourcePath, id: doc.id, optionId: option && option.id });
      }
    });
  }

  const outcomes = doc && doc.aftermathProfile && doc.aftermathProfile.perOutcomeQuality;
  if (!outcomes || !outcomes.strong_recovery || !outcomes.no_action) {
    push(report, 'errors', 'missing_resolve_outcomes', 'Aftermath requires strong_recovery and no_action.', { sourcePath, id: doc.id });
  }

  const learningRef = doc && doc.learningCard && doc.learningCard.ref;
  if (learningRef && !learningIds.has(learningRef)) {
    report.summary.invalidReferences += 1;
    push(report, 'errors', 'missing_learning_card_ref', 'Event references missing learning card.', { sourcePath, id: doc.id, learningRef });
  }

  const startsChain = doc && doc.chainHooks && doc.chainHooks.startsChain;
  if (startsChain && !chainIds.has(startsChain)) {
    report.summary.invalidReferences += 1;
    push(report, 'errors', 'missing_chain_ref', 'Event references missing chain.', { sourcePath, id: doc.id, chainRef: startsChain });
  }

  const cover = doc && doc.assets && doc.assets.cover;
  ['src', 'fallback'].forEach((field) => {
    if (!cover || !existsRel(cover[field])) {
      report.summary.missingAssets += 1;
      push(report, 'errors', 'missing_cover_asset', `Missing cover.${field} asset.`, { sourcePath, id: doc.id, field, path: cover && cover[field] });
    }
  });

  validateI18n(report, doc, locales, sourcePath);
}

function validateChain(report, doc, sourcePath, eventIds, locales) {
  ['schemaVersion', 'id', 'title', 'summary', 'steps', 'i18n'].forEach((field) => requireField(report, doc, field, sourcePath));
  if (!Array.isArray(doc.steps) || doc.steps.length === 0) {
    push(report, 'errors', 'missing_chain_steps', 'Chain must define at least one step.', { sourcePath, id: doc.id });
    return;
  }
  const stepIds = new Set(doc.steps.map((step) => step && step.id).filter(Boolean));
  doc.steps.forEach((step) => {
    if (!step || !step.eventId || !eventIds.has(step.eventId)) {
      report.summary.invalidReferences += 1;
      push(report, 'errors', 'missing_chain_event_ref', 'Chain step references missing event.', { sourcePath, id: doc.id, stepId: step && step.id, eventId: step && step.eventId });
    }
    const transitions = step && step.transitionsOnOutcome ? step.transitionsOnOutcome : {};
    Object.values(transitions).forEach((transition) => {
      if (transition && transition.to && !stepIds.has(transition.to)) {
        report.summary.invalidReferences += 1;
        push(report, 'errors', 'missing_chain_step_ref', 'Chain transition references missing step.', { sourcePath, id: doc.id, stepId: step.id, to: transition.to });
      }
    });
  });
  validateI18n(report, doc, locales, sourcePath);
}

function validateLearningCard(report, doc, sourcePath, eventIds, locales) {
  ['schemaVersion', 'id', 'title', 'subtitle', 'content', 'appearsIn', 'i18n'].forEach((field) => requireField(report, doc, field, sourcePath));
  const linked = doc && doc.appearsIn && Array.isArray(doc.appearsIn.linkedEventIds) ? doc.appearsIn.linkedEventIds : [];
  linked.forEach((eventId) => {
    if (!eventIds.has(eventId)) {
      report.summary.invalidReferences += 1;
      push(report, 'errors', 'missing_learning_event_ref', 'Learning card references missing event.', { sourcePath, id: doc.id, eventId });
    }
  });
  validateI18n(report, doc, locales, sourcePath);
}

function main() {
  const report = createReport();
  const locales = {
    de: readJson(path.join(LOCALE_ROOT, 'de.json')),
    en: readJson(path.join(LOCALE_ROOT, 'en.json')),
    es: readJson(path.join(LOCALE_ROOT, 'es.json')),
  };

  const eventRecords = walk(EVENT_ROOT, '.event.json').map((abs) => ({ sourcePath: toPosix(abs), doc: readJson(abs) }));
  const chainRecords = walk(CHAIN_ROOT, '.chain.json').map((abs) => ({ sourcePath: toPosix(abs), doc: readJson(abs) }));
  const learningRecords = walk(LEARNING_ROOT, '.learning-card.json').map((abs) => ({ sourcePath: toPosix(abs), doc: readJson(abs) }));

  const ids = new Map();
  [...eventRecords, ...chainRecords, ...learningRecords].forEach((record) => {
    const id = record.doc && record.doc.id;
    if (!id) return;
    if (ids.has(id)) {
      report.summary.duplicateIds += 1;
      push(report, 'errors', 'duplicate_id', 'Duplicate catalog id.', { id, firstSourcePath: ids.get(id), sourcePath: record.sourcePath });
    } else {
      ids.set(id, record.sourcePath);
    }
  });

  const eventIds = new Set(eventRecords.map((record) => record.doc.id));
  const chainIds = new Set(chainRecords.map((record) => record.doc.id));
  const learningIds = new Set(learningRecords.map((record) => record.doc.id));

  eventRecords.forEach((record) => validateEvent(report, record.doc, record.sourcePath, learningIds, chainIds, locales));
  chainRecords.forEach((record) => validateChain(report, record.doc, record.sourcePath, eventIds, locales));
  learningRecords.forEach((record) => validateLearningCard(report, record.doc, record.sourcePath, eventIds, locales));

  report.summary.eventsChecked = eventRecords.length;
  report.summary.chainsChecked = chainRecords.length;
  report.summary.learningCardsChecked = learningRecords.length;
  report.summary.idsChecked = ids.size;
  report.ok = report.errors.length === 0;

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_MD, [
    '# Event V2 Final Catalog Audit',
    '',
    `- ok: ${report.ok}`,
    `- eventsChecked: ${report.summary.eventsChecked}`,
    `- chainsChecked: ${report.summary.chainsChecked}`,
    `- learningCardsChecked: ${report.summary.learningCardsChecked}`,
    `- duplicateIds: ${report.summary.duplicateIds}`,
    `- missingI18nKeys: ${report.summary.missingI18nKeys}`,
    `- missingAssets: ${report.summary.missingAssets}`,
    `- invalidReferences: ${report.summary.invalidReferences}`,
    `- invalidRequiredFields: ${report.summary.invalidRequiredFields}`,
    `- errors: ${report.errors.length}`,
    `- warnings: ${report.warnings.length}`,
  ].join('\n') + '\n', 'utf8');

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
