'use strict';

(function attachPushUiPresentation(globalScope) {
  const TEXT = Object.freeze({
    support: Object.freeze({
      supported: 'Ja',
      unsupported: 'Nein'
    }),
    permission: Object.freeze({
      granted: 'Erlaubt',
      denied: 'Im Browser/System aus',
      default: 'Nicht entschieden',
      unsupported: 'Nicht unterstützt'
    }),
    status: Object.freeze({
      active: 'Aktiv',
      inactive: 'Nicht aktiviert',
      loading: 'Wird aktualisiert',
      denied: 'Im Browser/System aus',
      unsupported: 'Nicht verfügbar',
      missingPermission: 'Berechtigung fehlt'
    }),
    feedback: Object.freeze({
      loading: 'Push-Status wird aktualisiert.',
      unsupported: 'Erinnerungen sind in diesem Browser aktuell nicht verfuegbar.',
      denied: 'Im Browser oder System aus. Lokales Spielen bleibt möglich.',
      inactive: 'Erinnerungen sind optional. Du kannst sie spaeter aktivieren, wenn du Hinweise zu wichtigen Momenten moechtest.',
      active: 'Erinnerungen sind aktiv. Du bekommst Hinweise zu wichtigen Gameplay-Ereignissen.',
      unauthenticated: 'Erinnerungen mit Cloud-Bezug brauchen ein Konto. Dein lokaler Run bleibt spielbar.',
      localOnly: 'Erinnerungen sind lokal vorgemerkt. Cloud-Verknuepfung ist optional.'
    }),
    action: Object.freeze({
      enabled: 'Erinnerungen aktiviert.',
      disabled: 'Erinnerungen deaktiviert.',
      unsupported: 'Erinnerungen sind in diesem Browser aktuell nicht verfuegbar.',
      permissionDenied: 'Erinnerungen sind im Browser oder System ausgeschaltet.',
      reloadRequired: 'Bitte einmal neu laden, damit Erinnerungen bereitstehen.',
      statusReadError: 'Status der Erinnerungen konnte nicht gelesen werden.'
    }),
    menu: Object.freeze({
      label: 'Erinnerungen',
      title: 'Oeffnet optionale Erinnerungen und den aktuellen Status.',
      enabledBadge: 'An',
      statusActive: 'Aktiv',
      statusInactive: 'Spaeter aktivierbar',
      statusLoading: 'Wird aktualisiert',
      statusDenied: 'Im Browser/System aus',
      statusUnsupported: 'Nicht verfuegbar',
      statusAccountRequired: 'Konto fuer Cloud-Erinnerungen noetig',
      statusLocalOnly: 'Lokal vorgemerkt'
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

  function resolveTextBundle(overrides = {}) {
    const root = overrides && typeof overrides === 'object' ? overrides : {};
    return {
      support: { ...TEXT.support, ...(root.support && typeof root.support === 'object' ? root.support : {}) },
      permission: { ...TEXT.permission, ...(root.permission && typeof root.permission === 'object' ? root.permission : {}) },
      status: { ...TEXT.status, ...(root.status && typeof root.status === 'object' ? root.status : {}) },
      feedback: { ...TEXT.feedback, ...(root.feedback && typeof root.feedback === 'object' ? root.feedback : {}) },
      action: { ...TEXT.action, ...(root.action && typeof root.action === 'object' ? root.action : {}) },
      menu: { ...TEXT.menu, ...(root.menu && typeof root.menu === 'object' ? root.menu : {}) },
      toggle: { ...TEXT.toggle, ...(root.toggle && typeof root.toggle === 'object' ? root.toggle : {}) },
      sourceMode: { ...TEXT.sourceMode, ...(root.sourceMode && typeof root.sourceMode === 'object' ? root.sourceMode : {}) }
    };
  }

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

  function mapPermissionLabel(permission, text = TEXT) {
    const value = String(permission || 'unsupported');
    if (value === 'granted') {
      return text.permission.granted;
    }
    if (value === 'denied') {
      return text.permission.denied;
    }
    if (value === 'default') {
      return text.permission.default;
    }
    return text.permission.unsupported;
  }

  function mapStatusLabel(statusCode, busy, text = TEXT) {
    if (busy === true) {
      return text.status.loading;
    }
    const status = String(statusCode || 'unsupported');
    if (status === 'granted_subscribed') {
      return text.status.active;
    }
    if (status === 'denied') {
      return text.status.denied;
    }
    if (status === 'unsupported') {
      return text.status.unsupported;
    }
    if (status === 'supported_but_not_granted') {
      return text.status.missingPermission;
    }
    return text.status.inactive;
  }

  function isPushActive(statusCode) {
    return String(statusCode || '') === 'granted_subscribed';
  }

  function resolveFeedback(runtime, options = {}, text = TEXT) {
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
        hintTone: runtimeMessage === text.feedback.localOnly ? 'warning' : 'neutral'
      };
    }

    if (runtime.busy === true) {
      return {
        message: text.feedback.loading,
        hintTone: 'neutral'
      };
    }

    if (runtime.supported !== true || String(runtime.status || '') === 'unsupported') {
      return {
        message: text.feedback.unsupported,
        hintTone: 'warning'
      };
    }

    if (String(runtime.permission || '') === 'denied' || String(runtime.status || '') === 'denied') {
      return {
        message: text.feedback.denied,
        hintTone: 'warning'
      };
    }

    if (!authed) {
      return {
        message: text.feedback.unauthenticated,
        hintTone: 'neutral'
      };
    }

    if (isPushActive(runtime.status)) {
      return {
        message: text.feedback.active,
        hintTone: 'positive'
      };
    }

    return {
      message: text.feedback.inactive,
      hintTone: 'neutral'
    };
  }

  function resolveMenuStatus(runtime, options = {}, text = TEXT) {
    const authed = options.authed === true;
    if (runtime.busy === true) {
      return text.menu.statusLoading;
    }

    if (runtime.supported !== true || String(runtime.status || '') === 'unsupported') {
      return text.menu.statusUnsupported;
    }

    if (String(runtime.permission || '') === 'denied' || String(runtime.status || '') === 'denied') {
      return text.menu.statusDenied;
    }

    if (String(runtime.message || '').trim() === text.feedback.localOnly) {
      return text.menu.statusLocalOnly;
    }

    if (!authed) {
      return text.menu.statusAccountRequired;
    }

    if (isPushActive(runtime.status)) {
      return text.menu.statusActive;
    }

    return text.menu.statusInactive;
  }

  function resolvePushPresentation(_sourceState, runtimeCtx = {}) {
    const text = resolveTextBundle(runtimeCtx.translations);
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
    }, { authed }, text);
    const menuStatus = resolveMenuStatus({
      ...runtime,
      supported,
      permission,
      status: statusCode,
      busy
    }, { authed }, text);
    const toggleFeedback = String(runtime.error || runtime.message || notifications.lastMessage || feedback.message || '').trim();
    const notificationsTypes = notifications.types && typeof notifications.types === 'object'
      ? notifications.types
      : {};

    const menuEntry = buildPresentation({
      label: text.menu.label,
      subtext: menuStatus,
      title: text.menu.title,
      disabled: busy || !supported,
      disabledReason: !supported ? 'unsupported' : (busy ? 'busy' : ''),
      badge: enabled ? text.menu.enabledBadge : null,
      hintTone: feedback.hintTone,
      sourceMode: text.sourceMode.push
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
        buttonLabel: enabled ? text.toggle.enabled : text.toggle.disabled,
        statusLabel: enabled ? text.toggle.statusEnabled : text.toggle.statusDisabled,
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
        supportLabel: supported ? text.support.supported : text.support.unsupported,
        permissionLabel: mapPermissionLabel(permission, text),
        statusLabel: mapStatusLabel(statusCode, busy, text),
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
    resolveTextBundle,
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
