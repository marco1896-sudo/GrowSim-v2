# Event V2 UI-Lab Adapter (Read-Only Prep)

Diese Adapter-Schicht mappt V2-Katalogdaten in ein UI-Lab-kompatibles Objekt, ohne Runtime-Anbindung.

Enthaelt:
- `EventV2LocaleResolver.js`: i18n-Aufloesung (flat + nested Keys).
- `EventV2AssetResolver.js`: Hero-Asset + Fallback-Regeln.
- `EventV2UiAdapterDiagnostics.js`: strukturierte Diagnostics + Summary.
- `EventV2CatalogToUiAdapter.js`: zentrale Mapping-Funktion Event -> UI-Lab-Objekt.

Wichtige Regeln:
- Keine Imports in bestehende Runtime.
- Keine App-Hooks.
- Keine Eventaktivierung.
- Nur read-only Mapping/Contract-Logik.

