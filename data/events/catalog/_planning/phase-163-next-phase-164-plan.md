# Phase 163 -> Phase 164 Plan

Empfehlung: `Event V2 Resolve Preview Model Draft - No Write`

## Begründung
- Resolve-Flow in Phase 163 fachlich und sicherheitstechnisch vorbereitet.
- Nächster Schritt ist ein ausführbares, aber rein no-write Modell.
- UI kann danach sicher auf ein stabiles Draft-Modell aufbauen.

## Ziel Phase 164
- Dev-only `ResolvePreviewModel` erzeugt Optionen + Preview-Feedback für Candidate.
- Keine echten Actions.
- Kein Save/RuntimeWrite.
- Keine Eventdatei-/Locale-Änderung.

## Nicht erlaubt in Phase 164
- Kein echter Resolve-Commit.
- Keine Reward/Mission/Notification-Mutation.
- Kein Production Default.
