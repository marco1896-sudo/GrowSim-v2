# Phase 114 -> Phase 115 Plan

Recommended next phase:
`Phase 115: Event Catalog AssetRef Wiring Plan`

Scope:
- map current event `assets.modalImage` fields to planned ref targets (document-only)
- validate schema consistency across all 22 events
- define patch order and guardrails
- no activation, no runtime edits, no event writes in phase 115 unless explicitly approved

Preconditions:
- source candidates verified (done)
- dry-run assetrefs file available (done)
- safety checks green (except expected legacy loading safety red)
