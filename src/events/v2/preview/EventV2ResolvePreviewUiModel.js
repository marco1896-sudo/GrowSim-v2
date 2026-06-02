'use strict';

function mapExpectedQualityBadge(expectedQuality, optionId) {
  const quality = String(expectedQuality || '').toLowerCase();
  const id = String(optionId || '').toLowerCase();
  if (quality === 'bad' || id === 'overreact' || id === 'ignore') {
    return 'riskant';
  }
  if (id === 'observe' || id === 'inspect' || id === 'wait') {
    return 'vorsichtig';
  }
  return 'empfohlen';
}

function buildResolvePreviewUiModel(preview) {
  const source = preview && typeof preview === 'object' ? preview : {};
  const options = Array.isArray(source.options) ? source.options.slice(0, 3) : [];
  return {
    ok: source.ok === true,
    mode: 'event_v2_resolve_preview_ui_no_apply',
    title: 'Entscheidungsvorschau',
    previewHint: 'Nur Vorschau \u00b7 nichts wird gespeichert',
    question: typeof source.question === 'string' && source.question.trim()
      ? source.question
      : 'Was m\u00f6chtest du tun?',
    options: options.map((option) => ({
      optionId: String(option.optionId || ''),
      label: String(option.label || 'Option'),
      badge: mapExpectedQualityBadge(option.expectedQuality, option.optionId),
      expectedQuality: String(option.expectedQuality || 'good'),
      feedbackPreview: String(option.feedbackPreview || ''),
      learningPreview: String(option.learningPreview || ''),
      feedbackSource: String(option.feedbackSource || 'generic_fallback'),
      plannedEffectsPreview: option.plannedEffectsPreview && typeof option.plannedEffectsPreview === 'object'
        ? option.plannedEffectsPreview
        : { stress: 0, risk: 0, notes: ['preview_only_no_write'] },
      canApply: false,
      canResolve: false,
    })),
    safetyLabels: [
      'Keine Entscheidung m\u00f6glich',
      'Nur Vorschau \u00b7 nichts wird gespeichert',
      'Kein Einfluss auf deinen Spielstand',
    ],
  };
}

var EVENT_V2_RESOLVE_PREVIEW_UI_MODEL_API = Object.freeze({
  buildResolvePreviewUiModel,
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EVENT_V2_RESOLVE_PREVIEW_UI_MODEL_API;
}

if (typeof globalThis !== 'undefined' && typeof globalThis.window !== 'undefined') {
  globalThis.EventV2ResolvePreviewUiModel = EVENT_V2_RESOLVE_PREVIEW_UI_MODEL_API;
}
