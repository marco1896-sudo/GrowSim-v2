# Phase 46: Browser Candidate Pair Loading Plan

## Ziel

Phase 46 bewertet, wie der Browser Guarded Entry Candidate und der Browser Exposure Candidate spaeter geladen werden koennten. Es wurde kein produktiver Ladepfad geaendert.

## Neue Plan-Dateien

- `src/events/v2/shadow-bridge/ShadowBridgeBrowserLoadingPairPlan.js`
- `src/events/v2/shadow-bridge/ShadowBridgeBrowserBundleCandidatePlan.js`

## Gelesene Dateien

- `docs/event-system-v2/79_codex-phase-45-browser-guarded-entry-candidate.md`
- `docs/event-system-v2/80_codex-phase-45-browser-candidate-integration-smoke.md`
- `docs/event-system-v2/81_codex-phase-45-result.md`
- `docs/event-system-v2/76_codex-phase-44-browser-exposure-loading-plan.md`
- `docs/event-system-v2/77_codex-phase-44-script-list-patch-proposal.md`
- `docs/event-system-v2/47_codex-phase-29-shadow-bridge-guardrails.md`
- `.codex/PWA_SERVICE_WORKER_RULES.md`
- `index.html` read-only
- `sw.js` read-only
- `manifest.webmanifest` read-only
- `package.json` read-only

## Aktuelle Lade-Struktur

`index.html` definiert `coreScriptList` ab Zeile 1778. `app.js` wird weiterhin als letzter Core-Script-Eintrag geladen.

Relevanter Zielbereich:

```js
      { src: 'src/monetization/googleAdPlacementRewardProvider.js' },
      { src: 'src/monetization/coinPackCatalog.js' },
      { src: 'src/monetization/purchaseServiceAdapter.js' },
      { src: 'app.js' }
```

## Zwei-Script-Variante

Spaetere Reihenfolge waere:

1. `src/events/v2/shadow-bridge/ShadowBridgeBrowserGuardedEntryCandidate.js`
2. `src/events/v2/shadow-bridge/ShadowBridgeBrowserExposureCandidate.js`
3. `app.js`

## Bewertung Zwei-Script-Variante

Vorteile:

- Beide Dateien existieren bereits isoliert.
- Beide sind ohne `require`/ESM im Candidate selbst vorbereitet.
- Tests und Integration-Smoke sind gruen.

Probleme:

- Der Guarded Entry Candidate schreibt nicht automatisch auf `window`.
- Der Exposure Candidate erwartet explizite Dependencies.
- Der Exposure Candidate haette nach einfachem Laden keinen automatischen Zugriff auf den Guarded Entry Candidate.
- Realistisch waere ein drittes Registration-Script noetig.
- Drei Scripts vor `app.js` erhoehen Boot-Reihenfolge- und Rollback-Komplexitaet.

## Zwei-Script-Patch nur als spaeterer Vorschlag

Nicht anwenden:

```diff
       { src: 'src/monetization/googleAdPlacementRewardProvider.js' },
       { src: 'src/monetization/coinPackCatalog.js' },
       { src: 'src/monetization/purchaseServiceAdapter.js' },
+      { src: 'src/events/v2/shadow-bridge/ShadowBridgeBrowserGuardedEntryCandidate.js' },
+      { src: 'src/events/v2/shadow-bridge/ShadowBridgeBrowserExposureCandidate.js' },
       { src: 'app.js' }
```

Dieser Patch waere unvollstaendig, solange kein drittes Registration-Script oder kein globaler Dependency-Handoff existiert.

## Rollback Zwei-Script-Variante

Rollback waere:

1. beide Script-Zeilen entfernen.
2. Shell/Build-ID aktualisieren.
3. PWA Reload pruefen.
4. Candidate Tests und Combined Report erneut ausfuehren.

## Bewertung

Die Zwei-Script-Variante ist testbar, aber nicht die risikoaermste spaetere App-Shell-Strategie.

Entscheidung:

- `not_recommended_for_first_loading_step`

