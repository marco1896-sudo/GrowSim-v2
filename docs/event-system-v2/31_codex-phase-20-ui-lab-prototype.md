# 31 — Codex Phase 20 UI-Lab Prototype

## 1) Neu erstellte Dateien
- `src/events/v2/ui-lab/README.md`
- `src/events/v2/ui-lab/EventV2UiLabData.js`
- `src/events/v2/ui-lab/EventV2UiLabRenderer.js`
- `src/events/v2/ui-lab/EventV2UiLabState.js`
- `src/events/v2/ui-lab/EventV2UiLabMount.js`
- `src/events/v2/ui-lab/components/EventV2Modal.js`
- `src/events/v2/ui-lab/components/EventV2DecisionList.js`
- `src/events/v2/ui-lab/components/EventV2CoachPanel.js`
- `src/events/v2/ui-lab/components/EventV2LearningCard.js`
- `src/events/v2/ui-lab/components/EventV2AftermathPanel.js`
- `src/events/v2/ui-lab/components/EventV2MetaBar.js`
- `src/events/v2/ui-lab/components/EventV2ScenarioSwitcher.js`
- `src/events/v2/ui-lab/styles.event-v2-ui-lab.css`
- `dev/event-v2-ui-lab.html`

## 2) Start / Öffnen
- Direkt im Browser öffnen:
  - `dev/event-v2-ui-lab.html`
- Kein Build-Schritt und keine Runtime-Integration nötig.

## 3) Verwendete Mini-Katalog-Daten
- Das UI-Lab nutzt eine isolierte, strukturelle Spiegelung aus dem Mini-Katalog in `EventV2UiLabData.js`.
- Enthalten sind repräsentative Scenarios aus Indoor/Outdoor/Shared inkl. Coach/Decision/Learning/Aftermath.
- Asset-Refs nutzen vorhandene Dateien aus `assets/events/`.

## 4) Enthaltene Komponenten
- Modal-Container mit großer Hero-Zone
- Meta-Bar (Setup, Stage, Severity, Kategorie)
- Coach-Panel
- Decision-Liste (2–3 Optionen mit Qualitätslabel)
- Learning-Card-Bereich
- Aftermath-Bereich
- Scenario-Switcher

## 5) Abgebildete UI-Flows
- Scenario wechseln
- Entscheidung auswählen
- Coach ein-/ausblenden
- Learning-Card ein-/ausblenden
- Aftermath ein-/ausblenden
- Mobile-Narrow-Preview über eingebauten Frame

## 6) Bewusst nicht integriert
- Keine Verbindung zu `app.js` oder bestehender Event-Runtime
- Keine Save-/Tick-/Resolver-Logik
- Keine Event-Aktivierung im Spiel
- Keine bestehende Navigation/UI ersetzt
- Kein globales App-CSS überschrieben (scoped unter `.event-v2-ui-lab`)

## 7) Sichtbare Design-/Lesbarkeitsrisiken
- Einige Texte sind in der Prototyp-Ansicht noch nahe an der maximal sinnvollen Länge auf sehr kleinen Geräten.
- Für sehr lange Coach- oder Learning-Texte sollte später ein striktes Zeichenbudget je Slot definiert werden.
- Der visuelle Stil ist premium-orientiert, aber Fine-Tuning (Spacing/Typo-Hierarchie) sollte mit echten Device-Checks erfolgen.

## 8) Empfohlene nächste Verbesserungen
1. Content-Iteration mit klaren Textbudgets (Titel/Symptom/Coach/Learning).
2. Optionaler Variantenvergleich (kompakt vs. ausführlich) für Coach-Panel.
3. Feinschliff der Decision-Hierarchie (Primär-CTA visuell stärker).
4. Device-Matrix-Check (kleine Android-Breiten + iPhone-Narrow).

## 9) Runtime-Status
- Runtime bleibt unangetastet.
- Keine Imports in bestehende Runtime.
- Keine bestehenden Event-UI-Module ersetzt.

## 10) Empfehlung für Phase 21
- **Phase 21: UI-Lab Iteration & Usability Pass**
  - strukturierter manueller Design-Review auf 3–5 Ziel-Viewports
  - Textkürzung/Hierarchy-Tuning pro Scenario
  - Definition finaler UI-Token für Event V2 (Spacing, Chip-Schema, CTA-Priorität)
