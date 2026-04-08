# Event Responsibility Matrix

Phase 1 audit for the Grow Simulator event-system rebuild.

This document records where the current event responsibilities live so later migration work can move logic intentionally instead of rewriting blindly.

## Matrix

| Responsibility | Current owner(s) | Current shape | Migration note |
| --- | --- | --- | --- |
| Triggering | `events.js` | Deterministic roll threshold, daytime gating, next-roll scheduling | Keep legacy owner in place for Phase 1 |
| Eligibility | `events.js` | Trigger evaluation, setup constraints, constraint snapshot, phase gating | Future seam: `src/events/eventEligibility.js` |
| Selection | `events.js`, `src/events/eventResolver.js` | Mixed legacy weighted selection plus foundation resolver influence | Legacy stays authoritative until shadow parity exists |
| State transitions | `events.js` | `idle -> activeEvent -> resolving -> resolved -> cooldown` | Freeze exact semantics as migration invariant |
| Choice effects | `events.js` | Applies option effects, side effects, follow-ups, history writes | No logic move in Phase 1 |
| History | `events.js`, `app.js`, `storage.js` | Event history stored in both `state.events.history` and `state.history.events` | Keep both stores until explicit consolidation phase |
| Persistence | `storage.js` | Canonicalization, legacy migration, event defaults, cooldown cleanup | Future seam: `src/events/eventPersistenceAdapter.js` |
| Rendering | `ui.js`, `app.js`, `index.html`, `styles.css` | Event sheet rendering and media block based on active event fields | Do not redesign in Phase 1 |
| Assets | `events.js` | Asset manifest, heuristic scoring, category fallback | Future seam: `src/events/eventAssets.js` with explicit registry |

## File Notes

### `events.js`

- Owns the live event runtime.
- Holds the current asset manifest and heuristic image resolver.
- Computes eligibility, signal scores, deterministic weights, and cooldown behavior.
- Writes current active event fields consumed by the UI and persistence layers.

### `app.js`

- Defines default event state shape in the global state bootstrap.
- Reads and renders active event data in duplicated UI-oriented helpers.
- Expects the legacy `window.GrowSimEvents` surface to exist.

### `ui.js`

- Binds the current event sheet DOM.
- Renders `state.events.activeImagePath` when present.
- Assumes the UI-facing event contract is field-based, not model-based.

### `storage.js`

- Canonical source of migration safety.
- Repairs and normalizes `state.events`, cooldown maps, active event fields, and foundation memory.
- Must remain the source of truth for backward-compatible save/load behavior.

### `index.html`

- Preserves script loading order.
- Contains the current mobile-first event sheet shell and event media DOM nodes.

### `styles.css`

- Styles the current event sheet media block.
- Uses a `16:9` render block today; later `1:1` media work must be deliberate and separated from Phase 1.

### `data/events.json`

- Legacy event catalog with mixed schema quality.
- Includes uncategorized entries that need cleanup in later content-authoring passes.

### `data/events.v2.json`

- Strongest migration input for the future simulation-driven system.
- Already expresses deterministic triggers and cooldown metadata.

### `data/events.foundation.json`

- Foundation catalog for early causal/follow-up/reward behavior.
- Already aligns with flag/memory/analysis modules.

### `src/events/*`

- Existing modules already cover flags, memory, resolver, and analysis.
- Phase 1 adds only passive architecture scaffolding around them.
