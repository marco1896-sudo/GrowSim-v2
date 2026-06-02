# Catalog Layer (Phase 2)

Read-only catalog modules for Event System V2.

Scope:
- Read schema/example JSON from `data/events/catalog/_schema` and `_examples`
- Parse descriptor type (event, chain, learning-card)
- Build lightweight index
- Prepare validation hooks

Out of scope:
- Runtime integration
- Event execution
- Save/state interaction
- Feature flags / UI wiring

Planned extensions:
- Schema-level validation
- AssetRef integrity checks
- i18n-key checks
- Stage/setup/category constraints
- Quality rules integration (`07_quality-rules.md`)
