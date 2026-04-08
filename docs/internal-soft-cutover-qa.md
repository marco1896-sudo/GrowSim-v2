# Internal Soft-Cutover QA Note

Internal-only usage for Phase 10B.

## Enable

Set the event runtime mode to:

- `internal-soft-cutover`

This must only be used for internal QA or local testing. Normal users must remain on legacy mode.

## Expected scoped responsibilities

Current allowed internal soft-cutover scope is intentionally narrow:

- `tick`: `shadow_activation_preflight`
- `choice`: `shadow_choice_preview_packaging`
- `ui`: `ui_model_packaging`

Legacy remains the live authority for triggering, activation, resolution, state mutation, and persistence ownership.

## What to inspect

Use internal engine diagnostics/status helpers to inspect:

- current mode and live authority
- whether soft-cutover was requested
- whether it actually became active
- fallback reasons when it stayed on legacy
- routed responsibility counts
- readiness-level distribution
- recent route outcomes

## What fallback means

Fallback means the system immediately stayed on legacy because one or more runtime guardrails blocked the internal route.

Common reasons:

- explicit internal mode was not set
- readiness was blocked
- required runtime state was incomplete
- diagnostics coverage was insufficient
- critical guardrails remained unresolved

Fallback is expected until the guardrails are green. It is not a failure of legacy behavior.

## How to read soak summaries

The internal soak summary is still conservative. It can classify the current run as:

- `stable_for_current_scope`
- `unstable_guardrails`
- `fallback_dominant`
- `insufficient_data`

`stable_for_current_scope` only means the currently allowed narrow internal responsibilities behaved consistently enough during the observed run.

It does NOT mean:

- broad cutover is justified
- legacy authority should be weakened
- activation or resolution authority is safe to move
- production confidence is established

## Scenario labels

For Phase 10D internal QA, scenario summaries may be bucketed under compact labels such as:

- `stable_allowed`
- `guardrail_blocked`
- `mixed_fluctuating`
- `restore_resume_heavy`

These labels are internal-only comparison buckets. They help QA compare narrow-scope behavior across different run profiles without widening routing scope.

## Comparing scenario summaries

Compare scenarios by looking at:

- fallback rate
- fallback reason distribution
- readiness distribution
- activation pattern
- fallback pattern
- conservative assessment

If one scenario looks `stable_for_current_scope`, that still does not justify broad cutover. It only means the currently allowed narrow internal responsibilities behaved consistently enough under that scenario label.

## Repeated-run comparison

For repeated internal QA runs, you can compare exported scenario reports with:

- `node scripts/compare-soft-cutover-qa-runs.js report-a.json report-b.json`
- `node scripts/compare-soft-cutover-qa-runs.js --format markdown report-a.json report-b.json`

The combined summary is still internal-only. Repeated stability helps compare runs, but it still does not justify broad cutover by itself.
