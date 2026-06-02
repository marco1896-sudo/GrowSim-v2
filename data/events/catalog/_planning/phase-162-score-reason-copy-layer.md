# Phase 162 - Score/Reason Copy Layer

## Sichtbare Änderungen
- `Score` wird in der Vorschau als `Trefferstärke` gezeigt.
- `Reason` wird als `Warum dieser Hinweis erscheint` überschrieben.
- In der Detailansicht ergänzt: `Diese Vorschlagskarte passt laut Testauswertung zu den aktuellen Bedingungen.`

## Technisch intern unverändert
- Interne Reason-Quelle und Debug-Inhalt bleiben unverändert.
- Ranking/Scoring-Logik bleibt unverändert.
- Keine Runtime-/Save-/State-Mutation.

## Später für echte Nutzertexte
- Entwickler-Reason und Nutzer-Erklärung als getrennte Ebenen.
- Kürzere, alltagsnähere Ursachen-Texte je Eventtyp.
- Optionales Ausblenden technischer Score-Details außerhalb Dev/Test.
