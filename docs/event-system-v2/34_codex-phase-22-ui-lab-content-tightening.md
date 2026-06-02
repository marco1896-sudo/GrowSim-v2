# 34 — Codex Phase 22 UI-Lab Content Tightening

## 1. Geaenderte UI-Lab-Dateien
- `src/events/v2/ui-lab/EventV2UiLabData.js`
- `src/events/v2/ui-lab/EventV2UiLabMount.js`
- `src/events/v2/ui-lab/components/EventV2Modal.js`
- `src/events/v2/ui-lab/components/EventV2ScenarioSwitcher.js`
- `src/events/v2/ui-lab/components/EventV2CoachPanel.js`
- `src/events/v2/ui-lab/components/EventV2LearningCard.js`
- `src/events/v2/ui-lab/components/EventV2AftermathPanel.js`
- `src/events/v2/ui-lab/styles.event-v2-ui-lab.css`
- `docs/event-system-v2/33_codex-phase-22-ui-lab-review-matrix.md`
- `docs/event-system-v2/34_codex-phase-22-ui-lab-content-tightening.md`

## 2. Ergebnis der Review-Matrix
- Breite Bewertungsbasis: 4 Viewports x 7 Scenarios.
- Bestes Gesamtverhalten: 390px / 430px.
- Kritischster Bereich: 360px bei dichten Why-/Learning-Texten.
- CTA-Klarheit insgesamt verbessert durch deutlichere Decision-Hierarchie.

## 3. Kritische Viewports
- 360px: vertikales Budget + Textdichte bleibt der Hauptdruckpunkt.
- 768px: funktional stabil, aber perspektivisch Potenzial fuer breitere Layout-Nutzung.

## 4. Kritische Scenarios
- pH ausserhalb Zielbereich: hohe Fachdichte.
- fruehe Schaedlingsanzeichen: viel Lernkontext auf engem Raum.

## 5. Gekuerzte/geschaerfte Texte
Durchgefuehrt in `EventV2UiLabData.js`:
- Why/Coach-Summary in allen Scenarios fokussierter auf Ursache -> Wirkung.
- Decision-Details auf kurze, scanbare Wirkungssaetze reduziert.
- Aftermath-Texte kompakter und outcome-orientiert formuliert.

Zusatzlogik in Komponenten:
- Compact-Text-Modus aktivierbar (`Text`-Toggle).
- Coach/Why/Aftermath/Learning werden in compact mode sichtbar gekuerzt (mit Ellipse), statt als Blocktext dargestellt.

## 6. Event-Visual-/Asset-Befunde und Loesung
Gefundenes Problem:
- UI-Lab lief unter `dev/event-v2-ui-lab.html`, waehrend Scenario-Bilder als `assets/events/...` referenziert wurden.
- Dadurch konnten relative Pfade im Browser leer wirken.

Umgesetzte Loesung:
- In `EventV2Modal.js` normalisierte Pfadauflösung fuer UI-Lab (`assets/...` -> `../assets/...`).
- Hero-Fallback-State eingebaut:
  - Default: „Visual wird geladen"
  - bei Error: sichtbarer Fallback-Hinweis
  - bei Load: Fallback blendet aus, Bild blendet ein
- Keine neuen Assets erstellt, keine Migration.

## 7. Verbesserte UI-Hierarchie
Neu betont:
1. Was ist los? (Kicker + Titel + Symptom)
2. Warum relevant? (Coach)
3. Was kannst du tun? (Decision-Liste)
4. Was lernst du daraus? (Learning)
5. Was passiert danach? (Aftermath)

Weitere Feinschliffe:
- Sticky Meta-Bar im Modal-Scrollkontext
- klarere Panel-Titel
- ruhigere Glass/HUD-Flaechen
- groessere Tap-Targets und bessere Decision-Kontraste

## 8. Verbleibende Risiken
- Einige Szenarien liegen textlich noch nahe am oberen Budget-Limit fuer 360px.
- Tablet-Ansicht nutzt aktuell bewusst weiterhin den Mobile-Modalfluss statt breiter Zweispalten-Variante.
- Inhalte sind weiterhin UI-Lab-Mock-/Spiegeldaten, nicht Runtime-verdrahtet.

## 9. Runtime-Status
- Runtime weiterhin unangetastet.
- Keine Imports in bestehende Runtime.
- Keine bestehende Event-UI ersetzt.
- Keine Navigation der bestehenden App veraendert.

## 10. Empfehlung fuer Phase 23
**Phase 23: Manual Design Review Sprint + Copy Lock**
1. Gefuehrter manueller Review mit 360/390/430 auf echten Endgeraeten.
2. Pro Scenario finale Copy-Freigabe (Titel/Symptom/Coach/Aftermath) gegen Textbudgets.
3. Danach UI-Lab Token Freeze (Spacing, Chip-Dichte, CTA-Hierarchie) als Vorstufe fuer spaetere Runtime-Shadow-Bridge.
