'use strict';

const DEFAULT_IMAGE_FALLBACK = 'assets/events/event-stress-recovery.png';
const DEFAULT_COPY_LABELS = Object.freeze({
  devTest: 'Testmodus',
  candidateOnly: 'Vorschlagskarte',
  noWrite: 'Nur Vorschau · nichts wird gespeichert',
  noResolve: 'Keine Entscheidung möglich',
  noGameplayActivation: 'Kein Einfluss auf deinen Spielstand',
  fixture: 'Testszenario',
});

var EVENT_V2_PREVIEW_COPY_LABELS = DEFAULT_COPY_LABELS;
if (typeof module !== 'undefined' && module.exports) {
  try {
    EVENT_V2_PREVIEW_COPY_LABELS = require('./EventV2PreviewCopyLabels.js').EVENT_V2_PREVIEW_COPY_LABELS || DEFAULT_COPY_LABELS;
  } catch (_) {
    EVENT_V2_PREVIEW_COPY_LABELS = DEFAULT_COPY_LABELS;
  }
} else if (typeof globalThis !== 'undefined' && globalThis.EventV2PreviewCopyLabels) {
  EVENT_V2_PREVIEW_COPY_LABELS = globalThis.EventV2PreviewCopyLabels.EVENT_V2_PREVIEW_COPY_LABELS || DEFAULT_COPY_LABELS;
}

function summarizeReason(reason) {
  const raw = String(reason || '').trim();
  if (!raw) {
    return {
      diagnosis: 'No runtime diagnosis available.',
      whyItMatters: 'This candidate currently has limited shadow diagnostics.',
      observationHint: 'Check fixture context and compare with neighboring candidates.',
    };
  }
  const compact = raw.replace(/^snapshot_shadow_score:/, '').replace(/\|/g, ', ');
  return {
    diagnosis: `Shadow diagnosis: ${compact}`,
    whyItMatters: 'The score reflects simulated runtime pressure signals in dev/test mode.',
    observationHint: 'Use this preview to compare plausibility before any real activation.',
  };
}

function createSingleCandidateDetailPreviewModel(input) {
  const candidate = input && typeof input === 'object' ? input : {};
  const learningPreview = summarizeReason(candidate.reason);

  return {
    ok: true,
    mode: 'event_v2_single_candidate_detail_preview_no_resolve',
    candidateId: candidate.id || null,
    eventId: candidate.eventId || 'unknown_event',
    title: candidate.title || candidate.eventId || 'unknown_event',
    subtitle: `${candidate.fixtureLabel || candidate.fixtureId || EVENT_V2_PREVIEW_COPY_LABELS.fixture} · rank ${Number.isFinite(Number(candidate.rank)) ? Number(candidate.rank) : '-'}`,
    description: candidate.reason || 'No reason available.',
    category: candidate.category || 'unknown',
    environment: candidate.environment || 'shared',
    severity: candidate.severity || 'unknown',
    score: Number.isFinite(Number(candidate.score)) ? Number(candidate.score) : 0,
    reason: candidate.reason || 'unknown',
    imageSrc: candidate.imageSrc || '',
    imageFallback: candidate.imageFallback || DEFAULT_IMAGE_FALLBACK,
    revisionStatus: candidate.revisionStatus || 'unknown',
    safetyLabels: [
      EVENT_V2_PREVIEW_COPY_LABELS.devTest,
      EVENT_V2_PREVIEW_COPY_LABELS.candidateOnly,
      EVENT_V2_PREVIEW_COPY_LABELS.noWrite,
      EVENT_V2_PREVIEW_COPY_LABELS.noResolve,
      EVENT_V2_PREVIEW_COPY_LABELS.noGameplayActivation,
    ],
    learningPreview,
    actions: [],
    selectedCandidate: null,
    canResolve: false,
    canActivateGameplay: false,
    canMutateState: false,
    canMutateSave: false,
    runtimeWriteEnabled: false,
    productionEnabled: false,
    diagnostics: {
      stateMutations: 0,
      saveWrites: 0,
      localStorageWrites: 0,
      indexedDbWrites: 0,
      uiActions: 0,
      gameplayActivations: 0,
    },
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Object.freeze({
    createSingleCandidateDetailPreviewModel,
  });
}

if (typeof globalThis !== 'undefined' && typeof globalThis.window !== 'undefined') {
  globalThis.EventV2SingleCandidateDetailPreviewModel = Object.freeze({
    createSingleCandidateDetailPreviewModel,
  });
}

