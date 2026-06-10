#!/usr/bin/env node
'use strict';

const assert = require('assert');
const coinActionApi = require('../src/gameplay/coinActions.js');

function buildSnapshot(overrides = {}) {
  const base = {
    simulation: {
      simDay: 24
    },
    plant: {
      phase: 'vegetative'
    },
    status: {
      water: 62,
      nutrition: 61,
      stress: 24,
      risk: 20,
      health: 82
    },
    events: {
      machineState: 'idle'
    },
    retention: {
      dailyCare: {
        dayKey: '2026-06-11',
        buddyCheck: {
          primaryTaskId: 'veg_feed_support'
        },
        tasks: [
          { id: 'veg_feed_support', progress: 0, target: 1, completed: false, claimed: false },
          { id: 'care_sheet_check', progress: 0, target: 1, completed: false, claimed: false }
        ]
      },
      weekly: {
        weekKey: '2026-06-08',
        missionId: 'growth_focus',
        completedAtMs: 0,
        claimedAtMs: 0
      },
      coinActions: {
        buddyTip: {},
        focusBoost: {},
        safeBoostCheck: {},
        weeklyPush: {}
      }
    }
  };
  return {
    ...base,
    ...overrides,
    simulation: { ...base.simulation, ...(overrides.simulation || {}) },
    plant: { ...base.plant, ...(overrides.plant || {}) },
    status: { ...base.status, ...(overrides.status || {}) },
    events: { ...base.events, ...(overrides.events || {}) },
    retention: {
      ...base.retention,
      ...(overrides.retention || {}),
      dailyCare: {
        ...base.retention.dailyCare,
        ...(((overrides.retention || {}).dailyCare) || {}),
        buddyCheck: {
          ...base.retention.dailyCare.buddyCheck,
          ...(((((overrides.retention || {}).dailyCare) || {}).buddyCheck) || {})
        }
      },
      weekly: {
        ...base.retention.weekly,
        ...(((overrides.retention || {}).weekly) || {})
      },
      coinActions: {
        ...base.retention.coinActions,
        ...(((overrides.retention || {}).coinActions) || {})
      }
    }
  };
}

(function testCatalogHasExpectedActions() {
  const catalog = coinActionApi.createCatalog();
  assert.strictEqual(catalog.length, 5, `expected 5 coin actions, got ${catalog.length}`);
})();

(function testAvailabilityTracksDailyAndWeeklyState() {
  const actions = coinActionApi.buildActionCatalog(buildSnapshot(), {});
  const byId = Object.fromEntries(actions.map((entry) => [entry.id, entry]));
  assert.strictEqual(byId.buddy_extra_tip.available, true, 'buddy extra tip should be available with open daily tasks');
  assert.strictEqual(byId.daily_focus_boost.available, true, 'focus boost should be available with a primary daily task');
  assert.strictEqual(byId.weekly_push.available, true, 'weekly push should be available with an active weekly mission');
  assert.strictEqual(byId.safe_boost_check.available, false, 'safe boost check should stay locked when no time-related context exists');
  assert.strictEqual(byId.recovery_snack.available, false, 'recovery snack should stay disabled in this phase');
})();

(function testBuddyExtraTipFallsBackSafely() {
  const result = coinActionApi.buildBuddyExtraTip(buildSnapshot({
    retention: {
      dailyCare: {
        tasks: []
      }
    }
  }), {
    dayKey: '2026-06-11',
    weekKey: '2026-06-08'
  });

  assert(result.textKey.length > 0, 'buddy extra tip should always return a text key');
  assert(['weekly', 'focus', 'fallback'].includes(result.category) || result.category.length > 0, 'buddy extra tip should resolve a safe category');
})();

(function testSafeBoostCheckTracksRisk() {
  const safe = coinActionApi.buildSafeBoostCheck(buildSnapshot({
    retention: {
      dailyCare: {
        tasks: [
          { id: 'stable_climate_window', progress: 0, target: 1, completed: false, claimed: false },
          { id: 'open_app_twice', progress: 0, target: 2, completed: false, claimed: false }
        ]
      }
    }
  }), {
    dayKey: '2026-06-11',
    weekKey: '2026-06-08'
  });
  const unsafe = coinActionApi.buildSafeBoostCheck(buildSnapshot({
    status: {
      water: 41,
      nutrition: 45,
      stress: 58,
      risk: 63,
      health: 48
    },
    events: {
      machineState: 'activeEvent'
    }
  }), {
    dayKey: '2026-06-11',
    weekKey: '2026-06-08'
  });

  assert.strictEqual(safe.statusKey, 'safe', `expected safe status, got ${safe.statusKey}`);
  assert.strictEqual(unsafe.statusKey, 'unsafe', `expected unsafe status, got ${unsafe.statusKey}`);
})();

(function testSafeBoostCheckAvailabilityBecomesSituational() {
  const withTimeContext = coinActionApi.buildActionCatalog(buildSnapshot({
    retention: {
      dailyCare: {
        buddyCheck: {
          category: 'timeboost_safe',
          primaryTaskId: 'stable_climate_window'
        },
        tasks: [
          { id: 'stable_climate_window', progress: 0, target: 1, completed: false, claimed: false },
          { id: 'open_app_twice', progress: 0, target: 2, completed: false, claimed: false }
        ]
      }
    }
  }), {});
  const withTimeById = Object.fromEntries(withTimeContext.map((entry) => [entry.id, entry]));
  assert.strictEqual(withTimeById.safe_boost_check.available, true, 'safe boost check should unlock for timeboost-related days');
})();

console.log('coin-actions.test.js passed');
