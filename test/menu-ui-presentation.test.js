#!/usr/bin/env node
'use strict';

const assert = require('assert');
require('../src/ui/state/pushUiPresentation.js');
const menuUiPresentation = require('../src/ui/state/menuUiPresentation.js');

function buildState(overrides = {}) {
  return {
    meta: {
      rescue: {
        used: false,
        usedAtRealMs: null,
        lastResult: ''
      }
    },
    settings: {
      pushNotificationsEnabled: false
    },
    ...overrides
  };
}

{
  const rewardPresentation = menuUiPresentation.resolveRewardPresentation(buildState(), {
    rewardControl: {
      providerMode: 'provider_rewarded',
      providerStatus: {
        mode: 'provider_rewarded',
        state: 'initializing'
      }
    }
  });

  assert.strictEqual(rewardPresentation.badge, 'Rewarded');
  assert.strictEqual(rewardPresentation.subtext, menuUiPresentation.TEXT.reward.preparing);
}

{
  const rescuePresentation = menuUiPresentation.resolveRescuePresentation(buildState({
    meta: {
      rescue: {
        used: true,
        lastResult: ''
      }
    }
  }), {
    rewardControl: {
      disabled: false
    }
  });

  assert.strictEqual(rescuePresentation.disabled, true, 'used rescue should be disabled');
  assert.strictEqual(rescuePresentation.disabledReason, 'already_used');
  assert.strictEqual(rescuePresentation.badge, 'Verbraucht');
}

{
  const rescuePresentation = menuUiPresentation.resolveRescuePresentation(buildState(), {
    rewardControl: {
      disabled: true,
      reason: 'provider_unavailable',
      hint: 'Rewarded ist gerade nicht verfügbar.'
    }
  });

  assert.strictEqual(rescuePresentation.disabled, true, 'disabled reward control should disable rescue presentation');
  assert.strictEqual(rescuePresentation.subtext, 'Rewarded ist gerade nicht verfügbar.');
}

{
  const menuPresentation = menuUiPresentation.resolveMenuPresentation(buildState(), {
    pushUiRuntime: {
      status: 'granted_subscribed',
      permission: 'granted',
      supported: true,
      busy: false,
      message: '',
      error: ''
    },
    notifications: {
      enabled: true,
      lastMessage: '',
      types: {
        events: true,
        critical: true,
        reminder: false
      }
    },
    pushEnabled: true,
    authed: true
  });

  assert.strictEqual(menuPresentation.entries.push.badge, 'An');
  assert.strictEqual(menuPresentation.entries.push.subtext, 'Push ist aktiv. Du wirst bei wichtigen Gameplay-Ereignissen informiert.');
  assert.strictEqual(menuPresentation.entries.stats.title.length > 0, true);
}

console.log('menu-ui-presentation.test.js passed');
