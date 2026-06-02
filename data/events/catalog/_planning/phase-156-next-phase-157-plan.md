# Phase 156 -> Phase 157 Plan

## Empfehlung
`Event V2 Dev/Test Soft Preview Mode – Event Center Candidate Detail Flow, No Resolve`

## Ziel
- Bestehenden Flow als zusammenhaengenden Dev/Test Soft Preview Mode fuehren.
- Candidate List -> Detail durchgaengig in Event-Center-naher Surface halten.
- Weiter strikt no-write/no-resolve.

## Guardrails
- kein RuntimeWrite
- kein Save/Storage Write
- kein selectedCandidate im App-State
- keine echten Actions/Resolve
- kein Production Default

## Exit-Kriterien Phase 157
- Soft Preview Mode klar benannt und testbar.
- Safety-Regeln bleiben unveraendert gruen.
- Manual Session fuer Marco ohne Flow-Brueche moeglich.
