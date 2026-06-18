'use strict';

(function attachMenuUiPresentation(globalScope) {
  const TEXT = Object.freeze({
    rescue: Object.freeze({
      label: 'Notfallrettung',
      menuTitle: 'Einmalige Hilfe für kritische Situationen im aktiven Run.',
      overlayTitle: 'Einmalige Hilfe für kritische Situationen im aktiven Run.',
      readySubtext: '1× pro Run bei kritischem Zustand.',
      pending: 'Notfallrettung wird gerade vorbereitet.',
      used: 'Rettungsaktion ist nur 1× pro Run verfügbar.',
      notRequired: 'Notfallrettung ist aktuell nicht erforderlich.',
      appliedStable: 'Rettungsaktion angewendet. Die Pflanze stabilisiert sich.',
      appliedRevived: 'Notfallrettung angewendet. Der Run wurde knapp gerettet.',
      unavailable: 'Notfallrettung ist aktuell nicht verfügbar.'
    }),
    reward: Object.freeze({
      direct: 'Lokale Komfortaktion bereit.',
      debug: 'Optionale Komfortaktion bereit.',
      preparing: 'Optionale Belohnung wird vorbereitet.',
      error: 'Optionale Belohnung ist gerade nicht bereit.',
      unavailable: 'Optionale Belohnung ist gerade nicht verfügbar.',
      ready: 'Optionale Belohnung ist verfügbar.'
    }),
    menu: Object.freeze({
      statsTitle: 'Öffnet Analyse, Verlauf und Run-Statistik.',
      supportTitle: 'Öffnet freiwilligen Support für GrowSim.',
      supportSubtext: 'Freiwilliger Support',
      missionsTitle: 'Öffnet Missionen und den aktuellen Fortschritt.',
      missionsSubtext: 'Tagesziele & Fortschritt',
      aboutTitle: 'Erklärt lokalen Start, optionale Cloud-Funktionen und den aktuellen Produktstand.',
      aboutSubtext: 'Lokaler Start & Cloud',
      languageTitle: 'Öffnet Tempo, Sprache, Cloud und Erinnerungen.',
      languageSubtext: 'Tempo, Sprache, Cloud',
      achievementsTitle: 'Aktuell nicht verfügbar.',
      leaderboardTitle: 'Leaderboard nutzt verifizierte Ergebnisse. Lokales Spielen bleibt ohne Login möglich.',
      leaderboardSubtext: 'Verifizierte Ergebnisse mit Konto',
      pushEnabled: 'Aktiviert',
      pushDisabled: 'Optional aus'
    })
  });

  function getRescueMeta(sourceState) {
    const root = sourceState && typeof sourceState === 'object' ? sourceState : {};
    const meta = root.meta && typeof root.meta === 'object' ? root.meta : {};
    return meta.rescue && typeof meta.rescue === 'object' ? meta.rescue : {};
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
      sourceMode: String(overrides.sourceMode || '')
    };
  }

  function resolveRewardPresentation(_sourceState, runtimeCtx = {}) {
    const rewardControl = runtimeCtx.rewardControl && typeof runtimeCtx.rewardControl === 'object'
      ? runtimeCtx.rewardControl
      : {};
    const providerStatus = rewardControl.providerStatus && typeof rewardControl.providerStatus === 'object'
      ? rewardControl.providerStatus
      : {};
    const sourceMode = String(
      runtimeCtx.sourceMode
      || rewardControl.providerMode
      || rewardControl.grantMode
      || providerStatus.mode
      || 'direct'
    ).trim().toLowerCase() || 'direct';
    const providerState = String(providerStatus.state || '').trim().toLowerCase();
    const rewardHint = String(rewardControl.hint || '').trim();

    let subtext = rewardHint;
    let hintTone = 'neutral';
    if (!subtext) {
      if (sourceMode === 'debug_rewarded') {
        subtext = TEXT.reward.debug;
      } else if (sourceMode === 'provider_rewarded' && providerState === 'initializing') {
        subtext = TEXT.reward.preparing;
      } else if (sourceMode === 'provider_rewarded' && providerState === 'error') {
        subtext = TEXT.reward.error;
        hintTone = 'warning';
      } else if (sourceMode === 'provider_rewarded' && rewardControl.disabled === true) {
        subtext = TEXT.reward.unavailable;
        hintTone = 'warning';
      } else if (sourceMode === 'provider_rewarded') {
        subtext = TEXT.reward.ready;
        hintTone = 'positive';
      } else {
        subtext = TEXT.reward.direct;
      }
    }

    return buildPresentation({
      label: 'Reward',
      subtext,
      title: subtext,
      disabled: rewardControl.disabled === true,
      disabledReason: String(rewardControl.reason || providerState || ''),
      badge: sourceMode === 'provider_rewarded' ? 'Optional' : 'Lokal',
      hintTone,
      sourceMode
    });
  }

  function resolveRescuePresentation(sourceState, runtimeCtx = {}) {
    const rescueMeta = runtimeCtx.rescueMeta && typeof runtimeCtx.rescueMeta === 'object'
      ? runtimeCtx.rescueMeta
      : getRescueMeta(sourceState);
    const rewardControl = runtimeCtx.rewardControl && typeof runtimeCtx.rewardControl === 'object'
      ? runtimeCtx.rewardControl
      : {};
    const rewardPresentation = runtimeCtx.rewardPresentation && typeof runtimeCtx.rewardPresentation === 'object'
      ? runtimeCtx.rewardPresentation
      : resolveRewardPresentation(sourceState, { rewardControl });
    const context = String(runtimeCtx.context || 'menu').trim().toLowerCase();
    const pending = runtimeCtx.pending === true;
    const used = rescueMeta.used === true;
    const lastResult = typeof rescueMeta.lastResult === 'string' ? rescueMeta.lastResult.trim() : '';
    const baseTitle = context === 'death_overlay' ? TEXT.rescue.overlayTitle : TEXT.rescue.menuTitle;

    if (pending) {
      return buildPresentation({
        label: TEXT.rescue.label,
        subtext: TEXT.rescue.pending,
        title: TEXT.rescue.pending,
        disabled: true,
        disabledReason: 'pending',
        badge: 'Aktiv',
        hintTone: 'warning',
        sourceMode: rewardPresentation.sourceMode
      });
    }

    if (used) {
      return buildPresentation({
        label: TEXT.rescue.label,
        subtext: lastResult || TEXT.rescue.used,
        title: lastResult || TEXT.rescue.used,
        disabled: true,
        disabledReason: 'already_used',
        badge: 'Verbraucht',
        hintTone: 'warning',
        sourceMode: rewardPresentation.sourceMode
      });
    }

    if (lastResult) {
      return buildPresentation({
        label: TEXT.rescue.label,
        subtext: lastResult,
        title: baseTitle,
        disabled: rewardControl.disabled === true,
        disabledReason: String(rewardControl.reason || ''),
        badge: rewardPresentation.badge,
        hintTone: normalizeHintTone(rewardPresentation.hintTone),
        sourceMode: rewardPresentation.sourceMode
      });
    }

    const fallbackHint = String(rewardControl.hint || '').trim();
    const availabilityHint = rewardControl.availability && typeof rewardControl.availability === 'object'
      ? String(rewardControl.availability.hint || '').trim()
      : '';
    const providerOnlyReasons = new Set([
      'provider_disabled',
      'provider_unavailable',
      'provider_initializing',
      'provider_error',
      'missing_client',
      'reward_action_disabled'
    ]);
    const disabledHint = providerOnlyReasons.has(String(rewardControl.reason || '').trim())
      ? (fallbackHint || availabilityHint)
      : (availabilityHint || fallbackHint);
    return buildPresentation({
      label: TEXT.rescue.label,
      subtext: rewardControl.disabled === true
        ? (disabledHint || TEXT.rescue.unavailable)
        : TEXT.rescue.readySubtext,
      title: baseTitle,
      disabled: rewardControl.disabled === true,
      disabledReason: String(rewardControl.reason || ''),
      badge: rewardPresentation.badge,
      hintTone: rewardControl.disabled === true ? normalizeHintTone(rewardPresentation.hintTone) : 'neutral',
      sourceMode: rewardPresentation.sourceMode
    });
  }

  function resolveMenuPresentation(sourceState, runtimeCtx = {}) {
    const rescue = resolveRescuePresentation(sourceState, {
      ...runtimeCtx,
      context: 'menu'
    });
    const pushApi = globalScope.GrowSimPushUiPresentation;
    const pushPresentation = pushApi && typeof pushApi.resolvePushPresentation === 'function'
      ? pushApi.resolvePushPresentation(sourceState, {
        pushUiRuntime: runtimeCtx.pushUiRuntime,
        pushEnabled: runtimeCtx.pushEnabled === true,
        notifications: runtimeCtx.notifications,
        authed: runtimeCtx.authed === true,
        translations: runtimeCtx.pushTranslations
      })
      : null;

    return {
      ...buildPresentation({
        label: 'Menü',
        subtext: 'GrowSim',
        title: 'GrowSim-Menü',
        disabled: false,
        disabledReason: '',
        badge: null,
        hintTone: 'neutral',
        sourceMode: 'menu'
      }),
      entries: Object.freeze({
        rescue,
        push: pushPresentation && pushPresentation.menuEntry
          ? pushPresentation.menuEntry
          : buildPresentation({
            label: 'Benachrichtigungen',
            subtext: TEXT.menu.pushDisabled,
            title: TEXT.menu.pushDisabled,
            disabled: false,
            disabledReason: '',
            badge: null,
            hintTone: 'neutral',
            sourceMode: 'push'
          }),
        stats: buildPresentation({
          label: 'Analyse',
          subtext: 'Report & Run-Statistik',
          title: TEXT.menu.statsTitle,
          disabled: false,
          disabledReason: '',
          badge: null,
          hintTone: 'neutral',
          sourceMode: 'menu'
        }),
        support: buildPresentation({
          label: 'GrowSim unterstützen',
          subtext: TEXT.menu.supportSubtext,
          title: TEXT.menu.supportTitle,
          disabled: false,
          disabledReason: '',
          badge: null,
          hintTone: 'neutral',
          sourceMode: 'menu'
        }),
        missions: buildPresentation({
          label: 'Missionen',
          subtext: TEXT.menu.missionsSubtext,
          title: TEXT.menu.missionsTitle,
          disabled: false,
          disabledReason: '',
          badge: null,
          hintTone: 'neutral',
          sourceMode: 'menu'
        }),
        about: buildPresentation({
          label: 'Projektinfo',
          subtext: TEXT.menu.aboutSubtext,
          title: TEXT.menu.aboutTitle,
          disabled: false,
          disabledReason: '',
          badge: null,
          hintTone: 'neutral',
          sourceMode: 'menu'
        }),
        language: buildPresentation({
          label: 'Einstellungen',
          subtext: TEXT.menu.languageSubtext,
          title: TEXT.menu.languageTitle,
          disabled: false,
          disabledReason: '',
          badge: null,
          hintTone: 'neutral',
          sourceMode: 'menu'
        }),
        achievements: buildPresentation({
          label: 'Home',
          subtext: '',
          title: TEXT.menu.achievementsTitle,
          disabled: true,
          disabledReason: 'not_available',
          badge: null,
          hintTone: 'neutral',
          sourceMode: 'menu'
        }),
        leaderboard: buildPresentation({
          label: 'Leaderboard',
          subtext: TEXT.menu.leaderboardSubtext,
          title: TEXT.menu.leaderboardTitle,
          disabled: false,
          disabledReason: '',
          badge: null,
          hintTone: 'neutral',
          sourceMode: 'menu'
        })
      })
    };
  }

  const api = Object.freeze({
    TEXT,
    resolveMenuPresentation,
    resolveRescuePresentation,
    resolveRewardPresentation
  });

  globalScope.GrowSimMenuUiPresentation = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
