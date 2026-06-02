# Phase 161 Score/Reason Readability Review

Status: `score_reason_needs_copy_layer`

## Bewertung
- Scores sind fuer Dev/Test nuetzlich, fuer Endnutzer spaeter erklaerungsbeduerftig.
- Reason ist aktuell teils technisch (Shadow-/Snapshot-Signale).
- Fuer interne QA okay, fuer breitere Tests besser mit klarer Nutzerebene.

## Empfehlung
- Zwei Ebenen einfuehren:
  1. Entwickler-Reason (diagnostisch, technisch)
  2. Nutzer-Erklaerung (klar, kurz, handlungsnah)

## Felder fuer spaetere Learning-Copy
- Score -> Trefferstaerke
- Reason -> Warum dieser Hinweis erscheint
- Diagnose -> Was gerade beobachtet wird
- Why it matters -> Warum das wichtig ist
- Observation hint -> Worauf du achten solltest

## Entscheidung
- Nicht blockierend fuer Dev/Test No-Write.
- Copy/Label-Polish vor Resolve Flow Planning sinnvoll.
