'use strict';

const RuleScope = require('../validation/RuleScope');
const { normalizeSeverity } = require('../validation/DiagnosticSeverity');
const { createDeltaGate } = require('./DeltaGate');

function countBySeverity(items, wanted) {
  return (Array.isArray(items) ? items : []).filter((d) => normalizeSeverity(d && d.severity) === wanted).length;
}

function countEscalationsByScope(escalated, ruleScope) {
  return (Array.isArray(escalated) ? escalated : []).filter((pair) => {
    const after = pair && pair.after ? pair.after : {};
    return String(after.ruleScope || '') === ruleScope;
  }).length;
}

function countEscalationsByFamily(escalated, family) {
  return (Array.isArray(escalated) ? escalated : []).filter((pair) => {
    const after = pair && pair.after ? pair.after : {};
    return String(after.ruleFamily || '') === family;
  }).length;
}

function createDeltaGatePolicy(options) {
  const value = options || {};
  const name = value.name || 'delta_gate_policy';
  const allowedNewErrors = Number(value.allowedNewErrors || 0);
  const minScore = Number.isFinite(Number(value.minHealthScore)) ? Number(value.minHealthScore) : 60;
  const allowRequiredEscalations = value.allowRequiredEscalations === true;
  const blockOnAnyEscalation = value.blockOnAnyEscalation === true;
  const blockedFamilies = Array.isArray(value.blockedEscalationFamilies) ? value.blockedEscalationFamilies : ['crossReference'];
  const familyEscalationBudget = value.familyEscalationBudget && typeof value.familyEscalationBudget === 'object'
    ? value.familyEscalationBudget
    : {};

  const gates = [
    createDeltaGate({
      id: 'no_new_blockers',
      label: 'No new blockers allowed',
      evaluate: (delta) => {
        const next = Array.isArray(delta && delta.added) ? delta.added : [];
        const blockerCount = countBySeverity(next, 'blocker');
        return Object.freeze({
          pass: blockerCount === 0,
          reason: blockerCount === 0 ? 'No new blockers.' : 'New blockers detected: ' + blockerCount
        });
      }
    }),
    createDeltaGate({
      id: 'limited_new_errors',
      label: 'New errors must stay within tolerance',
      evaluate: (delta) => {
        const next = Array.isArray(delta && delta.added) ? delta.added : [];
        const errorCount = countBySeverity(next, 'error');
        return Object.freeze({
          pass: errorCount <= allowedNewErrors,
          reason: 'New errors: ' + errorCount + ', allowed: ' + allowedNewErrors
        });
      }
    }),
    createDeltaGate({
      id: 'health_score_threshold',
      label: 'Health score must not fall below threshold',
      evaluate: (delta) => {
        const scoreAfter = Number((delta && delta.scoreAfter) || 0);
        return Object.freeze({
          pass: scoreAfter >= minScore,
          reason: 'Score after: ' + scoreAfter + ', threshold: ' + minScore
        });
      }
    }),
    createDeltaGate({
      id: 'no_required_escalation',
      label: 'No escalations in required rules',
      evaluate: (delta) => {
        const requiredEscalationCount = countEscalationsByScope(delta && delta.escalated, RuleScope.REQUIRED);
        return Object.freeze({
          pass: allowRequiredEscalations ? true : requiredEscalationCount === 0,
          reason: requiredEscalationCount === 0
            ? 'No required rule escalations.'
            : 'Required rule escalations: ' + requiredEscalationCount
        });
      }
    }),
    createDeltaGate({
      id: 'blocked_families_escalation',
      label: 'No escalations in blocked rule families',
      evaluate: (delta) => {
        let violations = 0;
        blockedFamilies.forEach((family) => {
          violations += countEscalationsByFamily(delta && delta.escalated, family);
        });
        return Object.freeze({
          pass: violations === 0,
          reason: violations === 0
            ? 'No blocked-family escalations.'
            : 'Blocked-family escalations: ' + violations
        });
      }
    }),
    createDeltaGate({
      id: 'family_escalation_budget',
      label: 'Escalations must stay within per-family budget',
      evaluate: (delta) => {
        const escalated = Array.isArray(delta && delta.escalated) ? delta.escalated : [];
        const overBudget = Object.keys(familyEscalationBudget).filter((family) => {
          const limit = Number(familyEscalationBudget[family]);
          const count = countEscalationsByFamily(escalated, family);
          return Number.isFinite(limit) && count > limit;
        });
        return Object.freeze({
          pass: overBudget.length === 0,
          reason: overBudget.length === 0 ? 'Family escalation budgets respected.' : 'Escalation budget exceeded for: ' + overBudget.join(', ')
        });
      }
    }),
    createDeltaGate({
      id: 'any_escalation_guard',
      label: 'Optional strict guard against any escalations',
      evaluate: (delta) => {
        const escalationCount = Array.isArray(delta && delta.escalated) ? delta.escalated.length : 0;
        return Object.freeze({
          pass: blockOnAnyEscalation ? escalationCount === 0 : true,
          reason: blockOnAnyEscalation
            ? 'Escalations: ' + escalationCount
            : 'Any-escalation guard disabled.'
        });
      }
    })
  ];

  function evaluate(deltaReport) {
    const results = gates.map((gate) => Object.freeze({
      id: gate.id,
      label: gate.label,
      result: gate.evaluate(deltaReport)
    }));

    const pass = results.every((r) => r.result && r.result.pass === true);
    return Object.freeze({
      pass,
      gates: Object.freeze(results)
    });
  }

  return Object.freeze({
    name,
    allowedNewErrors,
    minScore,
    allowRequiredEscalations,
    blockOnAnyEscalation,
    blockedFamilies: Object.freeze(blockedFamilies.slice()),
    familyEscalationBudget: Object.freeze(Object.assign({}, familyEscalationBudget)),
    evaluate
  });
}

function createDefaultDeltaGatePolicy(options) {
  return createDeltaGatePolicy(Object.assign({ name: 'default_delta_gate_policy' }, options || {}));
}

module.exports = Object.freeze({
  createDeltaGatePolicy,
  createDefaultDeltaGatePolicy
});
