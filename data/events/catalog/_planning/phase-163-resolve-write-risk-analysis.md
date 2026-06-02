# Phase 163 - Resolve Write Risk Analysis

## P0 vor Write
- Save-Migration fuer neue Resolve-Datenfelder
- Dedupe gegen doppelte Resolves (Reload/Retry)
- Event-History Konsistenz (open -> resolving -> resolved)
- Reward-Dedupe/Idempotenz
- Event V1/V2 Parallelbetrieb ohne Doppel-Trigger
- Harte Rollback-Grenze bei Fehlverhalten

## P1 vor Beta
- Mission/Retention-Kopplung sauber isolieren
- Notification-Ausloeser kontrollieren
- Offline/PWA Verhalten bei unterbrochenem Resolve
- Reload mitten im Resolve (Transaktionsgrenzen)
- Balancing der Outcome-Qualität

## P2 Polish
- Feedback-Copy Feinschliff
- Visuelle Gewichtung guter/schlechter Entscheidung
- Telemetrie/Analytics für Resolve-Lernpfade

## Hauptrisiken
- Zustand driftet bei mehrfacher Ausführung
- Rewards doppelt bei Race Conditions
- Mixed V1/V2 Steuerung bei offenen Events
- Unklare Undo-/Rollback-Semantik

## Gegenmaßnahmen
- Write-Phase nur mit idempotenten Resolve-IDs
- dedizierte Resolve-Journalfelder
- strikte Gate-Checks vor jeder Mutation
- kompatibler V1-Fallback solange V2 nicht dominant
