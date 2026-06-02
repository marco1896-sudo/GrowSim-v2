# Phase 123 - Export Safety Gates

Before real final export is allowed, all gates must pass:

1. Tooling explicitly approved (`sharp` or approved alternative).
2. Tooling available in execution environment.
3. All 22 source candidates exist.
4. All 22 source candidates are Wide-Hero compatible.
5. Final target directories can be created safely.
6. No existing final files overwritten without explicit `--overwrite`.
7. Hash/size/dimension report generated for all outputs.
8. Event files remain unchanged during export.
9. AssetRefs remain inactive until a separate activation phase.
10. Export process is reproducible (same input => same outputs within expected encoder tolerance).
