'use strict';

const AREA_FILE_HINTS = {
  homescreen: ['index.html', 'styles.css', 'ui.js', 'app.js'],
  events: ['events.js', 'src', 'assets/events', 'test/event-*.test.js'],
  retention: ['app.js', 'ui.js', 'test/daily-tasks-runtime.test.js', 'test/daily-tasks-ui-state.test.js'],
  shop: ['app.js', 'ui.js', 'test/coin-shop-runtime-fix.test.js', 'test/coin-economy-source-regression.test.js'],
  assets: ['assets', '.codex/ASSET_PIPELINE.md'],
  i18n: ['src/i18n', 'scripts/i18n-audit.js', 'test/i18n-runtime.test.js'],
  push: ['notifications.js', 'src/ui/state/pushUiPresentation.js', 'sw.js'],
  minigame: ['.codex/MINIGAME_RULES.md', 'src', 'assets'],
  backend: ['.codex/BACKEND_ADMIN_RULES.md', 'storage.js'],
  general: ['AGENTS.md', '.codex', 'package.json']
};

const AREA_LABELS = {
  homescreen: 'Homescreen',
  events: 'Events',
  retention: 'Retention / Daily Tasks',
  shop: 'Shop / Coins / Monetization',
  assets: 'Assets',
  i18n: 'i18n',
  push: 'Push Notifications',
  minigame: 'Minigame',
  backend: 'Backend/Admin',
  general: 'Allgemein'
};

function buildPrompt(input) {
  const area = String(input.area || 'general');
  const taskType = String(input.taskType || 'Analyse');
  const riskLevel = String(input.riskLevel || 'vorsichtig');
  const description = String(input.description || '').trim() || '[Ziel hier beschreiben]';
  const areaLabel = AREA_LABELS[area] || AREA_LABELS.general;
  const fileHints = AREA_FILE_HINTS[area] || AREA_FILE_HINTS.general;
  const depthLine = riskLevel === 'gruendlich'
    ? 'Arbeite gruendlich, aber weiterhin systemschonend und mit klarer Testabdeckung.'
    : (riskLevel === 'normal'
      ? 'Arbeite mit normaler Tiefe und pruefe die relevanten Seiteneffekte.'
      : 'Arbeite vorsichtig, minimal-invasiv und vermeide riskante Struktur- oder Gameplay-Aenderungen.');

  return `Du bist im Grow Simulator als Senior Fullstack-Entwickler taetig.

Bereich: ${areaLabel}
Aufgabentyp: ${taskType}
Risiko-Level: ${riskLevel}

Kontext:
Analysiere zuerst die aktuelle Struktur von ${areaLabel}. Beachte AGENTS.md und die relevanten Dateien unter .codex/. Bestehende App-Logik, Savegames, Assets, i18n, Service Worker und Event-Autoritaet duerfen nicht unnoetig veraendert werden.

Ziel:
${description}

Relevante Dateien / Startpunkte:
${fileHints.map((item) => `- ${item}`).join('\n')}

Bitte:
1. lies zuerst die relevanten Projekt- und .codex-Kontextdateien
2. identifiziere betroffene Systeme, Persistenz-/Save-Auswirkung, i18n-Auswirkung und Testbereiche
3. keine unnoetigen Refactors und keine parallelen Ersatzsysteme
4. bestehende Logik erhalten und nur gezielt erweitern
5. bei Gameplay-, Economy-, Persistence-, Monetization-, Asset-, Service-Worker- oder Backend-Autoritaets-Aenderungen zuerst das Idea-First-Konzept erstellen und auf Freigabe warten
6. passende Tests oder Checks aus dem bestehenden package.json nutzen
7. am Ende geaenderte Dateien, Tests, nicht getestete Bereiche und Restrisiken ehrlich zusammenfassen

Vorgehen:
${depthLine}

Testanforderungen:
- passende Syntax-/Runtime-/Smoke-/i18n-Checks aus package.json auswaehlen
- bei UI-Aenderungen mobile Layouts und Reload-Verhalten manuell empfehlen
- bei Save-/Migrationsthemen Fresh Save, Existing Save und Missing-Field-Faelle beachten

Abschlussbericht:
## Completed
## Changed Files
## What Changed
## Tests Run
## Tests Not Run
## Risks / Notes
## Recommended Manual Checks
## Next Logical Step`;
}

module.exports = {
  buildPrompt
};
