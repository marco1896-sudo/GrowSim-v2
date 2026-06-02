'use strict';

(function initEventV2AssetTrialPlan(globalScope) {
  const TRIAL = Object.freeze({
    motifs: Object.freeze([
      'shared_rootbound_warning',
      'outdoor_heatwave_dry_wind',
      'shared_early_pest_signs_mild'
    ]),
    speechBubbleStrategy: 'option_b_overlay_later',
    primaryTool: 'vertex_imagen_class',
    fallbackTool: 'chatgpt_image_generation_class',
    roundsMaxPerMotif: 3
  });

  function getTrialPlan() {
    return TRIAL;
  }

  const api = Object.freeze({
    getTrialPlan,
    TRIAL
  });

  globalScope.EventV2AssetTrialPlan = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
