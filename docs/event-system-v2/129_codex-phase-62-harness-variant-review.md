# Phase 62: Harness Variant Review

## Bewertete Varianten

### Variante 1: Direkter Browser-Aufruf von `window.runEventStateMachine(...)`

Bewertung:

- Risiko: hoch
- Aussagekraft: hoch, aber nicht sicher
- Reversibilitaet: schlecht, falls State mutiert
- Naehe zu Runtime: echte Runtime-Grenze
- Live-State-Gefahr: hoch
- Guardrail-Kompatibilitaet: nein
- Empfehlung: nein

Grund:

Der Funktionskoerper enthaelt `state`. Ein direkter Aufruf wuerde den Legacy-State-Machine-Pfad beruehren.

### Variante 2: Browser-Monkeypatch der Legacy-State-Machine

Bewertung:

- Risiko: mittel bis hoch
- Aussagekraft: verzerrt
- Reversibilitaet: mittel
- Naehe zu Runtime: veraenderter Runtime-Pfad
- Live-State-Gefahr: mittel
- Guardrail-Kompatibilitaet: nein
- Empfehlung: nein

Grund:

Ein Monkeypatch wuerde die Legacy-Aussage verfaelschen. Der Test wuerde nicht mehr den echten Pfad pruefen.

### Variante 3: Isolierter Node-/Dev-Harness, der den Helper-Code statisch oder kontrolliert nachbildet

Bewertung:

- Risiko: niedrig
- Aussagekraft: Hook-Unit-only
- Reversibilitaet: hoch
- Naehe zu Runtime: isoliert
- Live-State-Gefahr: niedrig
- Guardrail-Kompatibilitaet: ja
- Empfehlung: ja, wenn klar als Unit-Harness markiert

Grund:

Dieser Ansatz kann den No-Op-Anteil beweisen, darf aber keinen vollstaendigen Runtime-Tick behaupten.

### Variante 4: Extraktion des Hook-Helpers aus `app.js` in eine isolierte Funktion

Bewertung:

- Risiko: mittel
- Aussagekraft: spaeter gut
- Reversibilitaet: mittel
- Naehe zu Runtime: Runtime-Strukturaenderung
- Live-State-Gefahr: niedrig
- Guardrail-Kompatibilitaet: aktuell nein
- Empfehlung: jetzt nein

Grund:

Eine Extraktion waere eine neue Runtime-Strukturaenderung. Phase 62 ist nur Planung.

### Variante 5: Neuer isolierter Dev-Harness mit Static + Browser API + Reporting

Bewertung:

- Risiko: niedrig
- Aussagekraft: beste aktuelle Scope-Abdeckung
- Reversibilitaet: hoch
- Naehe zu Runtime: nahe Boundary, ohne Trigger
- Live-State-Gefahr: niedrig
- Guardrail-Kompatibilitaet: ja
- Empfehlung: ja

Grund:

Diese Variante kombiniert die bereits gruenen Bausteine:

- Hook-aware Static Check
- Browser API Registrierung
- No-Op-Call
- Storage-/UI-/Event-Schutz
- klare Report-Grenzen

## Entscheidung

Empfohlen fuer Phase 63:

```text
combined_static_and_browser_api_harness
```

## Ergebnislabels fuer Phase 63

Der Phase-63-Harness muss explizit reporten:

```text
hook_unit_harness_pass
runtime_path_not_triggered
full_runtime_tick_not_claimed
```

## Nicht erlaubte Ergebnisinterpretationen

Nicht erlaubt:

- `runtime_tick_pass`
- `live_bridge_pass`
- `event_state_machine_runtime_verified`

Diese Aussagen waeren erst erlaubt, wenn ein spaeterer, separater, sicherer Runtime-Harness existiert.
