# Phase 155 - Candidate List to Detail Flow QA

- status: `candidate_list_to_detail_flow_ready_with_watch`

## Ergebnis
- Candidate-Liste ist sichtbar (15 Items, 3 Fixtures).
- Detail oeffnet aus der Liste stabil.
- Back/Close funktionieren konsistent.
- Ein anderer Candidate kann direkt danach geoeffnet werden.
- Keine Resolve- oder Runtime/Save-Mutationen.

## Mobile/Usability
- Viewports 360/390/430/768 ohne horizontalen Overflow.
- Safety Labels bleiben sichtbar.
- Flow ist als Preview eindeutig (kein Resolve).

## Watch
- `scoring_watch_vpd_vs_dry_rootball` bleibt Watch-only.
- Kein Blocker fuer den naechsten Flow-Schritt.
