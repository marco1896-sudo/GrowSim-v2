const assert = require('assert');
const fs = require('fs');
const path = require('path');

global.state = {
  simulation: {
    lastTickRealTimeMs: Date.now() - 30000,
    simTimeMs: Date.now(),
    tickCount: 0
  },
  plant: { isDead: false, phase: 'seedling' },
  status: { health: 100, stress: 0, risk: 0, water: 100 },
  ui: { openSheet: null },
  debug: { enabled: true }
};

let catchupRun = false;

global.FREEZE_SIM_ON_DEATH = true;
global.MAX_ELAPSED_PER_TICK_MS = 5000;
global.syncDeathState = () => false;
global.clamp = (val, min, max) => Math.min(Math.max(val, min), max);
global.syncCanonicalStateShape = () => {};
global.renderSheets = () => {};
global.renderHud = () => {};
global.renderEventSheet = () => {};
global.renderAnalysisPanel = () => {};
global.renderDeathOverlay = () => {};
global.schedulePersistState = () => {};

global.syncSimulationFromElapsedTime = () => {
  catchupRun = true;
};
global.applySimulationDelta = () => {};
global.window = {};

const simJsPath = path.join('C:\\Users\\Marco\\.openclaw\\workspace\\GrowSim-v1-main', 'sim.js');
const simJsContent = fs.readFileSync(simJsPath, 'utf8');

let tickFn = '';
let inTick = false;
let braces = 0;
for (let line of simJsContent.split('\n')) {
  if (line.startsWith('function tick() {')) {
    inTick = true;
    braces = 1;
    continue;
  }
  if (inTick) {
    if (line.includes('{')) braces += (line.match(/\{/g) || []).length;
    if (line.includes('}')) braces -= (line.match(/\}/g) || []).length;
    if (braces === 0) break;
    tickFn += line + '\n';
  }
}
const tick = new Function(tickFn);

tick();
assert.strictEqual(catchupRun, true, 'Tick should escalate to syncSimulationFromElapsedTime when rawElapsed > 7500ms');

console.log('PASS: Offline Event Spam Regression Test (tick escalation)');
