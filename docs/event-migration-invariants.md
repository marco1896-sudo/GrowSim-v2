# Event Migration Invariants

Phase 1 migration-safe rules for the Grow Simulator event-system rebuild.

## Runtime invariants

1. Preserve script load order:
   `src/events/* foundation -> events.js -> ui.js -> storage.js -> app.js`.
2. Preserve the legacy `window.GrowSimEvents` API as the active runtime surface.
3. Preserve deterministic event scheduling and selection behavior while legacy mode is active.
4. Preserve the current event machine states:
   `idle`, `activeEvent`, `resolving`, `resolved`, `cooldown`.
5. Preserve `state.events.active*` fields because the current UI reads them directly.
6. Do not activate the new engine path by default.
7. Do not introduce a new gameplay score or new hidden global stability metric.

## Persistence invariants

1. `storage.js` remains the canonical event-state normalizer.
2. Existing save keys and legacy migration paths must keep working untouched.
3. New Phase 1 fields must be additive and optional.
4. Save/load must tolerate missing Phase 1 draft fields without changing behavior.
5. Sim-time resume semantics remain owned by the legacy runtime and storage layer.

## UI invariants

1. The current event sheet layout remains unchanged.
2. The current event media area remains optional and legacy-driven.
3. No new event screen, no popup redesign, no interaction flow change in Phase 1.
4. Future `1:1` media support is documented only, not activated.

## Migration seam invariants

1. New `src/events` modules are passive by default.
2. `eventEngine.js` may expose routing methods, but legacy mode must always win unless a future phase explicitly switches it.
3. Shadow mode must be read-only when introduced later.
4. No business-logic duplication from `events.js` into the new engine during Phase 1.

## Asset invariants

1. `events.js` heuristic asset resolver remains live for Phase 1.
2. The new asset registry is data-only in Phase 1.
3. Asset kinds must be explicit: `image`, `icon`, `placeholder`.
4. Filename inference is only an audit aid, not the long-term authority.
