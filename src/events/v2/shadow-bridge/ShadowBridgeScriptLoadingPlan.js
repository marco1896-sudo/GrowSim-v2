'use strict';

const SHADOW_BRIDGE_SCRIPT_LOADING_PLAN = Object.freeze({
  phase: 40,
  status: 'strategy_only_no_runtime_loading',
  currentAppLoading: Object.freeze({
    kind: 'versioned_browser_script_list',
    ownerFile: 'index.html',
    appScriptPosition: 'last core script',
    appScript: 'app.js',
    versioning: 'query_param_build_id'
  }),
  recommendedStrategy: 'plan_isolated_browser_exposure_stub_first',
  recommendedOrder: Object.freeze([
    'keep_no_app_hook',
    'create_isolated_browser_exposure_stub',
    'test_stub_manually',
    'review_pwa_cache_impact',
    'only_then_consider_index_html_script_entry',
    'only_then_revisit_app_js_noop_hook'
  ]),
  rejectedForNow: Object.freeze([
    'direct_app_js_import',
    'require_in_app_js',
    'esm_import_in_app_js',
    'feature_flag_loading',
    'service_worker_cache_change',
    'automatic_runtime_execution'
  ])
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Object.freeze({
    SHADOW_BRIDGE_SCRIPT_LOADING_PLAN
  });
}

