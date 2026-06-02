# Eventsystem V2 – sichtbares V2 Event Sheet für `indoor_dry_rootball` polishen

## Ziel der UI-Polish-Phase
Der erste sichtbare V2-Pilotpfad im Event Center soll nicht mehr wie ein Dev-Screen wirken, sondern wie ein spielnahes, mobiles Event-Sheet.

## Screenshot-Befund
- Technischer Rohstatus war sichtbar (`eventV2PilotActive`).
- Englische Event-Texte waren im Spielerpfad sichtbar.
- Technische Hinweise (Authority/Legacy-Fallback) standen im sichtbaren Sheet.
- Das Placeholder-Visual wirkte mit großem Buchstaben unfertig.
- Optionen wirkten eher wie Textzeilen als Entscheidungen.

## Entfernte technische Texte
- Kein sichtbares `eventV2PilotActive`.
- Kein sichtbares `Authority: V2 Pilot`.
- Kein sichtbares `V1 bleibt Legacy-Read-Fallback`.
- Kein sichtbarer Legacy/Cooldown-Text im V2-Pilotpfad.

## Neue deutsche Copy
- Titel: `Trockener Wurzelballen`
- Beschreibung: `Der Wurzelballen trocknet ungleichmaessig aus. Reagiere behutsam, statt hektisch zu giessen.`
- Meta: `Kategorie: Pflege · Schweregrad: Warnung`
- Insight-Bloecke:
  - `Situation`
  - `Tendenz`
  - `Einschaetzung`

## Visual-Entscheidung
- Kein Legacy-Bild im V2-Pilotpfad.
- Placeholder weiter genutzt, aber kompakter und neutraler.
- Kein großer prominenter Platzhalter-Glyph mehr.
- Visualhöhe reduziert (16:9), damit mobile Entscheidungen schneller sichtbar sind.

## Optionsdarstellung
- Optionen bleiben bei den bestehenden IDs:
  - `stabilize`
  - `inspect`
  - `overreact`
- Sichtbare Labels wurden lokalisiert:
  - `Behutsam stabilisieren`
  - `Substrat zuerst pruefen`
  - `Sofort stark eingreifen`
- Zusätzliche kurze Beschreibungen pro Option, ohne Logikänderung.

## Mobile-Verhalten
Getestet für:
- `360x740`
- `390x844`
- `430x932`

Ziel: bessere Lesbarkeit, kompakter Header/Visual-Bereich, keine Layout-Ausweitung.

## Was ausdrücklich nicht geändert wurde
- Keine neue Event-Logik.
- Keine neue Option/kein neues Event.
- Keine Erweiterung der ApplyDelta-Logik.
- Kein V1-Delete.
- Kein Runtime-/Save-Umbau.
