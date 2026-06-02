# Event V2 UI-Lab Contracts

Diese Dateien definieren die read-only Vertragsbasis zwischen V2-Katalogdaten und UI-Lab-Slots.

- `EventV2UiSlotContract.js`: Slot-Matrix, Pflichtgrad, Compact-Regeln.
- `EventV2UiSlotFallbacks.js`: zentrale Fallback-Texte und Default-Verhalten.
- `EventV2UiTextBudgetContract.js`: Budgetgrenzen und Compact-Textregeln.
- `EventV2UiTokenContract.js`: eingefrorene UI-Tokens aus Phase 24.

Wichtig:
- Keine Runtime-Anbindung.
- Keine App-Imports.
- Nur Mapping-/Vertragslogik fuer spaetere Shadow-Bridge.

