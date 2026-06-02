# Eventsystem V2 - Bulk Activation (kontrolliert)

## Ziel

Vorhandene finale V2-Events werden kontrolliert runtime-enabled gemacht, ohne neue automatische Spawns und ohne neue Statusdeltas.

## Scope dieser Phase

- Activation Registry fuer runtime-enabled Events
- Presentation/Visual-Mapping fuer alle runtime-enabled Events (hero.webp -> fallback.webp -> CSS-Fallback)
- sichere Default-Outcome-Policies fuer neue Events (`no_delta` / `guardrail_only`)
- generischer Dev-Seed fuer beliebige runtime-enabled Event-IDs
- Bulk-Audit- und Bulk-Smoke-Skripte

## Aktivierte Events

Alle validierten Events unter `assets/events/v2/final/*`, sofern Registry + Katalog + Optionen vorhanden.

## Outcome-Strategie

- Unveraendert:
  - `indoor_dry_rootball/stabilize` bleibt mutierend (`apply_delta`)
  - bestehende Policys fuer `indoor_dry_rootball` und `shared_panic_watering_misread` bleiben erhalten
- Neu aktivierte Events:
  - Standard: `no_delta` mit `safe_default_review`
  - Riskante Optionen: `guardrail_only` mit `safe_guardrail_review`

## Was explizit nicht gemacht wurde

- kein V1-Delete
- keine neuen echten Statusdeltas fuer neue Events
- kein Storage-Umbau
- keine automatische breite Event-Erzeugung

