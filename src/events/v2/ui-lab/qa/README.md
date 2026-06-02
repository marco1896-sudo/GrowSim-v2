# Event V2 UI-Lab QA Matrix

Diese QA-Schicht prueft den Adapter gegen den kompletten Mini-Katalog (read-only).

Module:
- `EventV2AdapterMatrix.js`: laedt den kompletten Mini-Katalog + Learning-Cards und mappt ihn.
- `EventV2SlotQaBaseline.js`: aggregiert Baseline-Kennzahlen.
- `EventV2SlotCompleteness.js`: required/recommended/optional Slot-Pruefung.
- `EventV2BudgetQa.js`: Textbudget-Checks nach Phase-24-Freeze.
- `EventV2BridgeReadinessGate.js`: pass/warning/blocked Go-No-Go.
- `EventV2AdapterMatrixReport.js`: Markdown-Report fuer Matrix + Baseline.

Wichtig:
- Keine Runtime-Anbindung.
- Keine App-Hooks.
- Keine Event-Aktivierung.
- Keine Katalogdaten-Mutation.
