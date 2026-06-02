# Phase 146 Plan - Event V2 Dev Preview Entry Point (Event Center Lab)

## Recommendation
Proceed with **Event V2 Dev Preview Entry Point - Event Center Lab Button / Debug Entry**.

## Scope
- Add a dev-only visible entry point in app-near lab/debug context.
- Use existing dev/test candidate feed controller.
- Keep `RuntimeWrite=false` and `Production=false`.
- Keep actions empty, selectedCandidate null.
- Keep rollback as immediate disable via dev/test flag path.

## Out of Scope
- No gameplay activation.
- No save/state mutation.
- No production UI replacement.
