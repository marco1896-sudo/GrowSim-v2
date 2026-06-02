# 35 — Codex Phase 23 UI Token Freeze Prep

## 1. Geaenderte UI-Lab-Dateien
- `src/events/v2/ui-lab/EventV2UiLabData.js`
- `src/events/v2/ui-lab/EventV2UiLabRenderer.js`
- `src/events/v2/ui-lab/components/EventV2DecisionList.js`
- `src/events/v2/ui-lab/components/EventV2Modal.js`
- `src/events/v2/ui-lab/components/EventV2ScenarioSwitcher.js`
- `src/events/v2/ui-lab/EventV2UiLabMount.js`
- `src/events/v2/ui-lab/styles.event-v2-ui-lab.css`

## 2. Verbessere 360px-Probleme
Umgesetzt fuer `360px Android Small`:
- kompakteres Hero-Verhaeltnis aktiviert (`compact-hero`)
- kleinere und dichtere Meta-Chips
- geringere Panel-Abstaende
- kompaktere Symptomdarstellung
- Decision-Detail-Text fuer 360px auf max. ca. 95 Zeichen in compact mode begrenzt
- besserer vertikaler Zugriff auf CTA-Bereich durch reduzierte Hero-Hoehe

## 3. Hero-Hoehen-Anpassung
Ja, Hero wurde angepasst:
- Standard: `190px`
- `compactHero` (360/390): `144px`
- Mobile Fallback im CSS weiterhin weich abgestuft

Zusatz:
- sichtbarer Hero-Fallback-State bei Lade-/Pfadproblemen
- Bildpfad-Normalisierung fuer `dev/event-v2-ui-lab.html` (`assets/...` -> `../assets/...`)

## 4. Vorgeschlagene UI-Tokens (Freeze Prep)

### Layout / Spacing
- `space-1`: 4px
- `space-2`: 8px
- `space-3`: 10px
- `space-4`: 12px
- `space-5`: 16px

### Radius
- `radius-panel`: 12px
- `radius-modal`: 16px
- `radius-frame`: 20px
- `radius-chip`: 999px

### Chips
- Standard Chip: `font 11px`, `padding 4x9`
- Compact Chip (360): `font 10px`, `padding 3x7`

### CTA Hierarchie
- `recommended`: hervorgehoben mit ruhigem Success-Tint
- `situational`: neutral/warn-light
- `risky`: soft-risk tint (kein Alarmrot)
- aktive Auswahl: Accent-Border + inner highlight

### Panel-Rhythmus
- Panel-Abstand Standard: 10px
- Panel-Abstand compact: 8px

### Hero
- Standard: 190px
- Compact: 144px
- Ladefallback sichtbar, bis Bild erfolgreich geladen ist

### Compact-Modus Regeln
- compact standardmaessig aktiv
- relevante Langtexte werden weich gekuerzt (Ellipsis)
- Decision-Details auf kleinen Viewports strikter gekappt

### Textbudgets (UI-Lab Ziel)
- Titel: 36–48 Zeichen
- Symptom: 120–180 Zeichen
- Coach-Summary: 120–180 Zeichen
- Why: 180–260 Zeichen
- Decision-Label: 18–32 Zeichen
- Decision-Detail: 70–120 Zeichen (360px: <=95)
- Aftermath: 100–160 Zeichen

### Severity-/Mode-Chips
- Severity bleibt neutral codiert (kein Alarm-Look)
- Setup-Chip (indoor/outdoor/shared) klar sichtbar
- Stage + Kategorie als Orientierung statt als Dominanz

## 5. Copy-Lock-Regeln (Prep)

### Slot-Regeln
- Titel: 1 Kernaussage, keine Doppelbegriffe
- Symptom: Problem sichtbar + Kontext in max. 2 Saetzen
- Coach-Summary: direkte Handlungsrichtung, ruhig, nicht strafend
- Why: Ursache-Wirkung, keine Lehrbuchabhandlung
- Decision-Label: Verb + Objekt, scanbar in <= 1 Zeile auf 360px
- Decision-Detail: Wirkung + Risikohinweis, kurz und konkret
- Learning: 3 Bullets, je 1 Aussage
- Aftermath: erwartete Entwicklung + Nutzen der Entscheidung

### Lock-Kriterien vor Runtime-Bridge
- Kein Slot ueber Budgetlimit im 360px-Review
- Keine Option ohne klare Wirkungsaussage
- Keine coach/why-Passage mit mehr als 2 dichten Fachbegriffen je Absatz
- Alle risky-Optionen sprachlich warnend, aber nicht panisch

## 6. Noch kritische Scenarios
- `indoor_soil_ph_out_of_range`: weiterhin fachlich am dichtesten
- `shared_early_pest_signs_mild`: Lerndichte bei kleinem Viewport weiterhin aufmerksam pruefen

## 7. Offene Punkte vor Runtime-Bridge
- Finales Copy-Locking mit echtem Device-Review (360/390/430)
- Token-Freeze als verbindliche Referenzdatei (falls gewuenscht als eigenes token-doc)
- Optional Tablet-Layoutvariante (>600px) statt reinem Mobile-Modalfluss

## 8. Runtime-Status
- Runtime weiterhin unangetastet
- keine Imports in bestehende Runtime
- keine bestehende Event-UI ersetzt
- keine App-Navigation geaendert

## 9. Empfehlung fuer Phase 24
**Phase 24: Copy Lock + Token Freeze Final**
1. Manual Device Review mit finalem Abnahmeprotokoll pro Scenario.
2. Endgueltiges Copy-Locking je Slot mit „accept/revise“-Kennzeichnung.
3. UI-Token-Freeze als verbindliche Referenz fuer spaetere Shadow-Bridge-Implementierung.
