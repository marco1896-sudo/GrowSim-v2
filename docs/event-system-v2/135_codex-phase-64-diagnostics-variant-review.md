# Phase 64: Diagnostics Variant Review

## Varianten

### Variante 1: Keine neue Diagnose, nur bestehende Dev-Harnesses

- Risiko: niedrig
- Aussagekraft: Basis
- Reversibilitaet: hoch
- Save-/Storage-Risiko: keines
- UI-Risiko: keines
- Runtime-Risiko: keines
- Debug-Nutzen: mittel
- Empfehlung: ja

### Variante 2: Rein interner Dev-Report unter `dev/`

- Risiko: niedrig
- Aussagekraft: hoch fuer No-Op-Scope
- Reversibilitaet: hoch
- Save-/Storage-Risiko: keines
- UI-Risiko: keines
- Runtime-Risiko: niedrig
- Debug-Nutzen: hoch
- Empfehlung: ja

### Variante 3: In-Memory Debug-Objekt im Browser ohne Save

- Risiko: niedrig bis mittel
- Aussagekraft: hoch
- Reversibilitaet: hoch
- Save-/Storage-Risiko: keines bei strikter Disziplin
- UI-Risiko: keines
- Runtime-Risiko: niedrig bis mittel
- Debug-Nutzen: hoch
- Empfehlung: spaeter eventuell

### Variante 4: Console-Ausgabe bei Hook-Ausfuehrung

- Risiko: mittel
- Aussagekraft: mittel
- Reversibilitaet: hoch
- Save-/Storage-Risiko: keines
- UI-Risiko: keines
- Runtime-Risiko: niedrig
- Debug-Nutzen: mittel bis niedrig
- Empfehlung: nein

Grund: Console-Noise/Spam-Risiko.

### Variante 5: Persistente Diagnose in Storage

- Risiko: hoch
- Aussagekraft: hoch
- Reversibilitaet: mittel
- Save-/Storage-Risiko: hoch
- UI-Risiko: keines
- Runtime-Risiko: mittel
- Debug-Nutzen: hoch
- Empfehlung: nein

Grund: verletzt No-Save-Grenze.

### Variante 6: Echte Telemetrie/Event-Logging

- Risiko: hoch
- Aussagekraft: hoch
- Reversibilitaet: mittel
- Save-/Storage-Risiko: mittel
- UI-Risiko: keines
- Runtime-Risiko: mittel
- Debug-Nutzen: hoch
- Empfehlung: nein

Grund: Telemetrie ist in aktueller Phase untersagt.

### Variante 7: UI-Diagnosepanel

- Risiko: hoch
- Aussagekraft: mittel
- Reversibilitaet: mittel
- Save-/Storage-Risiko: niedrig
- UI-Risiko: hoch
- Runtime-Risiko: mittel
- Debug-Nutzen: mittel
- Empfehlung: nein

Grund: verletzt No-UI-Grenze.

## Entscheidung

Empfohlen fuer Phase 65:

```text
dev_only_noop_hook_diagnostics_report
```

Mit dieser Strategie bleiben wir strikt innerhalb der Guardrails.
