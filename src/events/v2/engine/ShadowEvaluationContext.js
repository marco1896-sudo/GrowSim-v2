'use strict';

/**
 * Immutable context contract for shadow evaluations.
 * No game-state mutation. No runtime coupling.
 */
function createShadowEvaluationContext(input) {
  const nowMs = Number(input && input.nowMs) || Date.now();
  const snapshot = (input && input.snapshot) || Object.freeze({});
  const meta = (input && input.meta) || Object.freeze({});

  const errors = [];

  if (typeof nowMs !== 'number' || Number.isNaN(nowMs)) {
    errors.push(Object.freeze({
      code: 'invalid_now_ms',
      message: 'nowMs must resolve to a finite number.'
    }));
  }

  return Object.freeze({
    nowMs,
    snapshot,
    meta,
    errors: Object.freeze(errors)
  });
}

module.exports = Object.freeze({
  createShadowEvaluationContext
});
