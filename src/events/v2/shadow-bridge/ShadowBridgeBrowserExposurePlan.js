'use strict';

const SHADOW_BRIDGE_BROWSER_EXPOSURE_PLAN = Object.freeze({
  phase: 40,
  status: 'plan_only_no_exposure',
  purpose: 'Define how a future browser-safe stub could expose the guarded entry without app hook or activation.',
  futureStubProperties: Object.freeze({
    ownsGlobalRegistration: true,
    loadsAfterSnapshotDependencies: true,
    exposesOnlyGuardedEntryApi: true,
    defaultOff: true,
    noDomAccess: true,
    noSaveAccess: true,
    noEventActivation: true
  }),
  futureScriptPlacementOptions: Object.freeze([
    'index_html_before_app_js_after_shadow_bridge_dependencies',
    'manual_dev_html_only_for_smoke',
    'not_loaded'
  ]),
  safestNextStep: 'create_stub_but_do_not_load_it'
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Object.freeze({
    SHADOW_BRIDGE_BROWSER_EXPOSURE_PLAN
  });
}

