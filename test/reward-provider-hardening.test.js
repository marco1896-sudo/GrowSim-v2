#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PROVIDER_PATH = path.join(__dirname, '..', 'src', 'monetization', 'googleAdPlacementRewardProvider.js');
const PROVIDER_SOURCE = fs.readFileSync(PROVIDER_PATH, 'utf8');

function createStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    }
  };
}

function createProviderHarness(options = {}) {
  const nodes = new Map();
  const storage = createStorage(options.storage || {});
  const documentElement = {
    toggleAttribute() {}
  };
  const body = {
    classList: {
      toggle() {}
    }
  };
  const document = {
    head: {
      appendChild(node) {
        if (node && node.id) {
          nodes.set(node.id, node);
        }
        setTimeout(() => {
          if (options.scriptShouldFail) {
            if (typeof node.onerror === 'function') {
              node.onerror(new Error('sdk_load_failed'));
            }
            return;
          }
          if (typeof node.onload === 'function') {
            node.onload();
          }
        }, 0);
      }
    },
    body,
    documentElement,
    getElementById(id) {
      return nodes.get(id) || null;
    },
    createElement(tagName) {
      return {
        tagName,
        attrs: {},
        setAttribute(name, value) {
          this.attrs[name] = String(value);
        }
      };
    }
  };

  const fakeWindow = {
    console,
    setTimeout,
    clearTimeout,
    Promise,
    Math,
    Number,
    String,
    Object,
    Date,
    location: {
      hostname: options.hostname || 'localhost',
      protocol: options.protocol || 'https:'
    },
    localStorage: storage,
    document,
    GROWSIM_REWARDED_ADS_CONFIG: options.runtimeConfig || undefined
  };

  if (typeof options.adConfig === 'function') {
    fakeWindow.adConfig = options.adConfig.bind(fakeWindow);
  }
  if (typeof options.adBreak === 'function') {
    fakeWindow.adBreak = options.adBreak.bind(fakeWindow);
  }

  fakeWindow.window = fakeWindow;

  const context = {
    window: fakeWindow,
    console,
    setTimeout,
    clearTimeout
  };

  vm.runInNewContext(PROVIDER_SOURCE, context, { filename: 'googleAdPlacementRewardProvider.js' });
  return fakeWindow;
}

(async function testUnavailableWithoutConfig() {
  const win = createProviderHarness();
  const provider = win.GrowSimRewardProvider;
  const status = await provider.init();

  assert.strictEqual(status.state, 'unavailable', 'provider should stay unavailable without explicit config');
  assert.strictEqual(status.configEnabled, false, 'provider should not auto-enable without config');
  assert.strictEqual(status.validation.primaryReason, 'provider_disabled', 'missing config should resolve to provider_disabled');
})();

(async function testValidationForBrokenProductionConfig() {
  const win = createProviderHarness({
    hostname: 'grow.example.com',
    runtimeConfig: {
      enabled: true,
      googleAdClient: 'broken-client'
    }
  });
  const provider = win.GrowSimRewardProvider;
  const status = await provider.init();

  assert.strictEqual(status.state, 'unavailable', 'invalid production config should not become ready');
  assert.strictEqual(status.reason, 'invalid_client_format', 'invalid client format should surface a clear reason');
  assert.strictEqual(status.validation.ok, false, 'invalid config should fail validation');
})();

(async function testRewardGrantSuccessAndDismiss() {
  const runtimeConfig = {
    enabled: true,
    googleAdClient: 'ca-pub-1234567890123456',
    googleAdmobRewardedSlot: 'ca-app-pub-1234567890123456/1234567890'
  };

  const successWindow = createProviderHarness({
    hostname: 'staging.growsim.example',
    runtimeConfig,
    adConfig(config) {
      setTimeout(() => config.onReady(), 0);
    },
    adBreak(config) {
      if (typeof config.beforeAd === 'function') config.beforeAd();
      if (typeof config.beforeReward === 'function') {
        config.beforeReward(() => {});
      }
      if (typeof config.adViewed === 'function') config.adViewed();
      if (typeof config.afterAd === 'function') config.afterAd();
      if (typeof config.adBreakDone === 'function') {
        config.adBreakDone({ breakStatus: 'viewed' });
      }
    }
  });
  const successProvider = successWindow.GrowSimRewardProvider;
  const successGrant = await successProvider.requestRewardGrant({ type: 'care_boost', payload: { source: 'test' } });

  assert.strictEqual(successGrant.ok, true, 'rewarded success should grant');
  assert.strictEqual(successGrant.reason, 'reward_granted', 'rewarded success should map to reward_granted');

  const dismissedWindow = createProviderHarness({
    hostname: 'staging.growsim.example',
    runtimeConfig,
    adConfig(config) {
      setTimeout(() => config.onReady(), 0);
    },
    adBreak(config) {
      if (typeof config.beforeAd === 'function') config.beforeAd();
      if (typeof config.beforeReward === 'function') {
        config.beforeReward(() => {});
      }
      if (typeof config.adDismissed === 'function') config.adDismissed();
      if (typeof config.afterAd === 'function') config.afterAd();
      if (typeof config.adBreakDone === 'function') {
        config.adBreakDone({ breakStatus: 'dismissed' });
      }
    }
  });
  const dismissedProvider = dismissedWindow.GrowSimRewardProvider;
  const dismissedGrant = await dismissedProvider.requestRewardGrant({ type: 'care_boost', payload: { source: 'test' } });

  assert.strictEqual(dismissedGrant.ok, false, 'dismissed rewarded flow should not grant');
  assert.strictEqual(dismissedGrant.reason, 'reward_not_earned', 'dismissed reward should map to reward_not_earned');
})();

console.log('reward provider hardening tests passed');
