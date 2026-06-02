'use strict';

const { createValidationDiagnostic } = require('./ValidationDiagnostic');
const RuleScope = require('./RuleScope');
const { invalidReferenceSeverity } = require('./SeverityThresholds');

function extractId(entry) {
  return entry && entry.data && typeof entry.data.id === 'string' ? entry.data.id : null;
}

function validateCrossReferences(entries) {
  const diagnostics = [];
  const list = Array.isArray(entries) ? entries : [];

  const eventIdSet = new Set();
  const learningCardIdSet = new Set();

  list.forEach((entry) => {
    const id = extractId(entry);
    if (!id) {
      return;
    }
    if (entry.kind === 'event') {
      eventIdSet.add(id);
    }
    if (entry.kind === 'learning-card') {
      learningCardIdSet.add(id);
    }
  });

  list.forEach((entry) => {
    const data = entry && entry.data ? entry.data : {};
    const fileName = entry && entry.fileName;

    if (entry.kind === 'chain' && Array.isArray(data.steps)) {
      const stepIdSet = new Set(data.steps.map((s) => s && s.id).filter(Boolean));
      data.steps.forEach((step) => {
        if (!step || typeof step !== 'object') {
          return;
        }
        if (typeof step.eventId === 'string' && !eventIdSet.has(step.eventId)) {
          diagnostics.push(createValidationDiagnostic({
            ruleId: 'xref_chain_event_id_missing',
            severity: invalidReferenceSeverity('chain'),
            ruleScope: RuleScope.REQUIRED,
            fileName,
            message: 'Chain step references missing eventId: ' + step.eventId,
            details: { stepId: step.id || null, eventId: step.eventId }
          }));
        }

        const transitions = step.transitionsOnOutcome && typeof step.transitionsOnOutcome === 'object'
          ? step.transitionsOnOutcome
          : {};
        Object.keys(transitions).forEach((outcomeKey) => {
          const ref = transitions[outcomeKey];
          const target = ref && typeof ref.to === 'string' ? ref.to : null;
          if (target && !stepIdSet.has(target)) {
            diagnostics.push(createValidationDiagnostic({
              ruleId: 'xref_chain_step_target_missing',
              severity: invalidReferenceSeverity('chain'),
              ruleScope: RuleScope.REQUIRED,
              fileName,
              message: 'Chain transition references missing step target: ' + target,
              details: { stepId: step.id || null, outcome: outcomeKey, target: target }
            }));
          }
        });
      });
    }

    if (entry.kind === 'event' && data.learningCard && typeof data.learningCard.ref === 'string') {
      if (!learningCardIdSet.has(data.learningCard.ref)) {
        diagnostics.push(createValidationDiagnostic({
          ruleId: 'xref_learning_card_ref_missing',
          severity: invalidReferenceSeverity('event'),
          ruleScope: RuleScope.RECOMMENDED,
          fileName,
          message: 'Event learningCard.ref not found in loaded learning-card examples: ' + data.learningCard.ref,
          details: { ref: data.learningCard.ref }
        }));
      }
    }
  });

  return Object.freeze(diagnostics);
}

module.exports = Object.freeze({
  validateCrossReferences
});

