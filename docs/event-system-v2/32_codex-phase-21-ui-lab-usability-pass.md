# 32 — Codex Phase 21 UI-Lab Usability Pass

## 1. Geaenderte UI-Lab-Dateien
- `src/events/v2/ui-lab/EventV2UiLabData.js`
- `src/events/v2/ui-lab/EventV2UiLabState.js`
- `src/events/v2/ui-lab/EventV2UiLabRenderer.js`
- `src/events/v2/ui-lab/EventV2UiLabMount.js`
- `src/events/v2/ui-lab/components/EventV2DecisionList.js`
- `src/events/v2/ui-lab/components/EventV2CoachPanel.js`
- `src/events/v2/ui-lab/components/EventV2LearningCard.js`
- `src/events/v2/ui-lab/components/EventV2AftermathPanel.js`
- `src/events/v2/ui-lab/components/EventV2ScenarioSwitcher.js`
- `src/events/v2/ui-lab/components/EventV2Modal.js`
- `src/events/v2/ui-lab/styles.event-v2-ui-lab.css`

## 2. Viewport-Modi (ergänzt/verbessert)
Im UI-Lab sind jetzt explizite Viewport-Modi integriert:
- 360px `Android Small`
- 390px `iPhone Typical`
- 430px `Large Phone`
- 768px `Tablet Narrow`

Verbesserungen:
- Umschalten direkt im Scenario-Switcher.
- Aktiver Modus als dezenter Chip sichtbar (`Aktiv: <Modus> <Breite>`).
- Mobile-Frame passt dynamisch seine Breite an.

## 3. Definierte Textbudgets
Im UI-Lab als Budget-Panel dokumentiert:
- Event-Titel: 36–48 Zeichen
- Situation/Symptom: 120–180 Zeichen
- Coach-Summary: 120–180 Zeichen
- Why/Learning Kurztext: 180–260 Zeichen
- Decision-Label: 18–32 Zeichen
- Decision-Detail: 70–120 Zeichen
- Aftermath: 100–160 Zeichen

## 4. Verbesserte UI-Hierarchie
Neu priorisierte Reihenfolge im Modal:
1. `Was ist los?` (Kicker + Titel + Symptom)
2. Meta-Bar (Setup, Stage, Severity, Kategorie)
3. Coach-Panel (`Warum relevant?`)
4. Decision-Liste (`Was kannst du tun?`)
5. Learning-Card (`Was lernst du daraus?`)
6. Aftermath (`Was passiert danach?`)

Zusätzlich:
- ruhigere Glass/HUD-Flächen
- klarere Panel-Trennung
- bessere Section-Titles für Scanbarkeit

## 5. Decision-Flow-Verbesserungen
- Gewählte Option visuell deutlich markiert.
- `recommended`-Optionen klar hervorgehoben (ruhig, nicht aggressiv).
- `risky`-Optionen erkennbar riskanter (ohne Alarm-Look).
- Decision-Detailtext pro Option ergänzt.
- Aftermath zeigt nach Auswahl:
  - gewählte Option
  - Kurzbegründung
  - Nachwirkungszusammenfassung

## 6. Weiterhin bestehende Risiken
- Inhalte sind weiterhin Mock-/UI-Lab-gespiegelt, nicht 1:1 live aus dem Katalog gelesen.
- Feinabstimmung einzelner Textlaengen sollte auf realen Devices erfolgen.
- Visuelle Assets sind weiterhin vorhandene Fallback-/Bestandsassets, nicht finales Production-Artset.

## 7. Empfohlene manuelle Browser-Prüfungen
1. Alle 4 Viewport-Modi durchschalten und auf Textumbruch pruefen.
2. Pro Scenario alle 3 Entscheidungen testen und Aftermath-Verstaendlichkeit beurteilen.
3. Coach/Learning/Aftermath ein- und ausblenden, Fokusfluss pruefen.
4. Tap-Targets auf 360px testen (einhaendig).
5. Visuelle Balance Hero vs. Text auf 390px und 430px vergleichen.

## 8. Runtime-Status
- Runtime bleibt unangetastet.
- Keine Imports in bestehende Runtime.
- Keine bestehende Event-UI ersetzt.
- Keine bestehende App-Navigation geaendert.

## 9. Empfehlung fuer Phase 22
**Phase 22: Structured UI-Lab Review Matrix + Content Tightening**
- Pro Viewport und Scenario eine kurze Bewertungsmatrix (Lesbarkeit, CTA-Klarheit, Lernwert, Premium-Gefuehl).
- Auf Basis der Matrix gezielte Textkuerzung (insb. Why/Aftermath) und CTA-Hierarchie-Feinschliff.
- Danach optional Freigabe fuer erste kontrollierte Runtime-Shadow-Bridge (weiterhin ohne Aktivierung).
