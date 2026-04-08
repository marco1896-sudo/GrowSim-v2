'use strict';

(function initEventContradictions(globalScope) {
  const shared = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
    ? require('./eventShared.js')
    : globalScope.GrowSimEventShared;

  function describeContract() {
    return Object.freeze({
      phase: 'shadow',
      responsibility: 'contradiction prevention and candidate exclusion guards'
    });
  }

  function tokenizeEvent(eventDef) {
    const idTokens = String(eventDef && eventDef.id || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const tagTokens = shared.normalizeStringArray(eventDef && eventDef.tags)
      .map((token) => token.toLowerCase());
    return Array.from(new Set(idTokens.concat(tagTokens)));
  }

  function deriveConflictGroup(eventDef) {
    const category = String(eventDef && eventDef.category || 'generic').toLowerCase();
    const tokens = tokenizeEvent(eventDef);

    if (category === 'water' && (tokens.includes('dry') || tokens.includes('drought') || tokens.includes('gap'))) return 'water_dry';
    if (category === 'water' && (tokens.includes('wet') || tokens.includes('overwater') || tokens.includes('root'))) return 'water_wet_root';
    if (category === 'nutrition' && (tokens.includes('lockout') || tokens.includes('salt') || tokens.includes('ph'))) return 'nutrition_lockout';
    if (category === 'disease' && (tokens.includes('mold') || tokens.includes('fungus') || tokens.includes('fungal'))) return 'disease_mold';
    if (category === 'disease' && tokens.includes('root')) return 'disease_root';
    if (category === 'pest') return 'pest_pressure';
    if (category === 'environment' && (tokens.includes('heat') || tokens.includes('hot') || tokens.includes('vpd') || tokens.includes('dry'))) return 'climate_heat_dry';
    if (category === 'environment' && (tokens.includes('cold') || tokens.includes('night'))) return 'climate_cold';
    if (category === 'positive') return 'positive';
    return category;
  }

  function evaluateCandidate(eventDef, stateLike, snapshot) {
    const state = stateLike && typeof stateLike === 'object' ? stateLike : {};
    const events = state.events && typeof state.events === 'object' ? state.events : {};
    const status = snapshot && snapshot.status ? snapshot.status : {};
    const reasons = [];

    if (!eventDef || !eventDef.id) {
      reasons.push('missing_event_id');
    }

    const machineState = String(events.machineState || 'idle');
    if ((machineState === 'activeEvent' || machineState === 'resolving') && String(events.activeEventId || '') !== String(eventDef && eventDef.id || '')) {
      reasons.push('runtime_busy');
    }

    if (String(events.activeEventId || '') === String(eventDef && eventDef.id || '')) {
      reasons.push('already_active');
    }

    if (String(eventDef && eventDef.category || '').toLowerCase() === 'positive') {
      if (Number(status.stress || 0) > 48 || Number(status.risk || 0) > 45 || Number(status.health || 0) < 55) {
        reasons.push('positive_conflicts_negative_state');
      }
    }

    return {
      allowed: reasons.length === 0,
      blockedBy: reasons,
      conflictGroup: deriveConflictGroup(eventDef)
    };
  }

  function filterConflictingCandidates(candidates) {
    return resolveCandidateConflicts(candidates).kept;
  }

  function resolveCandidateConflicts(candidates) {
    const byGroup = new Map();
    const suppressed = [];
    for (const candidate of Array.isArray(candidates) ? candidates : []) {
      const group = String(candidate && candidate.conflictGroup || 'generic');
      const current = byGroup.get(group);
      if (!current || Number(candidate.activationScore || 0) > Number(current.activationScore || 0)) {
        if (current) {
          suppressed.push({
            ...current,
            suppressedByEventId: candidate.eventId,
            suppressionReason: 'conflict_group_suppressed'
          });
        }
        byGroup.set(group, candidate);
      } else {
        suppressed.push({
          ...candidate,
          suppressedByEventId: current ? current.eventId : null,
          suppressionReason: 'conflict_group_suppressed'
        });
      }
    }
    return {
      kept: Array.from(byGroup.values()),
      suppressed
    };
  }

  const api = Object.freeze({
    describeContract,
    tokenizeEvent,
    deriveConflictGroup,
    evaluateCandidate,
    filterConflictingCandidates,
    resolveCandidateConflicts
  });

  globalScope.GrowSimEventContradictions = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
