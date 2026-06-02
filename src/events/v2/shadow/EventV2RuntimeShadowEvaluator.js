'use strict';

const fs = require('fs');
const path = require('path');
const { loadFullCatalogRecords } = require('../catalog/FullCatalogLoader.js');
const { createRuntimeSnapshot } = require('./EventV2RuntimeSnapshotAdapter.js');

function categoryWeight(category) {
  const map = {
    water: 1.05,
    environment: 1.02,
    nutrition: 1.0,
    pest: 0.98,
    positive: 0.95,
    special: 0.97,
  };
  return map[String(category || 'unknown').toLowerCase()] || 0.9;
}

function severityWeight(level) {
  const map = {
    info: 0.7,
    warning: 1,
    critical: 1.15,
    unknown: 0.8,
  };
  return map[String(level || 'unknown').toLowerCase()] || 0.8;
}

function revisionWeight(revisionStatus) {
  const map = {
    ready: 1,
    usable_with_watch: 0.9,
    temporary_usable_needs_revision: 0.78,
  };
  return map[String(revisionStatus || 'unknown').toLowerCase()] || 0.65;
}

function deterministicScore(eventDoc) {
  const category = String(eventDoc && eventDoc.category || 'unknown');
  const severity = String(eventDoc && eventDoc.severity && eventDoc.severity.level || 'unknown');
  const revision = String(eventDoc && eventDoc.assetRefs && eventDoc.assetRefs.revisionStatus || 'unknown');
  const hasAssetRefs = Boolean(eventDoc && eventDoc.assetRefs && eventDoc.assetRefs.hero && eventDoc.assetRefs.fallback);
  const hasCover = Boolean(eventDoc && eventDoc.assets && eventDoc.assets.cover && eventDoc.assets.cover.src);

  const base = 100;
  const weighted = base * categoryWeight(category) * severityWeight(severity) * revisionWeight(revision);
  const qualityPenalty = hasAssetRefs ? 0 : 20;
  const coverPenalty = hasCover ? 0 : 10;
  return Math.max(0, Number((weighted - qualityPenalty - coverPenalty).toFixed(2)));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function includesAny(text, tokens) {
  const normalized = String(text || '').toLowerCase();
  return tokens.some((token) => normalized.includes(String(token).toLowerCase()));
}

function toTagsSet(eventDoc) {
  const tags = Array.isArray(eventDoc && eventDoc.tags) ? eventDoc.tags : [];
  return new Set(tags.map((tag) => String(tag || '').toLowerCase()));
}

function scoreWithSnapshot(eventDoc, snapshotEnvelope) {
  const base = deterministicScore(eventDoc);
  const snapshot = snapshotEnvelope && snapshotEnvelope.snapshot ? snapshotEnvelope.snapshot : null;
  if (!snapshot) {
    return {
      score: base,
      reason: 'deterministic_static_shadow_score',
    };
  }

  const tags = toTagsSet(eventDoc);
  const id = String(eventDoc && eventDoc.id || '').toLowerCase();
  const category = String(eventDoc && eventDoc.category || '').toLowerCase();
  let boost = 0;
  const reasons = [];

  const env = String(snapshot.run && snapshot.run.environment || 'shared').toLowerCase();
  if (env === 'indoor' && (tags.has('mode_indoor') || id.includes('indoor_'))) {
    boost += 14;
    reasons.push('environment_indoor_match');
  }
  if (env === 'outdoor' && (tags.has('mode_outdoor') || id.includes('outdoor_'))) {
    boost += 14;
    reasons.push('environment_outdoor_match');
  }

  const vpd = snapshot.climate ? snapshot.climate.vpd : null;
  if (vpd !== null && vpd !== undefined) {
    if (vpd > 1.35 && includesAny(id + ' ' + category, ['vpd', 'climate'])) {
      boost += 20;
      reasons.push('high_vpd_climate_signal');
    }
    if (vpd < 0.75 && includesAny(id + ' ' + category, ['humidity', 'mold', 'fung'])) {
      boost += 10;
      reasons.push('low_vpd_humidity_signal');
    }
  }

  const temperature = snapshot.climate ? snapshot.climate.temperature : null;
  if (temperature !== null && temperature >= 30 && includesAny(id + ' ' + category, ['heat', 'burn', 'dry'])) {
    boost += 18;
    reasons.push('high_temperature_heat_signal');
  }

  const humidity = snapshot.climate ? snapshot.climate.humidity : null;
  if (humidity !== null && humidity <= 35 && includesAny(id + ' ' + category, ['dry', 'vpd', 'climate'])) {
    boost += 10;
    reasons.push('low_humidity_dry_signal');
  }

  const stress = snapshot.plant ? snapshot.plant.stress : null;
  if (stress !== null && stress >= 55 && category !== 'positive') {
    boost += 8;
    reasons.push('plant_stress_nonpositive_bias');
  }
  if (stress !== null && stress <= 25 && category === 'positive') {
    boost += 8;
    reasons.push('healthy_positive_bias');
  }

  const health = snapshot.plant ? snapshot.plant.health : null;
  if (health !== null && health <= 45 && includesAny(id + ' ' + category, ['warning', 'stress', 'root', 'pest', 'burn'])) {
    boost += 6;
    reasons.push('low_health_problem_bias');
  }

  const water = snapshot.plant ? snapshot.plant.water : null;
  if (water !== null && water <= 35 && includesAny(id + ' ' + category, ['dry', 'water', 'drought'])) {
    boost += 8;
    reasons.push('low_water_bias');
  }

  const nutrients = snapshot.plant ? snapshot.plant.nutrients : null;
  if (nutrients !== null && nutrients <= 35 && includesAny(id + ' ' + category, ['nutri', 'deficien'])) {
    boost += 8;
    reasons.push('low_nutrient_bias');
  }

  const rootzone = snapshot.plant ? snapshot.plant.rootzone : null;
  if (rootzone !== null && rootzone >= 70 && includesAny(id + ' ' + category, ['root', 'pot', 'bound'])) {
    boost += 14;
    reasons.push('root_pressure_bias');
  }

  const finalScore = clamp(Number((base + boost).toFixed(2)), 0, 200);
  return {
    score: finalScore,
    reason: reasons.length > 0
      ? `snapshot_shadow_score:${reasons.join('|')}`
      : 'snapshot_shadow_score:no_specific_boost',
  };
}

function normalizeEnvironment(eventDoc, sourceGroup) {
  if (typeof sourceGroup === 'string') {
    if (sourceGroup.includes('events/indoor')) return 'indoor';
    if (sourceGroup.includes('events/outdoor')) return 'outdoor';
    if (sourceGroup.includes('events/shared')) return 'shared';
  }
  const tags = Array.isArray(eventDoc && eventDoc.tags) ? eventDoc.tags : [];
  if (tags.includes('mode_indoor')) return 'indoor';
  if (tags.includes('mode_outdoor')) return 'outdoor';
  return 'shared';
}

function resolveImage(eventDoc) {
  const assetRefs = eventDoc && eventDoc.assetRefs ? eventDoc.assetRefs : {};
  const cover = eventDoc && eventDoc.assets && eventDoc.assets.cover ? eventDoc.assets.cover : {};
  if (typeof assetRefs.hero === 'string' && assetRefs.hero.trim()) return assetRefs.hero;
  if (typeof cover.src === 'string' && cover.src.trim()) return cover.src;
  if (typeof cover.fallback === 'string' && cover.fallback.trim()) return cover.fallback;
  return '';
}

function evaluateRuntimeShadow(input) {
  const safeInput = input && typeof input === 'object' ? input : {};
  const rootDir = safeInput.rootDir ? path.resolve(String(safeInput.rootDir)) : process.cwd();
  const records = Array.isArray(safeInput.catalogRecords)
    ? safeInput.catalogRecords.slice()
    : loadFullCatalogRecords();

  const eventRecords = records.filter((record) => String(record.sourceGroup || '').startsWith('events/'));

  const snapshotEnvelope = safeInput.runtimeSnapshot
    ? createRuntimeSnapshot(safeInput.runtimeSnapshot)
    : null;

  const candidates = eventRecords.map((record) => {
    const doc = record && record.data ? record.data : {};
    const imageSrc = resolveImage(doc);
    const imageExists = imageSrc ? fs.existsSync(path.join(rootDir, imageSrc)) : false;
    const scoreMeta = snapshotEnvelope
      ? scoreWithSnapshot(doc, snapshotEnvelope)
      : { score: deterministicScore(doc), reason: 'deterministic_static_shadow_score' };
    const score = scoreMeta.score;
    const eligible = Boolean(doc && doc.id && imageSrc && imageExists);
    const reason = eligible ? scoreMeta.reason : 'missing_required_fields_or_image';

    return {
      eventId: doc && doc.id ? doc.id : null,
      category: doc && doc.category ? doc.category : 'unknown',
      environment: normalizeEnvironment(doc, record.sourceGroup),
      severity: doc && doc.severity && doc.severity.level ? doc.severity.level : 'unknown',
      score,
      eligible,
      reason,
      imageSrc,
      revisionStatus: doc && doc.assetRefs ? doc.assetRefs.revisionStatus || 'unknown' : 'unknown',
      shadowOnly: true,
      imageExists,
    };
  }).sort((a, b) => String(a.eventId || '').localeCompare(String(b.eventId || '')));

  const blocked = candidates.filter((c) => !c.eligible).map((c) => ({ eventId: c.eventId, reason: c.reason }));
  const warnings = [];
  if (!safeInput.runtimeState && !safeInput.runtimeSnapshot) {
    warnings.push('runtime_state_not_provided_static_scoring_used');
  }
  if (snapshotEnvelope && Array.isArray(snapshotEnvelope.warnings)) {
    warnings.push(...snapshotEnvelope.warnings);
  }

  return {
    ok: true,
    mode: 'runtime_shadow_no_write',
    canMutateState: false,
    canMutateSave: false,
    canActivateGameplay: false,
    evaluatedAt: new Date().toISOString(),
    inputSummary: {
      hasRuntimeState: Boolean(safeInput.runtimeState || safeInput.runtimeSnapshot),
      hasCatalog: eventRecords.length > 0,
      eventCount: eventRecords.length,
      hasSnapshotScoring: Boolean(snapshotEnvelope),
    },
    mutationGuards: {
      stateMutations: 0,
      saveWrites: 0,
      uiActions: 0,
      gameplayActivations: 0,
    },
    result: {
      candidates,
      selectedPreviewCandidates: candidates.filter((c) => c.eligible).slice(0, 5),
      blocked,
      warnings,
      snapshot: snapshotEnvelope,
    },
  };
}

module.exports = Object.freeze({
  evaluateRuntimeShadow,
});
