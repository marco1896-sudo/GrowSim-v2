'use strict';

(function attachPushUiPresentation(globalScope) {
  const TEXT = Object.freeze({
    support: Object.freeze({
      supported: 'Ja',
      unsupported: 'Nein'
    }),
    permission: Object.freeze({
      granted: 'Erlaubt',
      denied: 'Blockiert',
      default: 'Nicht entschieden',
      unsupported: 'Nicht unterstützt'
    }),
    status: Object.freeze({
      active: 'Aktiv',
      inactive: 'Nicht aktiviert',
      loading: 'Wird aktualisiert',
      denied: 'Blockiert',
      unsupported: 'Nicht verfügbar',
      missingPermission: 'Berechtigung fehlt'
    }),
    feedback: Object.freeze({
      loading: 'Push-Status wird aktualisiert.',
      unsupported: 'Dieser Browser unterstützt Push-Benachrichtigungen aktuell nicht.',
      denied: 'Push ist blockiert. Bitte erlaube Benachrichtigungen in deinen Browser- oder OS-Einstellungen.',
      inactive: 'Aktiviere Push-Benachrichtigungen, um wichtige Ereignisse deiner Pflanze nicht zu verpassen.',
      active: 'Push ist aktiv. Du wirst bei wichtigen Gameplay-Ereignissen informiert.',
      unauthenticated: 'Melde dich an, um Push-Benachrichtigungen für deinen Run zu aktivieren.',
      localOnly: 'Push ist lokal aktiv. Für verknüpfte Tests bitte einloggen.'
    }),
    action: Object.freeze({
      enabled: 'Benachrichtigungen aktiviert.',
      disabled: 'Benachrichtigungen deaktiviert.',
      unsupported: 'Benachrichtigungen werden in diesem Browser nicht unterstützt.',
      permissionDenied: 'Berechtigung nicht erteilt. Bitte Benachrichtigungen im Browser erlauben.',
      reloadRequired: 'Service Worker noch nicht aktiv. Bitte einmal normal neu laden.',
      statusReadError: 'Push-Status konnte nicht gelesen werden.'
    }),
    menu: Object.freeze({
      label: 'Benachrichtigungen',
      title: 'Öffnet die Push-Einstellungen und den aktuellen Status.',
      enabledBadge: 'An'
    }),
    toggle: Object.freeze({
      enabled: 'AN',
      disabled: 'AUS',
      statusEnabled: 'Aktiv',
      statusDisabled: 'Deaktiviert'
    }),
    sourceMode: Object.freeze({
      push: 'push'
    })
  });

  function normalizeHintTone(value) {
    const tone = String(value || '').trim().toLowerCase();
    if (tone === 'positive' || tone === 'warning' || tone === 'critical') {
      return tone;
    }
    return 'neutral';
  }

  function buildPresentation(overrides = {}) {
    return {
      label: String(overrides.label || ''),
      subtext: String(overrides.subtext || ''),
      title: String(overrides.title || ''),
      disabled: overrides.disabled === true,
      disabledReason: String(overrides.disabledReason || ''),
      badge: overrides.badge === null || overrides.badge === undefined ? null : String(overrides.badge),
      hintTone: normalizeHintTone(overrides.hintTone),
      sourceMode: String(overrides.sourceMode || TEXT.sourceMode.push)
    };
  }

  function mapPermissionLabel(permission) {
    const value = String(permission || 'unsupported');
    if (value === 'granted') {
      return TEXT.permission.granted;
    }
    if (value === 'denied') {
      return TEXT.permission.denied;
    }
    if (value === 'default') {
      return TEXT.permission.default;
    }
    return TEXT.permission.unsupported;
  }

  function mapStatusLabel(statusCode, busy) {
    if (busy === true) {
      return TEXT.status.loading;
    }
    const status = String(statusCode || 'unsupported');
    if (status === 'granted_subscribed') {
      return TEXT.status.active;
    }
    if (status === 'denied') {
      return TEXT.status.denied;
    }
    if (status === 'unsupported') {
      return TEXT.status.unsupported;
    }
    if (status === 'supported_but_not_granted') {
      return TEXT.status.missingPermission;
    }
    return TEXT.status.inactive;
  }

  function isPushActive(statusCode) {
    return String(statusCode || '') === 'granted_subscribed';
  }

  function resolveFeedback(runtime, options = {}) {
    const authed = options.authed === true;
    const errorMessage = String(runtime.error || '').trim();
    if (errorMessage) {
      return {
        message: errorMessage,
        hintTone: 'warning'
      };
    }

    const runtimeMessage = String(runtime.message || '').trim();
    if (runtimeMessage) {
      return {
        message: runtimeMessage,
        hintTone: runtimeMessage === TEXT.feedback.localOnly ? 'warning' : 'neutral'
      };
    }

    if (runtime.busy === true) {
      return {
        message: TEXT.feedback.loading,
        hintTone: 'neutral'
      };
    }

    if (runtime.supported !== true || String(runtime.status || '') === 'unsupported') {
      return {
        message: TEXT.feedback.unsupported,
        hintTone: 'warning'
      };
    }

    if (String(runtime.permission || '') === 'denied' || String(runtime.status || '') === 'denied') {
      return {
        message: TEXT.feedback.denied,
        hintTone: 'warning'
      };
    }

    if (!authed) {
      return {
        message: TEXT.feedback.unauthenticated,
        hintTone: 'neutral'
      };
    }

    if (isPushActive(runtime.status)) {
      return {
        message: TEXT.feedback.active,
        hintTone: 'positive'
      };
    }

    return {
      message: TEXT.feedback.inactive,
      hintTone: 'neutral'
    };
  }

  function resolvePushPresentation(_sourceState, runtimeCtx = {}) {
    const runtime = runtimeCtx.pushUiRuntime && typeof runtimeCtx.pushUiRuntime === 'object'
      ? runtimeCtx.pushUiRuntime
      : {};
    const notifications = runtimeCtx.notifications && typeof runtimeCtx.notifications === 'object'
      ? runtimeCtx.notifications
      : {};
    const authed = runtimeCtx.authed === true;
    const supported = runtime.supported === true || String(runtime.status || '') !== 'unsupported';
    const permission = String(runtime.permission || (supported ? 'default' : 'unsupported'));
    const statusCode = String(runtime.status || (supported ? 'inactive' : 'unsupported'));
    const busy = runtime.busy === true;
    const enabled = isPushActive(statusCode);
    const feedback = resolveFeedback({
      ...runtime,
      supported,
      permission,
      status: statusCode,
      busy
    }, { authed });
    const toggleFeedback = String(runtime.error || runtime.message || notifications.lastMessage || feedback.message || '').trim();
    const notificationsTypes = notifications.types && typeof notifications.types === 'object'
      ? notifications.types
      : {};

    const menuEntry = buildPresentation({
      label: TEXT.menu.label,
      subtext: feedback.message,
      title: TEXT.menu.title,
      disabled: busy || !supported,
      disabledReason: !supported ? 'unsupported' : (busy ? 'busy' : ''),
      badge: enabled ? TEXT.menu.enabledBadge : null,
      hintTone: feedback.hintTone,
      sourceMode: TEXT.sourceMode.push
    });

    return {
      ...menuEntry,
      statusCode,
      permissionCode: permission,
      supported,
      authed,
      busy,
      active: enabled,
      menuEntry,
      toggle: Object.freeze({
        buttonLabel: enabled ? TEXT.toggle.enabled : TEXT.toggle.disabled,
        statusLabel: enabled ? TEXT.toggle.statusEnabled : TEXT.toggle.statusDisabled,
        feedback: toggleFeedback,
        disabled: busy || !supported,
        disabledReason: !supported ? 'unsupported' : (busy ? 'busy' : ''),
        pressed: enabled,
        typesDisabled: !enabled,
        typeStates: Object.freeze({
          events: notificationsTypes.events === true,
          critical: notificationsTypes.critical === true,
          reminder: notificationsTypes.reminder === true
        })
      }),
      settings: Object.freeze({
        supportLabel: supported ? TEXT.support.supported : TEXT.support.unsupported,
        permissionLabel: mapPermissionLabel(permission),
        statusLabel: mapStatusLabel(statusCode, busy),
        feedback: feedback.message,
        enableVisible: !enabled && permission !== 'denied' && supported,
        enableDisabled: busy || !authed || !supported || permission === 'denied' || enabled,
        disableVisible: enabled,
        disableDisabled: busy || !supported || !enabled,
        testVisible: enabled,
        testDisabled: busy || !authed || !supported || !enabled
      })
    };
  }

  const api = Object.freeze({
    TEXT,
    isPushActive,
    mapPermissionLabel,
    mapStatusLabel,
    resolvePushPresentation
  });

  globalScope.GrowSimPushUiPresentation = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
