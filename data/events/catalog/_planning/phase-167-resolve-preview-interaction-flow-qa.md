# Phase 167 - Resolve Preview Interaction Flow QA

## Interaction-Flow Analyse (Read-only)
- Optionen werden als 2-3 Buttons in der Detailansicht gerendert.
- Feedback wird nach Klick rein lokal über ephemeren Controller-State (`activePreviewOptionId`) angezeigt.
- `plannedEffectsPreview` wird nur als Vorschautext gerendert, nie angewendet.
- Gute/vorsichtige/riskante Optionen sind über Badge (`empfohlen`/`vorsichtig`/`riskant`) und Text unterscheidbar.
- Beim Candidate-Wechsel wird durch neue Detailinitialisierung die alte Auswahl zurückgesetzt.
- Kein Pfad zu Apply/Resolve/Save vorhanden.

## Bewertung der Optionsarten
1. Gute Option
- Label verständlich: **Ja**
- Feedback hilfreich: **Ja**
- Wirkung plausibel: **Ja**
- Wirkt nicht wie Apply: **Ja**

2. Vorsichtige/neutrale Option
- Unterscheidbar von guter Option: **Ja (Badge + Wortlaut)**
- Lernwert sichtbar: **Ja**
- Zu technisch: **Nein, aber teils generisch**

3. Schlechte/riskante Option
- Als riskant erkennbar: **Ja**
- Feedback erklärt warum: **Ja**
- Echte Bestrafung: **Nein (Preview only)**

4. plannedEffectsPreview
- Hilfreich: **Ja (für Dev/Test)**
- Zu technisch: **teilweise**
- Später vereinfachen: **empfohlen**
- Für Tester sichtbar bleiben: **Ja, dev/test sinnvoll**

## Risiken
- Feedbacktexte sind funktional, aber teilweise generisch.
- `plannedEffectsPreview` könnte für Nicht-Dev-Tester zu technisch wirken.

## Safety-Bewertung
- No-Apply / No-Resolve / No-Write bleibt durchgängig erhalten.
- Keine Persistenzlecks beim Options- oder Candidate-Wechsel.

## Rollback
- Resolve-Preview-Sektion ausblenden/deaktivieren, restlicher Candidate-Detail-Flow bleibt intakt.

## Status
`interaction_flow_ready_with_watch`
