# Phase 66: Runtime Harness Variant Review

## Varianten

### Variante 1: Direkter Browser-Aufruf von `window.runEventStateMachine(nowMs)`

- Risiko: hoch
- Aussagekraft: hoch, aber unsicher
- Naehe zur echten Runtime: sehr hoch
- Save-/Storage-Risiko: hoch
- UI-Risiko: mittel
- Eventaktivierungs-Risiko: hoch
- Live-State-Risiko: hoch
- Reversibilitaet: schlecht
- Empfehlung: nein

### Variante 2: Browser-Monkeypatch / Stub der Legacy-State-Machine

- Risiko: hoch
- Aussagekraft: verzerrt
- Naehe zur echten Runtime: veraenderte Runtime
- Save-/Storage-Risiko: mittel
- UI-Risiko: mittel
- Eventaktivierungs-Risiko: mittel
- Live-State-Risiko: mittel
- Reversibilitaet: mittel
- Empfehlung: nein

### Variante 3: Node-basierter Unit-Harness fuer extrahierten Hook-Helper

- Risiko: niedrig bis mittel
- Aussagekraft: Hook-Unit-only
- Naehe zur echten Runtime: niedrig
- Save-/Storage-Risiko: niedrig
- UI-Risiko: niedrig
- Eventaktivierungs-Risiko: niedrig
- Live-State-Risiko: niedrig
- Reversibilitaet: hoch
- Empfehlung: nur begrenzt

### Variante 4: Separater Test-Only Wrapper um den Hook-Preflight

- Risiko: mittel
- Aussagekraft: mittel bis hoch
- Naehe zur echten Runtime: boundary-nah
- Save-/Storage-Risiko: niedrig
- UI-Risiko: niedrig
- Eventaktivierungs-Risiko: niedrig
- Live-State-Risiko: niedrig bis mittel
- Reversibilitaet: mittel bis hoch
- Empfehlung: spaeter eventuell

### Variante 5: Minimaler Dev-only Runtime-Tick-Harness mit Fake-State

- Risiko: hoch
- Aussagekraft: mittel
- Naehe zur echten Runtime: state-nah
- Save-/Storage-Risiko: mittel
- UI-Risiko: mittel
- Eventaktivierungs-Risiko: hoch
- Live-State-Risiko: hoch
- Reversibilitaet: mittel
- Empfehlung: nein

### Variante 6: Shadow-only Tick-Simulator ausserhalb von `app.js`

- Risiko: niedrig bis mittel
- Aussagekraft: beste mittelfristige Boundary-Abdeckung
- Naehe zur echten Runtime: boundary-only
- Save-/Storage-Risiko: niedrig
- UI-Risiko: niedrig
- Eventaktivierungs-Risiko: niedrig
- Live-State-Risiko: niedrig
- Reversibilitaet: hoch
- Empfehlung: ja

### Variante 7: Bestehende Test-Suite mit isoliertem `app.js`-Hook-Safety-Test erweitern

- Risiko: niedrig bis mittel
- Aussagekraft: mittel
- Naehe zur echten Runtime: test-layer-only
- Save-/Storage-Risiko: niedrig
- UI-Risiko: niedrig
- Eventaktivierungs-Risiko: niedrig
- Live-State-Risiko: niedrig
- Reversibilitaet: hoch
- Empfehlung: nur wenn nicht-invasiv

## Entscheidung

Empfohlen:

```text
shadow_only_runtime_tick_boundary_harness
```

## Begriffe

Die spaetere Implementierung darf nur mit ehrlichen Labels arbeiten:

- `runtime_tick_boundary_harness_pass`
- `no_live_state_used`
- `no_save`
- `no_ui`
- `no_event_activation`
- `full_app_runtime_tick_not_claimed`
