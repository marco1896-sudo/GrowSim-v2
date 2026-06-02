# Phase 165 - Resolve Preview UI

## Ergebnis
Resolve Preview wurde in die bestehende Single-Candidate-Detailansicht integriert.

## UI-Inhalt
- Section: `Entscheidungsvorschau`
- Hinweis: `Nur Vorschau · nichts wird gespeichert`
- Frage: aus ResolvePreviewModel mit Fallback `Was möchtest du tun?`
- 2-3 Optionen mit freundlichem Badge (`empfohlen`, `vorsichtig`, `riskant`)
- `Vorschau-Feedback` nach lokalem Klick
- `Geplante Effekte (nur Vorschau)` sichtbar

## Technischer Anker (sicherster Weg)
- Renderpunkt: `dev/event-v2-preview-gallery.html` Detailbereich (`#candidate-detail-content`)
- Datenquelle: `EventV2ResolvePreviewModel`
- UI-Layer: `EventV2ResolvePreviewUiModel`
- Interaktion: `EventV2ResolvePreviewInteractionController`

## Risiko / Rollback
- Risiko gering, da dev-only Preview-Surface.
- Rollback: neue Resolve-Preview-Sektion ausblenden, bestehender Candidate-Detail-Flow bleibt unverändert.
