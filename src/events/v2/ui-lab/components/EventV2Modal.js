'use strict';

(function initEventV2Modal(globalScope) {
  function normalizeAssetPath(assetPath) {
    if (typeof assetPath !== 'string' || assetPath.length === 0) {
      return '';
    }
    if (assetPath.indexOf('://') >= 0 || assetPath.startsWith('/') || assetPath.startsWith('../')) {
      return assetPath;
    }
    if (assetPath.startsWith('assets/')) {
      return '../' + assetPath;
    }
    return assetPath;
  }

  function renderEventV2Modal(scenario, contentHtml) {
    const imagePath = normalizeAssetPath(scenario.image);
    return (
      '<article class="event-v2-modal">' +
      '<div class="hero" data-hero-id="' + scenario.id + '">' +
      '<img src="' + imagePath + '" alt="Event Visual: ' + scenario.title + '" loading="lazy" data-hero-image="1">' +
      '<div class="hero-fallback">Visual wird geladen</div>' +
      '</div>' +
      '<div class="body">' +
      '<p class="kicker">Was ist los?</p>' +
      '<h1>' + scenario.title + '</h1>' +
      '<p class="symptom">' + scenario.symptom + '</p>' +
      contentHtml +
      '</div>' +
      '</article>'
    );
  }

  globalScope.EventV2Modal = Object.freeze({ renderEventV2Modal, normalizeAssetPath });
})(typeof globalThis !== 'undefined' ? globalThis : window);
