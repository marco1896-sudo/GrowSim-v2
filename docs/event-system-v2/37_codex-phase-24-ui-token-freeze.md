# 37 — Codex Phase 24 UI Token Freeze

Dieses Dokument friert die UI-Lab-Tokens als Referenz fuer die spaetere Runtime-Integration ein.

## 1) Spacing Tokens
- `space-1`: 4px
- `space-2`: 8px
- `space-3`: 10px
- `space-4`: 12px
- `space-5`: 16px

## 2) Radius Tokens
- `radius-chip`: 999px
- `radius-panel`: 12px
- `radius-modal`: 16px
- `radius-frame`: 20px

## 3) Hero-Hoehen
- Standard-Hero: `190px`
- Compact-Hero (360/390): `144px`
- Mobile Fallback (allg.): `150px` in kleineren Layout-Regeln, wenn kein Compact-Hero gesetzt ist

## 4) Compact-Hero-Regeln
- Aktiv fuer `360px` und `390px` Viewport-Modi
- Ziel: schnellere Sicht auf Titel, Meta und CTA
- Hero bleibt visuell stark, aber nimmt weniger vertikale Dominanz ein

## 5) Chip-Groessen
- Standard-Chip: `font-size 11px`, `padding 4px 9px`
- 360-Chip: `font-size 10px`, `padding 3px 7px`

## 6) Meta-Bar-Regeln
- Sticky im Modal-Flow
- Kompakter Gap in 360 (`4px`)
- Mehr Orientierung als Deko: Setup, Stage, Severity, Kategorie

## 7) Panel-Abstaende
- Standard Panel-Top-Abstand: `8px`
- Panel-Inner-Padding: `10px`
- Header-Bottom-Abstand: `6px`

## 8) CTA-Hierarchie
- `recommended`: ruhiger Success-Tint + klare Prioritaet
- `situational`: neutral/warn-light
- `risky`: soft-risk tint, keine Alarmoptik
- aktive Wahl: Accent-Border + Inset-Highlight

## 9) Decision-State-Regeln
- Jede Option zeigt Label + kurze Wirkung
- aktive Option immer sichtbar markiert
- risky sichtbar warnend, aber nicht emotional ueberzogen
- Detailtext 360 strikt begrenzt (max ca. 95 Zeichen)

## 10) Severity-Chip-Regeln
- Severity als neutraler Informationschip
- keine aggressive Rotdominanz
- Warnsignal ueber semantische Klarheit statt laute Farbwirkung

## 11) Textbudget-Regeln
- Titel: 36-48 Zeichen
- Symptom: 120-180 Zeichen
- Coach-Summary: 120-180 Zeichen
- Why/Learning kurz: 180-260 Zeichen
- Decision-Label: 18-32 Zeichen
- Decision-Detail: 70-120 Zeichen (360: <=95)
- Aftermath: 100-160 Zeichen

## 12) Compact-Mode-Regeln
- Fuer kleine Viewports standardmaessig engeres Layout
- Budget-Panel im Lab einklappbar
- lange Details werden weich gekuerzt

## 13) Hero-Fallback-Regeln
- Bildpfade werden fuer `dev/` korrekt normalisiert
- sichtbarer Fallback-State bei Lade-/Pfadfehler
- Fallback mit ruhigem Premium-Gradient und klarer Statusmeldung

## 14) Mindest-Tap-Targets
- Buttons/Choices min. `36px` Hoehe
- Decision-Karten min. `70px` fuer sichere Touch-Auswahl
- Controls mit klarer Abstandszone

## Freeze-Status
- Diese Token gelten als **Phase-24 Freeze-Referenz** fuer die spaetere Shadow-Bridge-Umsetzung.
- Aenderungen ab jetzt nur mit expliziter Begruendung im Folge-Phase-Dokument.
