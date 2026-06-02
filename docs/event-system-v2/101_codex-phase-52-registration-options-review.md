# Phase 52: Registration Options Review

## Ziel

Diese Review vergleicht Registrierungsvarianten fuer `window.ShadowBridgeGuardedEntry`.

## Variante 1: Keine Registrierung, Candidate bleibt nur geladen

Bewertung:

- Risiko: sehr niedrig
- Reversibilitaet: trivial
- Debugbarkeit: begrenzt, aber sehr sicher
- Runtime-Risiko: keines
- PWA-/Shell-Auswirkung: keine zusaetzliche Auswirkung ueber den bereits gesetzten Script-Tag hinaus
- No-Op-/Legacy-Kompatibilitaet: sehr hoch
- Empfehlung: ja, aktueller Default

Diese Variante bleibt der sichere Status quo.

## Variante 2: Manuelle Dev-Console-/Smoke-Registrierung

Bewertung:

- Risiko: niedrig
- Reversibilitaet: gut, ueber explizites Unregister
- Debugbarkeit: hoch
- Runtime-Risiko: keines, solange nur Mock-/Smoke-Kontext genutzt wird
- PWA-/Shell-Auswirkung: keine zusaetzliche
- No-Op-/Legacy-Kompatibilitaet: hoch
- Empfehlung: ja, sinnvoller naechster Schritt

Diese Variante ist die empfohlene Phase-53-Richtung.

## Variante 3: Separate passive Registration-Funktion, aber nicht automatisch ausgefuehrt

Bewertung:

- Risiko: niedrig bis mittel
- Reversibilitaet: gut
- Debugbarkeit: hoch
- Runtime-Risiko: niedrig, solange unhooked
- PWA-/Shell-Auswirkung: abhaengig davon, ob weitere Scripts noetig werden
- No-Op-/Legacy-Kompatibilitaet: gut
- Empfehlung: spaeter moeglich, jetzt nicht noetig

Der Bundle Candidate enthaelt bereits eine passende explizite Funktion. Ein weiteres Script ist aktuell nicht noetig.

## Variante 4: Automatische Registrierung beim Script-Laden

Bewertung:

- Risiko: hoch
- Reversibilitaet: schlechter, weil die Registrierung direkt an Shell-Laden gekoppelt waere
- Debugbarkeit: mittel
- Runtime-Risiko: unnoetiger globaler Seiteneffekt
- PWA-/Shell-Auswirkung: hoeher
- No-Op-/Legacy-Kompatibilitaet: schwach
- Empfehlung: nein

Diese Variante bleibt verboten.

## Variante 5: Registrierung ueber spaeteren `app.js`-Hook

Bewertung:

- Risiko: aktuell mittel bis hoch
- Reversibilitaet: spaeter potenziell eine Hook-Zeile, aber Runtime-Grenze wird beruehrt
- Debugbarkeit: mittel
- Runtime-Risiko: vorhanden
- PWA-/Shell-Auswirkung: keine zusaetzliche Script-Auswirkung, aber Runtime-Auswirkung
- No-Op-/Legacy-Kompatibilitaet: theoretisch moeglich, aber noch nicht freigegeben
- Empfehlung: jetzt nein

Diese Variante darf erst nach dediziertem Hook-Review und nach erfolgreichem Manual Registration Smoke betrachtet werden.

## Entscheidung

Empfohlen:

```text
manual_browser_global_registration_smoke
```

Nicht empfohlen:

- automatische Registrierung beim Laden
- Registrierung ueber `app.js` in Phase 52/53

## Safety Gate fuer spaetere Registrierung

Vor einer spaeteren expliziten Registrierung muessen gelten:

- Browser Shell Smoke gruen
- Bundle Candidate Tests gruen
- Comparison Smoke gruen
- Combined Report gruen
- Guarded Entry Contract Tests gruen
- kein `app.js`-Hook
- kein Save
- keine UI
- keine Eventaktivierung
- kein Live-State
- Registrierung nur explizit
- Unregister erfolgreich
- sichtbarer Global enthaelt nur erlaubte Felder

## PWA-/Shell-Bewertung

Eine manuelle Registrierung erzeugt keine neue Shell-Datei und keinen neuen Script-Tag.

Risiko bleibt niedriger als bei automatischer Registrierung, weil:

- der Candidate bereits geladen wird.
- kein weiterer Ladepfad hinzukommt.
- Registrierung nur fuer den Smoke bewusst aufgerufen wird.
- Unregister direkt pruefbar ist.
