#!/usr/bin/env node
'use strict';

const assert = require('assert');
const pushUiPresentation = require('../src/ui/state/pushUiPresentation.js');

function buildState(overrides = {}) {
  return {
    settings: {
      pushNotificationsEnabled: false,
      ...(overrides.settings || {})
    },
    ...overrides
  };
}

function buildNotifications(overrides = {}) {
  return {
    enabled: false,
    lastMessage: '',
    types: {
      events: true,
      critical: true,
      reminder: false
    },
    ...overrides
  };
}

function buildRuntime(overrides = {}) {
  return {
    status: 'unsupported',
    permission: 'unsupported',
    supported: false,
    hasSubscription: false,
    busy: false,
    message: '',
    error: '',
    lastUpdatedAtMs: 0,
    ...overrides
  };
}

{
  const presentation = pushUiPresentation.resolvePushPresentation(buildState(), {
    pushUiRuntime: buildRuntime({
      status: 'unsupported',
      permission: 'unsupported',
      supported: false
    }),
    notifications: buildNotifications(),
    authed: true
  });

  assert.strictEqual(presentation.menuEntry.disabled, true, 'unsupported push should disable the menu entry');
  assert.strictEqual(presentation.menuEntry.disabledReason, 'unsupported');
  assert.strictEqual(presentation.menuEntry.subtext, 'Nicht verfuegbar');
  assert.strictEqual(presentation.settings.supportLabel, 'Nein');
  assert.strictEqual(presentation.settings.feedback, pushUiPresentation.TEXT.feedback.unsupported);
}

{
  const presentation = pushUiPresentation.resolvePushPresentation(buildState(), {
    pushUiRuntime: buildRuntime({
      status: 'supported_but_not_granted',
      permission: 'default',
      supported: true
    }),
    notifications: buildNotifications(),
    authed: false
  });

  assert.strictEqual(presentation.settings.enableVisible, true, 'inactive supported push should show enable control');
  assert.strictEqual(presentation.settings.enableDisabled, true, 'enable control stays disabled while unauthenticated');
  assert.strictEqual(presentation.menuEntry.subtext, 'Konto fuer Cloud-Erinnerungen noetig');
  assert.strictEqual(presentation.settings.feedback, pushUiPresentation.TEXT.feedback.unauthenticated);
  assert.strictEqual(presentation.toggle.statusLabel, 'Deaktiviert');
  assert.match(presentation.settings.feedback, /lokaler Run bleibt spielbar/, 'signed-out reminder copy should not pressure login');
}

{
  const presentation = pushUiPresentation.resolvePushPresentation(buildState(), {
    pushUiRuntime: buildRuntime({
      status: 'granted_subscribed',
      permission: 'granted',
      supported: true
    }),
    notifications: buildNotifications({
      enabled: true,
      types: {
        events: true,
        critical: false,
        reminder: true
      }
    }),
    authed: true
  });

  assert.strictEqual(presentation.active, true, 'granted subscription should be active');
  assert.strictEqual(presentation.menuEntry.badge, 'An');
  assert.strictEqual(presentation.menuEntry.subtext, 'Aktiv');
  assert.strictEqual(presentation.settings.disableVisible, true);
  assert.strictEqual(presentation.settings.testVisible, true);
  assert.strictEqual(presentation.toggle.typesDisabled, false);
  assert.strictEqual(presentation.toggle.typeStates.critical, false);
}

{
  const presentation = pushUiPresentation.resolvePushPresentation(buildState(), {
    pushUiRuntime: buildRuntime({
      status: 'supported_but_not_granted',
      permission: 'default',
      supported: true,
      busy: true
    }),
    notifications: buildNotifications({
      lastMessage: 'Temporärer Hinweis'
    }),
    authed: true
  });

  assert.strictEqual(presentation.settings.statusLabel, 'Wird aktualisiert');
  assert.strictEqual(presentation.menuEntry.subtext, 'Wird aktualisiert');
  assert.strictEqual(presentation.toggle.disabled, true);
  assert.strictEqual(presentation.toggle.feedback, 'Temporärer Hinweis', 'explicit notification message should stay visible on the toggle');
}

console.log('push-ui-presentation.test.js passed');
