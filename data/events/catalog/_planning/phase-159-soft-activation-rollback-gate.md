# Phase 159 Soft Activation Rollback Gate

## Ziel
Soft Preview Mode bei Problemen sofort auf dev/test-unsichtbar zuruecksetzen, ohne Datenmigration.

## Rollback Schritte
1. Dev/Test Guard deaktivieren.
2. Runtime Shadow Toggle deaktivieren.
3. Soft Preview Entry unsichtbar schalten.
4. Event V2 bleibt no-write/no-resolve.
5. Event V1 bleibt maßgeblich.

## Was NICHT zurueckgebaut werden muss
- Candidate-/Preview-/Shadow-Module koennen liegen bleiben.
- Keine Save-/Schema-Migration notwendig.
- Keine Asset-Neugenerierung noetig.

## Warum keine Migration noetig
- Keine persistente Aktivierung
- Keine Save-/Storage-Schreibpfade
- Kein RuntimeWrite

## Checks nach Rollback
- Soft Preview Smoke
- Runtime Shadow Toggle Report
- Candidate Feed Browser Smoke
- Hook Safety Static Check
- Pending Chain Lifecycle Verify
