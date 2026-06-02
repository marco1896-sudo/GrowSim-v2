'use strict';

var EVENT_V2_PREVIEW_COPY_LABELS = (
  typeof globalThis !== 'undefined' &&
  globalThis.EventV2PreviewCopyLabels &&
  globalThis.EventV2PreviewCopyLabels.EVENT_V2_PREVIEW_COPY_LABELS
) || Object.freeze({
  devTest: 'Testmodus',
  eventCenterPreview: 'Event-Vorschau',
  runtimeShadow: 'Testauswertung im Hintergrund',
  candidateOnly: 'Vorschlagskarte',
  noWrite: 'Nur Vorschau · nichts wird gespeichert',
  noResolve: 'Keine Entscheidung möglich',
  noGameplayActivation: 'Kein Einfluss auf deinen Spielstand',
  score: 'Trefferstärke',
  reason: 'Warum dieser Hinweis erscheint',
  fixture: 'Testszenario',
  watchpoint: 'Beobachtungspunkt',
  preview: 'Vorschau',
});

const SAFETY_LABEL_KEY_MAP = Object.freeze({
  'Dev/Test': 'devTest',
  'Event Center Preview': 'eventCenterPreview',
  'Runtime Shadow': 'runtimeShadow',
  'Candidate Only': 'candidateOnly',
  'No Write': 'noWrite',
  'No Resolve': 'noResolve',
  'No Gameplay Activation': 'noGameplayActivation',
});

function getEventV2PreviewLabel(key, fallback) {
  if (key && Object.prototype.hasOwnProperty.call(EVENT_V2_PREVIEW_COPY_LABELS, key)) {
    return EVENT_V2_PREVIEW_COPY_LABELS[key];
  }
  return typeof fallback === 'string' ? fallback : String(key || '');
}

function mapEventV2SafetyLabels(labels) {
  const list = Array.isArray(labels) ? labels : [];
  return list.map((label) => {
    const key = SAFETY_LABEL_KEY_MAP[String(label || '').trim()];
    return key ? getEventV2PreviewLabel(key, label) : String(label || '');
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Object.freeze({
    EVENT_V2_PREVIEW_COPY_LABELS,
    getEventV2PreviewLabel,
    mapEventV2SafetyLabels,
  });
}

if (typeof globalThis !== 'undefined' && typeof globalThis.window !== 'undefined') {
  globalThis.EventV2PreviewCopyLabels = Object.freeze({
    EVENT_V2_PREVIEW_COPY_LABELS,
    getEventV2PreviewLabel,
    mapEventV2SafetyLabels,
  });
}
