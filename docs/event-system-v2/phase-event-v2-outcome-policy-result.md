# Eventsystem V2 – Outcome-Policy (Result)

## Executive Summary
Fuer `indoor_dry_rootball` wurde eine zentrale Outcome-Policy eingefuehrt und in die Bridge eingebunden.  
Das sichtbare Verhalten bleibt unveraendert: `stabilize` mutiert kontrolliert, `inspect` bleibt `diagnostic_only`, `overreact` bleibt `guardrail_only` ohne Statusmutation.

## Neue Dateien
- `src/events/v2/runtime/EventV2OutcomePolicy.js`
- `dev/run-event-v2-outcome-policy-smoke.js`
- `docs/event-system-v2/phase-event-v2-outcome-policy.md`
- `docs/event-system-v2/phase-event-v2-outcome-policy-result.md`

## Geänderte Dateien
- `src/events/EventSystemRuntimeBridge.js`
- `index.html`

## Policy-Struktur
- Zentrale Event-/Option-Policies ueber:
  - `getEventV2OutcomePolicy(eventId, optionId)`
  - `resolveEventV2OutcomePolicy(eventId, optionId, context)`
  - `validateEventV2OutcomePolicy(policy)`
  - `applyEventV2OutcomePolicyToState(state, policy, context)`
- Definiert fuer `indoor_dry_rootball`:
  - `stabilize`: `apply_delta`
  - `inspect`: `no_delta`
  - `overreact`: `guardrail_only` + `futureDeltasBlocked`

## Testbefehle
- `node --check src/events/v2/runtime/EventV2OutcomePolicy.js`
- `node --check src/events/EventSystemRuntimeBridge.js`
- `node --check dev/run-event-v2-outcome-policy-smoke.js`
- `node dev/run-event-v2-outcome-policy-smoke.js`
- plus bestehende Pilot-Smokes und Regressionen

## Testergebnisse
Alle geforderten Syntaxchecks, Outcome-Policy-Smoke, Event-Center-Smokes und Regressionen (`check:syntax`, `test:event-release`, `test:smoke`) liefen gruen.

## Restrisiken
- Policy ist aktuell bewusst nur auf `indoor_dry_rootball` produktiv ausgelegt.
- `overreact` bleibt absichtlich ohne negative Live-Mutation bis zu einer spaeteren Balancing-Freigabe.

## Nächste Mini-Phase
Outcome-Policy-Matrix optional um eine explizite, weiterhin blockierte Balancing-Stufe fuer `overreact` erweitern (nur Regelwerk, noch ohne Live-Mutation).
