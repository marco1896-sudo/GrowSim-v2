# Phase 57: Hook Variant Review

## Ziel

Bewertung der spaeteren minimalen Hook-Varianten nach erfolgreichem Browser-API-Exposure.

## Variante A — Hook prueft nur API-Verfuegbarkeit

Beschreibung:

```js
const api = window.ShadowBridgeBrowserBridgeCandidate;
if (!api) return;
```

Keine Registrierung, kein `ShadowBridgeGuardedEntry`, kein No-Op-Call.

Bewertung:

- Risiko: niedrigst
- Reversibilitaet: trivial
- Debugbarkeit: mittel
- Runtime-Risiko: sehr niedrig
- PWA-/Shell-Auswirkung: keine neue
- No-Op-/Legacy-Kompatibilitaet: sehr hoch
- Nachteil: beweist die neue Registration Boundary nicht
- Empfehlung: nein als Hauptvariante fuer Phase 58, aber moeglicher Fallback

## Variante B — Hook registriert explizit und ruft No-Op

Beschreibung:

```js
const api = window.ShadowBridgeBrowserBridgeCandidate;
if (!api || typeof api.registerShadowBridgeBrowserBridgeCandidate !== 'function') return;
api.registerShadowBridgeBrowserBridgeCandidate(window, {
  enabled: true,
  allowGlobalRegistration: true
});
const bridge = window.ShadowBridgeGuardedEntry;
if (!bridge || typeof bridge.runShadowBridgeGuardedEntry !== 'function') return;
bridge.runShadowBridgeGuardedEntry(null, { enabled: false });
```

Bewertung:

- Risiko: mittel, aber begrenzt
- Reversibilitaet: gut, wenn Patch exakt klein bleibt
- Debugbarkeit: hoch
- Runtime-Risiko: vorhanden, aber kontrollierbar
- PWA-/Shell-Auswirkung: keine neue Script-Aenderung
- No-Op-/Legacy-Kompatibilitaet: gut
- Vorteil: prueft den echten spaeteren Registrierungs- und No-Op-Pfad
- Empfehlung: ja, aber nur fuer Phase-58-Implementation-Review, nicht direkt blind umsetzen

## Nicht empfohlen: Automatische Registrierung beim Script-Laden

Bleibt verboten.

Grund:

- globaler Seiteneffekt beim Shell-Load
- schlechtere Debugbarkeit
- hoeheres PWA-/Shell-Risiko
- nicht noetig, da API-Container sichtbar ist

## Nicht empfohlen: Separate Registration-Datei

Grund:

- wuerde wieder einen weiteren Script-Pfad einfuehren
- erhoeht Shell-/PWA-Komplexitaet
- Bundle Candidate loest die Dependency-Frage bereits

## Empfohlene Variante fuer Phase 58

```text
Variante B - explicit register then no-op call
```

Aber Phase 58 soll zuerst ein Implementation Review sein.

Wenn im Review Zweifel bestehen:

```text
kein app.js-Patch
```
