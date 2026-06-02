# Phase 153 -> Phase 154 Plan

## Decision
- Empfehlung: `Event V2 Single Candidate Detail QA + Manual Test Session`
- Grund: Detail-Preview ist technisch gruen und no-write/no-resolve stabil.

## Scope fuer Phase 154
1. Manuelle Detail-Session fuer Marco (List -> Detail -> Back/Close).
2. Lesbarkeit, Diagnose-Textqualitaet und Label-Klarheit auf Mobile validieren.
3. Watchpoint `scoring_watch_vpd_vs_dry_rootball` weiter beobachten, aber nicht blockierend behandeln.
4. Weiterhin strikt: kein RuntimeWrite, kein Save, keine Resolve-Actions.

## Exit Criteria
- Manual checklist abgeschlossen.
- Keine neuen Safety-Regressionen.
- Entscheidung fuer naechsten Soft-Preview-Flow (List-to-Detail Vertiefung) liegt vor.
