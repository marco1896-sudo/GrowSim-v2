# Phase 154 -> Phase 155 Plan

## Empfehlung
`Event V2 Dev/Test Soft Preview Flow – Candidate List to Detail, No Resolve`

## Ziel
- Candidate List -> Detail Flow glätten.
- Mehrere Candidates hintereinander stabil öffnen/schließen.
- Lokalen (ephemeral) Detailzustand nutzen, ohne Persistenz.
- Weiter strikt no-write/no-resolve.

## Guardrails
- kein RuntimeWrite
- kein Save/Storage write
- kein selectedCandidate im App-State
- keine Resolve-/Reward-/Mutation-Actions
- keine Event-V1-Ersetzung

## Exit-Kriterien fuer Phase 155
- Mehrfaches List->Detail->Back auf Mobile stabil.
- Safety Labels weiterhin klar.
- Keine neue Safety-Regression.
