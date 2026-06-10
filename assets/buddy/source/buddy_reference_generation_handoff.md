# Buddy Reference Generation Handoff

## 1. Zweck

Zwei Buddy-Testassets sollen als `v002` referenzbasiert neu erzeugt werden.

Ziel:
- echte Transparenz
- saubere Fueße
- kein Bodenrest
- kein Schattenrest
- keine Designabweichung vom offiziellen Buddy

Wichtig:
- referenzbildbasiert, nicht text-only
- bestehende `v001`-Dateien bleiben erhalten
- aktuelle `needs_revision`-Dateien nicht ueberschreiben

## 2. Zu erzeugende Assets

- `assets/buddy/transparent/poses/buddy_idle_front_v002.png`
- `assets/buddy/transparent/poses/buddy_happy_open_arms_v002.png`

## 3. Zu verwendende Referenzen

### Fuer `idle_front_v002`

- `assets/buddy/source/reference/buddy_reference_master_front_v001.png`

### Fuer `happy_open_arms_v002`

- `assets/buddy/source/reference/buddy_reference_master_front_v001.png`
- `assets/buddy/source/reference/buddy_reference_master_front_happy_v001.png`
- `assets/buddy/source/reference/buddy_reference_happy_open_arms_v001.png`

## 4. Master Prompt

Use the provided Buddy reference images as true image-conditioning inputs.

Regenerate the same Grow Simulator Buddy character with the exact same identity.
Preserve head shape, eye design, leaf structure, body proportions, limb proportions, green color family, and friendly coach personality.
Do not redesign the character.
Do not stylize away from the references.
Only improve pose cleanliness and export quality.

Output as a clean standalone full-body transparent PNG with complete feet visible.
The final image must have no floor, no ground plane, no base plate, no shadow blob, and no cutout remnants under the feet.

## 5. Slot-spezifische Prompts

### `idle_front_v002`

Front-facing neutral Buddy.
Arms relaxed down.
Friendly calm coach expression.
Full body centered.
Feet fully visible.
Transparent background only.

### `happy_open_arms_v002`

Front-facing Buddy with open arms.
Friendly welcoming expression.
Same Buddy identity as the official references.
Full body centered.
Feet fully visible.
Transparent background only.

## 6. Negative Prompt

- no green background
- no green screen
- no floor
- no ground plane
- no base plate
- no shadow blob
- no black cutout artifacts
- no cropped feet
- no rectangular remnants
- no text
- no UI screenshot
- no changed character design
- no different eyes
- no different body shape

## 7. Exportregeln

- PNG
- echter Alpha-Kanal
- quadratischer Canvas
- transparenter Hintergrund
- komplette Figur inklusive Fueße sichtbar
- unter den Fueßen nur transparente Pixel
- einheitlicher Rand
- keine Bodenflaeche
- keine Schattenplatte

## 8. QA-Kriterien

- Alpha-Kanal vorhanden
- Fueße vollstaendig
- keine harten Unterkanten
- keine schwarzen oder gruenen Reste
- Canvas quadratisch
- Buddy-Identitaet konsistent
- nicht auf `approved` setzen ohne manuelle Sichtpruefung

## 9. Rueckgabe-Workflow

- erzeugte Dateien als `v002` an die Zielpfade legen
- Codex danach technische QA ausfuehren lassen
- Manifest maximal auf `generated` setzen
- manuelle Freigabe erforderlich fuer `approved`

## Hinweise

- Bestehende `v001`-Dateien bleiben erhalten.
- Aktuelle `needs_revision`-Dateien nicht ueberschreiben.
- Keine Statusaenderung auf `approved`.
- Diese Datei startet keine Bildgenerierung; sie dokumentiert nur den Handoff fuer einen spaeteren oder extern angebundenen Reference-Image-Workflow.
