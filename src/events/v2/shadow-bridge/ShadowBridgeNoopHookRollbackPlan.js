'use strict';

const NOOP_HOOK_ROLLBACK_PLAN = Object.freeze({
  phase: 56,
  status: 'plan_only',
  rollbackTarget: 'future minimal app.js no-op hook only',
  rollbackPrinciple: 'Remove exactly the future hook line/helper and leave legacy flow authoritative.',
  rollbackTriggers: Object.freeze([
    'window.ShadowBridgeGuardedEntry appears before explicit registration',
    'hook passes live state',
    'hook return value affects gameplay',
    'save or storage write appears',
    'UI change appears',
    'event activation appears',
    'combined report fails',
    'browser registration smoke fails',
    'boot error appears'
  ]),
  rollbackSteps: Object.freeze([
    'Remove the future app.js no-op hook call/helper only.',
    'Keep the passive Bundle Candidate script tag unless separately approved for rollback.',
    'Re-run loading safety static check.',
    'Re-run browser global registration smoke.',
    'Re-run combined report and guarded entry contract tests.',
    'Verify app starts and legacy events remain authoritative.'
  ]),
  forbiddenRollbackActions: Object.freeze([
    'Do not modify save/persistence files.',
    'Do not alter feature flags.',
    'Do not change existing src/events/*.js.',
    'Do not remove unrelated app.js changes.'
  ])
});

function getShadowBridgeNoopHookRollbackPlan() {
  return NOOP_HOOK_ROLLBACK_PLAN;
}

module.exports = {
  NOOP_HOOK_ROLLBACK_PLAN,
  getShadowBridgeNoopHookRollbackPlan
};
