
const fs = require('fs');
const path = require('path');
const repoDir = 'C:\\Users\\Marco\\.openclaw\\workspace\\GrowSim-v1-main';

function applyFix() {
    // --- sim.js changes ---
    let simPath = path.join(repoDir, 'sim.js');
    let simContent = fs.readFileSync(simPath, 'utf8');

    // 1. Add isCatchUp = true at start of try block in syncSimulationFromElapsedTime
    const findTryBlock = '  state.simulation.nowMs = safeNowMs;\n\n  try {';
    const replaceTryBlock = '  state.simulation.nowMs = safeNowMs;\n\n  try {\n    state.simulation.isCatchUp = true;';
    simContent = simContent.replace(findTryBlock, replaceTryBlock);

    // 2. Add finally block to reset isCatchUp = false
    const findFinallyBlockEnd = '      syncCanonicalStateShape();\n    }';
    const replaceFinallyBlockEnd = '      syncCanonicalStateShape();\n    } finally {\n      state.simulation.isCatchUp = false;\n    }';
    simContent = simContent.replace(findFinallyBlockEnd, replaceFinallyBlockEnd);

    // 3. Pass isCatchUp to runEventStateMachine in applySimulationDelta
    const findRunEventStateMachineCall = '      runEventStateMachine(safeEffectiveNowMs);';
    const replaceRunEventStateMachineCall = '      runEventStateMachine(safeEffectiveNowMs, state.simulation.isCatchUp);';
    simContent = simContent.replace(findRunEventStateMachineCall, replaceRunEventStateMachineCall);

    fs.writeFileSync(simPath, simContent, 'utf8');

    // --- events.js changes ---
    let eventsPath = path.join(repoDir, 'events.js');
    let eventsContent = fs.readFileSync(eventsPath, 'utf8');

    // 1. Update runEventStateMachine signature
    const findSignature = 'function runEventStateMachine(nowMs) {';
    const replaceSignature = 'function runEventStateMachine(nowMs, isCatchUp = false) {';
    eventsContent = eventsContent.replace(findSignature, replaceSignature);

    // 2. Suppress event rolls if isCatchUp is true
    const findEventRollLogic = '      if (!state.simulation.isDaytime) {';
    const replaceEventRollLogic = `      if (isCatchUp) {
        state.events.scheduler.nextEventRealTimeMs = nowMs + deterministicEventDelayMs(nowMs);
        addLog('system', 'Events im Catch-up-Modus unterdrückt, nächster Wurf geplant.', { nextEventAtMs: state.events.scheduler.nextEventRealTimeMs });
        schedulePushIfAllowed(false);
        return;
      }

      if (!state.simulation.isDaytime) {`;
    eventsContent = eventsContent.replace(findEventRollLogic, replaceEventRollLogic);
    
    // Also need to skip actual event selection in isCatchUp mode, only reschedule
    const findShouldTriggerEvent = '      if (!shouldTriggerEvent(roll)) {';
    const replaceShouldTriggerEvent = `      if (isCatchUp) {
        addLog('system', 'Event-Wurf im Catch-up-Modus übersprungen.', { roll, threshold, at: nowMs });
        scheduleNextEventRoll(nowMs, 'catch_up_skip');
        schedulePushIfAllowed(false);
        return;
      }
      if (!shouldTriggerEvent(roll)) {`;
    eventsContent = eventsContent.replace(findShouldTriggerEvent, replaceShouldTriggerEvent);


    fs.writeFileSync(eventsPath, eventsContent, 'utf8');
    
    console.log('Event spam fix applied successfully!');
}

applyFix();
