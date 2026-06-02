# Phase 123 -> Phase 124 Plan

## Path A (if Marco approves `sharp`)
`Phase 124: Install Sharp + Final Export Script Implementation Dry Run`

Scope:
1. Install `sharp` with explicit approval.
2. Implement/upgrade export script with real WebP conversion.
3. Run dry-run against all 22 events (no Event-file changes).
4. Generate full output report.

## Path B (if no dependency approval yet)
`Phase 124: Final Export Script Draft Hardening Without Dependency Install`

Scope:
1. Harden draft script CLI and report schema.
2. Add stricter guardrails/tests around write and overwrite flags.
3. Keep conversion mocked/non-mutating.

## Recommended Path
Preferred: **Path A**, because source readiness is complete (22/22) and the next real blocker is tooling approval.

Condition:
- Only execute Path A after explicit permission to mutate `package.json` and install dependency.
