'use strict';

(function attachHomeMapping(globalScope) {
  function fallbackHomeViewModel(state) {
    const safeState = state && typeof state === 'object' ? state : {};
    const simulation = safeState.simulation || {};
    const status = safeState.status || {};
    const plant = safeState.plant || {};
    const events = safeState.events || {};
    const scheduler = events.scheduler || {};
    const ui = safeState.ui || {};
    const boost = safeState.boost || {};

    return {
      id: 'home',
      activeScreen: String(ui.activeScreen || 'home'),
      openSheet: ui.openSheet || null,
      dead: Boolean(plant.isDead || plant.phase === 'dead'),
      phaseCard: {
        title: '-',
        cycleIcon: '-',
        ageLabel: '-',
        subtitle: '-',
        progressPercent: 0,
        nextLabel: ''
      },
      eventStatus: {
        label: events.machineState === 'resolved' ? 'Ereignisstatus' : 'Nächstes Ereignis',
        value: events.machineState === 'activeEvent' ? 'Ereignis aktiv' : String(Math.max(0, Number(scheduler.nextEventRealTimeMs || 0) - Number(simulation.nowMs || 0)))
      },
      boostText: `Event -30 Min · kleiner Pflanzenimpuls · ${Number(boost.boostUsedToday || 0)}/${Number(boost.boostMaxPerDay || 0)} heute`,
      growthImpulseText: Number(simulation.growthImpulse || 0).toFixed(2),
      simTimeText: String(Number(simulation.simTimeMs || 0)),
      isDaytime: Boolean(simulation.isDaytime),
      rings: {
        health: Number(status.health || 0),
        stress: Number(status.stress || 0),
        water: Number(status.water || 0),
        nutrition: Number(status.nutrition || 0),
        growth: Number(status.growth || 0),
        risk: Number(status.risk || 0)
      },
      panel: {
        playerName: 'Max Mustergrower',
        playerRole: 'Gärtner',
        xpText: '',
        xpPercent: 0,
        coinText: '',
        gemText: '',
        starText: '',
        envTempText: '',
        envHumidityText: '',
        envVpdText: '',
        envLightText: '',
        envAirflowText: '',
        rootPhText: '',
        rootEcText: '',
        rootHealthText: '',
        rootOxygenText: ''
      },
      actions: {
        careDisabled: Boolean(plant.isDead || plant.phase === 'dead'),
        boostDisabled: Boolean(plant.isDead || plant.phase === 'dead'),
        diagnosisDisabled: Boolean(plant.isDead || plant.phase === 'dead'),
        skipNightDisabled: Boolean(plant.isDead || plant.phase === 'dead') || Boolean(simulation.isDaytime),
        showSkipNight: !Boolean(plant.isDead || plant.phase === 'dead') && !Boolean(simulation.isDaytime)
      },
      overlays: Array.isArray(ui.visibleOverlayIds) ? ui.visibleOverlayIds.slice() : []
    };
  }

  const homeMapping = Object.freeze({
    id: 'home',
    reads: Object.freeze([
      'ui.activeScreen',
      'ui.openSheet',
      'ui.visibleOverlayIds',
      'simulation.isDaytime',
      'simulation.nowMs',
      'simulation.simDay',
      'simulation.simTimeMs',
      'simulation.growthImpulse',
      'status.health',
      'status.stress',
      'status.water',
      'status.nutrition',
      'status.growth',
      'status.risk',
      'plant.isDead',
      'plant.phase',
      'plant.stageKey',
      'events.machineState',
      'events.resolvingUntilMs',
      'events.scheduler.nextEventRealTimeMs',
      'boost.boostUsedToday',
      'boost.boostMaxPerDay'
    ]),
    toViewModel(state) {
      const renderer = globalScope.GrowSimHomeRenderer;
      if (renderer && typeof renderer.buildViewModel === 'function') {
        return renderer.buildViewModel(state);
      }
      return fallbackHomeViewModel(state);
    }
  });

  globalScope.GrowSimScreenMappings = Object.assign({}, globalScope.GrowSimScreenMappings, {
    home: homeMapping
  });
})(window);