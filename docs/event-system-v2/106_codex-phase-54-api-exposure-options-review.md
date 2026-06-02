# Phase 54: API Exposure Options Review

## Ziel

Bewertung der Optionen, wie eine Browser-sichtbare Registration-API bereitgestellt werden koennte.

## Variante 1: API-Container beim Script-Load sichtbar machen, aber keine Registrierung

Beschreibung:

- `window.ShadowBridgeBrowserBridgeCandidate` wird sichtbar.
- `window.ShadowBridgeGuardedEntry` bleibt absent.
- Registrierung bleibt explizit.

Bewertung:

- Risiko: niedrig
- Reversibilitaet: gut, ein kleiner Candidate-Patch
- Debugbarkeit: hoch
- Runtime-Risiko: niedrig, solange keine Registrierung erfolgt
- PWA-/Shell-Auswirkung: gering, weil kein neuer Script-Tag noetig ist
- No-Op-/Legacy-Kompatibilitaet: hoch
- Empfehlung: ja, fuer Phase 55

## Variante 2: API-Container nur ueber Dev-Smoke injizieren

Beschreibung:

- Smoke injiziert oder evaluiert eine API selbst.
- Produktiver Candidate bleibt unveraendert.

Bewertung:

- Risiko: niedrig im Test
- Reversibilitaet: hoch
- Debugbarkeit: mittel
- Runtime-Risiko: keines
- PWA-/Shell-Auswirkung: keine
- No-Op-/Legacy-Kompatibilitaet: hoch
- Empfehlung: nein als naechster Produktpfad

Grund:

Diese Variante wuerde nicht die echte Browser-Script-Situation testen. Sie waere zu kuenstlich.

## Variante 3: Separate API-Exposure-Datei

Beschreibung:

- Eine zweite Datei setzt `window.ShadowBridgeBrowserBridgeCandidate`.

Bewertung:

- Risiko: mittel
- Reversibilitaet: gut
- Debugbarkeit: mittel
- Runtime-Risiko: niedrig
- PWA-/Shell-Auswirkung: hoeher, weil weiterer Script-Tag noetig waere
- No-Op-/Legacy-Kompatibilitaet: gut
- Empfehlung: nein fuer den naechsten Schritt

Grund:

Phase 47/48 haben bereits entschieden, dass ein einzelner Bundle Candidate die Lade-/Dependency-Komplexitaet reduziert.

## Variante 4: Automatische Registrierung von `window.ShadowBridgeGuardedEntry`

Beschreibung:

- Script-Load registriert direkt den Guarded Entry Global.

Bewertung:

- Risiko: hoch
- Reversibilitaet: schlechter
- Debugbarkeit: schlechter
- Runtime-Risiko: unnoetiger globaler Seiteneffekt
- PWA-/Shell-Auswirkung: hoeher
- No-Op-/Legacy-Kompatibilitaet: schwach
- Empfehlung: nein

Diese Variante bleibt verboten.

## Entscheidung

Empfohlen fuer Phase 55:

```text
browser_visible_api_container_only
```

Nicht empfohlen:

- API nur im Smoke injizieren
- separate zweite Exposure-Datei
- automatische Registrierung von `window.ShadowBridgeGuardedEntry`

## Warum keine automatische Registrierung erfolgt

Die API-Sichtbarkeit ist nur ein Werkzeug fuer spaetere explizite Tests.

Die eigentliche Registrierung bleibt hinter zwei Guards:

```js
enabled: true
allowGlobalRegistration: true
```

Ohne diesen expliziten Aufruf darf nichts passieren.
