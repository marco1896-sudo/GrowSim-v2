# Phase 116 -> Phase 117 Plan

Empfohlene nächste Phase:
`Phase 117: AssetRef Schema Validation Script Draft`

Ziel:
- AssetRef-Draft strukturell validieren
- Existenzregeln gegen geplante/finale Pfade prüfen
- Verbotene Pfade (`_trial_export`, `maual-import`) blockieren
- weiterhin keine Aktivierung und keine Runtime-Eingriffe

Begründung Reihenfolge:
- Erst Validierungsgates stabilisieren, dann spätere Export-/Patch-Aktivierung.
