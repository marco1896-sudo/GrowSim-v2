(function initGrowSimGoogleAdPlacementRewardProvider(global) {
  'use strict';

  if (!global || typeof global !== 'object') {
    return;
  }

  const PROVIDER_ID = 'google_ad_placement';
  const SDK_SCRIPT_ID = 'gs-google-ad-placement-sdk';
  const SDK_SRC_BASE = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
  const DEFAULT_READY_TIMEOUT_MS = 6500;
  const DEFAULT_REQUEST_TIMEOUT_MS = 90000;
  const AD_CLIENT_PATTERN = /^ca-pub-\d{10,}$/;
  const ADMOB_SLOT_PATTERN = /^ca-app-pub-\d{10,}\/\d{6,}$/;

  const runtime = {
    state: 'unavailable',
    reason: 'provider_disabled',
    available: false,
    canRequestReward: false,
    initialized: false,
    scriptRequested: false,
    apiConfigured: false,
    initPromise: null,
    requestPending: false,
    lastError: '',
    lastPlacementInfo: null,
    readyAtMs: 0,
    lastConfigSummary: null,
    lastValidation: null,
    lastEnvironment: 'local'
  };

  function readStorageValue(key) {
    try {
      if (typeof global.localStorage === 'undefined') {
        return '';
      }
      return String(global.localStorage.getItem(key) || '').trim();
    } catch (_error) {
      return '';
    }
  }

  function normalizeBoolean(value, fallback) {
    if (typeof value === 'boolean') {
      return value;
    }
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'on' || normalized === 'yes') {
      return true;
    }
    if (normalized === 'false' || normalized === '0' || normalized === 'off' || normalized === 'no') {
      return false;
    }
    return fallback;
  }

  function clampMs(value, fallback, min, max) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return fallback;
    }
    return Math.min(max, Math.max(min, Math.round(numeric)));
  }

  function mergeConfig(baseConfig, overrideConfig) {
    const base = baseConfig && typeof baseConfig === 'object' ? baseConfig : {};
    const override = overrideConfig && typeof overrideConfig === 'object' ? overrideConfig : {};
    return {
      ...base,
      ...override
    };
  }

  function getHostname() {
    try {
      return String(global.location && global.location.hostname || '').trim().toLowerCase();
    } catch (_error) {
      return '';
    }
  }

  function detectEnvironmentName() {
    const explicit = String(
      global.__GROWSIM_ENV__
      || (global.GrowSimBuild && global.GrowSimBuild.environment)
      || ''
    ).trim().toLowerCase();
    if (explicit === 'local' || explicit === 'staging' || explicit === 'production') {
      return explicit;
    }

    const hostname = getHostname();
    if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local')) {
      return 'local';
    }
    if (
      hostname.includes('staging')
      || hostname.includes('preview')
      || hostname.includes('test')
      || hostname.includes('qa')
      || hostname.includes('dev')
    ) {
      return 'staging';
    }
    return 'production';
  }

  function getRuntimeConfigRoot() {
    if (global.GROWSIM_REWARDED_ADS_CONFIG && typeof global.GROWSIM_REWARDED_ADS_CONFIG === 'object') {
      return global.GROWSIM_REWARDED_ADS_CONFIG;
    }
    if (global.__GROWSIM_REWARDED_ADS_CONFIG__ && typeof global.__GROWSIM_REWARDED_ADS_CONFIG__ === 'object') {
      return global.__GROWSIM_REWARDED_ADS_CONFIG__;
    }
    return {};
  }

  function getEnvironmentRuntimeConfig(rootConfig, environment) {
    const safeRoot = rootConfig && typeof rootConfig === 'object' ? rootConfig : {};
    const envConfigs = safeRoot.environments && typeof safeRoot.environments === 'object'
      ? safeRoot.environments
      : {};
    const envConfig = envConfigs[environment] && typeof envConfigs[environment] === 'object'
      ? envConfigs[environment]
      : {};
    return mergeConfig(safeRoot, envConfig);
  }

  function pickStorageConfig(environment, allowQaOverrides) {
    const canUseStorage = environment === 'local' || allowQaOverrides === true;
    if (!canUseStorage) {
      return {};
    }
    return {
      googleAdClient: readStorageValue('gs_reward_google_ad_client'),
      googleAdmobRewardedSlot: readStorageValue('gs_reward_google_admob_rewarded_slot'),
      googleAdmobInterstitialSlot: readStorageValue('gs_reward_google_admob_interstitial_slot'),
      googleAdmobAdsOnly: readStorageValue('gs_reward_google_ads_only'),
      googleTestingMode: readStorageValue('gs_reward_google_test_mode'),
      enabled: readStorageValue('gs_reward_google_enabled'),
      requestTimeoutMs: readStorageValue('gs_reward_google_request_timeout_ms'),
      readyTimeoutMs: readStorageValue('gs_reward_google_ready_timeout_ms')
    };
  }

  function resolveProviderConfig() {
    const environment = detectEnvironmentName();
    const rootConfig = getRuntimeConfigRoot();
    const runtimeConfig = getEnvironmentRuntimeConfig(rootConfig, environment);
    const allowQaOverrides = normalizeBoolean(runtimeConfig.allowQaOverrides, environment === 'local');
    const storageConfig = pickStorageConfig(environment, allowQaOverrides);
    const mergedConfig = mergeConfig(runtimeConfig, storageConfig);
    const explicitEnabled = normalizeBoolean(
      mergedConfig.enabled !== undefined ? mergedConfig.enabled : mergedConfig.providerEnabled,
      environment !== 'local' ? false : Boolean(mergedConfig.googleAdClient || mergedConfig.adClient)
    );

    const resolved = {
      providerId: PROVIDER_ID,
      environment,
      source: Object.keys(runtimeConfig).length ? 'runtime_config' : (Object.keys(storageConfig).length ? 'qa_storage' : 'defaults'),
      allowQaOverrides,
      enabled: explicitEnabled,
      client: String(mergedConfig.googleAdClient || mergedConfig.adClient || '').trim(),
      rewardedSlot: String(mergedConfig.googleAdmobRewardedSlot || mergedConfig.admobRewardedSlot || '').trim(),
      interstitialSlot: String(mergedConfig.googleAdmobInterstitialSlot || mergedConfig.admobInterstitialSlot || '').trim(),
      adsOnly: normalizeBoolean(mergedConfig.googleAdmobAdsOnly, false),
      testing: normalizeBoolean(mergedConfig.googleTestingMode, environment !== 'production'),
      preloadAdBreaks: String(mergedConfig.preloadAdBreaks || 'on').trim().toLowerCase() === 'auto' ? 'auto' : 'on',
      sound: String(mergedConfig.sound || 'on').trim().toLowerCase() === 'off' ? 'off' : 'on',
      readyTimeoutMs: clampMs(mergedConfig.readyTimeoutMs, DEFAULT_READY_TIMEOUT_MS, 1000, 20000),
      requestTimeoutMs: clampMs(mergedConfig.requestTimeoutMs, DEFAULT_REQUEST_TIMEOUT_MS, 3000, 180000)
    };

    return resolved;
  }

  function validateRewardProviderConfig(configInput) {
    const config = configInput && typeof configInput === 'object' ? configInput : resolveProviderConfig();
    const issues = [];
    const environment = String(config.environment || 'local');

    if (!global.document || !global.document.head) {
      issues.push({
        severity: 'error',
        code: 'unsupported_runtime',
        message: 'Document/Head ist für den Rewarded-Provider nicht verfügbar.'
      });
    }

    try {
      if (global.location && global.location.protocol === 'file:') {
        issues.push({
          severity: 'warning',
          code: 'file_protocol',
          message: 'Rewarded Ads sollten nicht unter file:// getestet werden.'
        });
      }
    } catch (_error) {
      // ignore location access issues
    }

    if (!config.enabled) {
      issues.push({
        severity: 'warning',
        code: 'provider_disabled',
        message: environment === 'local'
          ? 'Produktiver Rewarded-Provider ist lokal standardmäßig deaktiviert.'
          : 'Produktiver Rewarded-Provider ist für diese Umgebung noch nicht aktiviert.'
      });
    }

    if (config.enabled && !config.client) {
      issues.push({
        severity: 'error',
        code: 'missing_client',
        message: 'Google Ad Client fehlt.'
      });
    }

    if (config.client && !AD_CLIENT_PATTERN.test(config.client)) {
      issues.push({
        severity: 'error',
        code: 'invalid_client_format',
        message: 'Google Ad Client hat kein gültiges ca-pub-Format.'
      });
    }

    if (config.rewardedSlot && !ADMOB_SLOT_PATTERN.test(config.rewardedSlot)) {
      issues.push({
        severity: 'warning',
        code: 'invalid_rewarded_slot_format',
        message: 'Rewarded Slot hat kein gültiges ca-app-pub-Format.'
      });
    }

    if (config.interstitialSlot && !ADMOB_SLOT_PATTERN.test(config.interstitialSlot)) {
      issues.push({
        severity: 'warning',
        code: 'invalid_interstitial_slot_format',
        message: 'Interstitial Slot hat kein gültiges ca-app-pub-Format.'
      });
    }

    if (config.enabled && environment === 'production' && config.testing === true) {
      issues.push({
        severity: 'warning',
        code: 'production_testing_mode',
        message: 'Production ist aktiv, aber der Provider läuft noch im Testmodus.'
      });
    }

    if (config.enabled && !config.rewardedSlot && environment !== 'local') {
      issues.push({
        severity: 'warning',
        code: 'missing_rewarded_slot',
        message: 'Kein Rewarded Slot konfiguriert. Webviews mit AdMob-Inventar profitieren von einem expliziten Slot.'
      });
    }

    const errors = issues.filter((issue) => issue.severity === 'error');
    const warnings = issues.filter((issue) => issue.severity !== 'error');
    const primaryIssue = errors[0] || warnings[0] || null;

    return {
      ok: errors.length === 0,
      issues,
      errors,
      warnings,
      primaryReason: primaryIssue ? primaryIssue.code : 'config_valid',
      primaryMessage: primaryIssue ? primaryIssue.message : 'Rewarded-Provider ist sauber konfiguriert.'
    };
  }

  function buildScriptSrc(config) {
    return `${SDK_SRC_BASE}?client=${encodeURIComponent(config.client)}`;
  }

  function buildConfigSummary(config, validation) {
    const safeValidation = validation && typeof validation === 'object' ? validation : validateRewardProviderConfig(config);
    return {
      providerId: PROVIDER_ID,
      environment: String(config.environment || 'local'),
      source: String(config.source || 'defaults'),
      enabled: config.enabled === true,
      allowQaOverrides: config.allowQaOverrides === true,
      hasClientConfig: Boolean(config.client),
      hasRewardedSlot: Boolean(config.rewardedSlot),
      hasInterstitialSlot: Boolean(config.interstitialSlot),
      testing: config.testing === true,
      adsOnly: config.adsOnly === true,
      preloadAdBreaks: String(config.preloadAdBreaks || 'on'),
      validation: safeValidation
    };
  }

  function setRuntimeStatus(nextState, reason, extras) {
    const extraState = extras && typeof extras === 'object' ? extras : {};
    runtime.state = String(nextState || runtime.state || 'unavailable');
    runtime.reason = String(reason || runtime.reason || '');
    runtime.available = Boolean(extraState.available);
    runtime.canRequestReward = Boolean(extraState.canRequestReward);
    runtime.lastError = String(extraState.lastError || '');
    runtime.lastConfigSummary = extraState.configSummary || runtime.lastConfigSummary;
    runtime.lastValidation = extraState.validation || runtime.lastValidation;
    runtime.lastEnvironment = String(extraState.environment || runtime.lastEnvironment || 'local');
    if (Object.prototype.hasOwnProperty.call(extraState, 'lastPlacementInfo')) {
      runtime.lastPlacementInfo = extraState.lastPlacementInfo;
    }
    if (runtime.state === 'ready') {
      runtime.readyAtMs = Date.now();
    }
  }

  function bootstrapApiGlobals() {
    global.adsbygoogle = global.adsbygoogle || [];
    if (typeof global.adBreak !== 'function') {
      global.adBreak = function adBreakProxy(config) {
        global.adsbygoogle.push(config);
      };
    }
    if (typeof global.adConfig !== 'function') {
      global.adConfig = function adConfigProxy(config) {
        global.adsbygoogle.push(config);
      };
    }
  }

  function getExistingSdkScript() {
    return global.document ? global.document.getElementById(SDK_SCRIPT_ID) : null;
  }

  function ensureSdkScript(config) {
    if (!global.document || !global.document.head) {
      return Promise.reject(new Error('unsupported_runtime'));
    }

    const existingScript = getExistingSdkScript();
    if (existingScript) {
      return Promise.resolve(existingScript);
    }

    return new Promise((resolve, reject) => {
      const script = global.document.createElement('script');
      script.id = SDK_SCRIPT_ID;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.src = buildScriptSrc(config);
      if (config.testing) {
        script.setAttribute('data-adbreak-test', 'on');
      }
      if (config.rewardedSlot) {
        script.setAttribute('data-admob-rewarded-slot', config.rewardedSlot);
      }
      if (config.interstitialSlot) {
        script.setAttribute('data-admob-interstitial-slot', config.interstitialSlot);
      }
      if (config.adsOnly) {
        script.setAttribute('data-admob-ads-only', 'on');
      }
      script.onload = () => resolve(script);
      script.onerror = () => reject(new Error('sdk_load_failed'));
      global.document.head.appendChild(script);
    });
  }

  function configureApi(config) {
    if (runtime.apiConfigured) {
      return;
    }
    bootstrapApiGlobals();
    runtime.apiConfigured = true;
    try {
      global.adConfig({
        preloadAdBreaks: config.preloadAdBreaks,
        sound: config.sound,
        onReady: function onRewardProviderReady() {
          setRuntimeStatus('ready', 'provider_ready', {
            available: true,
            canRequestReward: true,
            environment: config.environment,
            configSummary: buildConfigSummary(config),
            validation: validateRewardProviderConfig(config),
            lastError: ''
          });
        }
      });
    } catch (error) {
      runtime.apiConfigured = false;
      setRuntimeStatus('error', 'provider_error', {
        available: false,
        canRequestReward: false,
        environment: config.environment,
        configSummary: buildConfigSummary(config),
        validation: validateRewardProviderConfig(config),
        lastError: error && error.message ? String(error.message) : 'provider_error'
      });
      throw error;
    }
  }

  function waitUntilReady(timeoutMs, config) {
    const startedAtMs = Date.now();
    return new Promise((resolve) => {
      function tick() {
        if (runtime.state === 'ready') {
          resolve(getStatus());
          return;
        }
        if (runtime.state === 'error' || runtime.state === 'unavailable') {
          resolve(getStatus());
          return;
        }
        if ((Date.now() - startedAtMs) >= timeoutMs) {
          setRuntimeStatus('error', 'provider_not_ready', {
            available: false,
            canRequestReward: false,
            environment: config.environment,
            configSummary: buildConfigSummary(config),
            validation: validateRewardProviderConfig(config),
            lastError: 'provider_not_ready'
          });
          resolve(getStatus());
          return;
        }
        global.setTimeout(tick, 120);
      }
      tick();
    });
  }

  async function ensureReady() {
    const config = resolveProviderConfig();
    const validation = validateRewardProviderConfig(config);
    const configSummary = buildConfigSummary(config, validation);

    if (!config.enabled) {
      setRuntimeStatus('unavailable', 'provider_disabled', {
        available: false,
        canRequestReward: false,
        environment: config.environment,
        configSummary,
        validation,
        lastError: ''
      });
      return getStatus();
    }

    if (!validation.ok) {
      setRuntimeStatus('unavailable', validation.primaryReason, {
        available: false,
        canRequestReward: false,
        environment: config.environment,
        configSummary,
        validation,
        lastError: validation.primaryReason
      });
      return getStatus();
    }

    if (runtime.state === 'ready' && runtime.available) {
      setRuntimeStatus('ready', 'provider_ready', {
        available: true,
        canRequestReward: true,
        environment: config.environment,
        configSummary,
        validation,
        lastError: ''
      });
      return getStatus();
    }

    if (runtime.initPromise) {
      return runtime.initPromise;
    }

    setRuntimeStatus('initializing', 'sdk_loading', {
      available: false,
      canRequestReward: false,
      environment: config.environment,
      configSummary,
      validation,
      lastError: ''
    });
    runtime.scriptRequested = true;
    runtime.initPromise = ensureSdkScript(config)
      .then(() => {
        runtime.initialized = true;
        configureApi(config);
        return waitUntilReady(config.readyTimeoutMs, config);
      })
      .catch((error) => {
        setRuntimeStatus('error', 'provider_error', {
          available: false,
          canRequestReward: false,
          environment: config.environment,
          configSummary,
          validation,
          lastError: error && error.message ? String(error.message) : 'provider_error'
        });
        return getStatus();
      })
      .finally(() => {
        runtime.initPromise = null;
      });

    return runtime.initPromise;
  }

  function mapBreakStatusToReason(breakStatus) {
    const safeStatus = String(breakStatus || '').trim();
    if (safeStatus === 'viewed') {
      return 'reward_granted';
    }
    if (safeStatus === 'dismissed' || safeStatus === 'ignored') {
      return 'reward_not_earned';
    }
    if (safeStatus === 'notReady' || safeStatus === 'noAdPreloaded' || safeStatus === 'frequencyCapped' || safeStatus === 'other') {
      return 'provider_unavailable';
    }
    if (safeStatus === 'timeout' || safeStatus === 'invalid') {
      return 'provider_error';
    }
    if (safeStatus === 'error') {
      return 'reward_error';
    }
    return 'provider_unavailable';
  }

  function setRewardOverlayActive(active) {
    if (!global.document || !global.document.documentElement || !global.document.body) {
      return;
    }
    global.document.documentElement.toggleAttribute('data-reward-ad-active', Boolean(active));
    global.document.body.classList.toggle('reward-ad-active', Boolean(active));
  }

  function buildPlacementName(type, payload) {
    const actionType = String(type || 'reward_action').trim().toLowerCase() || 'reward_action';
    const source = payload && payload.source ? String(payload.source).trim().toLowerCase() : '';
    return source ? `${actionType}_${source}` : actionType;
  }

  async function requestRewardGrant(request = {}) {
    const actionType = String(request.type || '').trim().toLowerCase();
    const payload = request.payload && typeof request.payload === 'object' ? request.payload : {};
    const config = resolveProviderConfig();
    const status = await ensureReady();
    if (status.state !== 'ready' || !status.available) {
      return {
        ok: false,
        type: actionType,
        reason: String(status.reason || 'provider_unavailable'),
        mode: 'provider_rewarded',
        providerName: PROVIDER_ID,
        providerState: status.state
      };
    }

    if (runtime.requestPending) {
      return {
        ok: false,
        type: actionType,
        reason: 'reward_pending',
        mode: 'provider_rewarded',
        providerName: PROVIDER_ID,
        providerState: runtime.state
      };
    }

    if (typeof global.adBreak !== 'function') {
      setRuntimeStatus('error', 'provider_error', {
        available: false,
        canRequestReward: false,
        environment: config.environment,
        configSummary: buildConfigSummary(config),
        validation: validateRewardProviderConfig(config),
        lastError: 'adbreak_missing'
      });
      return {
        ok: false,
        type: actionType,
        reason: 'provider_error',
        mode: 'provider_rewarded',
        providerName: PROVIDER_ID,
        providerState: runtime.state
      };
    }

    runtime.requestPending = true;
    setRewardOverlayActive(true);

    return new Promise((resolve) => {
      let settled = false;
      let rewardEarned = false;
      let rewardDismissed = false;
      let breakInfo = null;
      const requestTimeoutId = global.setTimeout(() => {
        finish({
          ok: false,
          type: actionType,
          reason: 'provider_error',
          mode: 'provider_rewarded',
          providerName: PROVIDER_ID,
          providerState: runtime.state
        });
      }, config.requestTimeoutMs);

      function finish(result) {
        if (settled) {
          return;
        }
        settled = true;
        global.clearTimeout(requestTimeoutId);
        runtime.requestPending = false;
        runtime.lastPlacementInfo = breakInfo;
        setRewardOverlayActive(false);
        resolve(result);
      }

      try {
        global.adBreak({
          type: 'reward',
          name: buildPlacementName(actionType, payload),
          beforeAd: function beforeRewardedAd() {
            setRewardOverlayActive(true);
          },
          afterAd: function afterRewardedAd() {
            setRewardOverlayActive(false);
          },
          beforeReward: function beforeRewardPrompt(showAdFn) {
            if (typeof showAdFn !== 'function') {
              finish({
                ok: false,
                type: actionType,
                reason: 'provider_error',
                mode: 'provider_rewarded',
                providerName: PROVIDER_ID,
                providerState: runtime.state
              });
              return;
            }
            showAdFn();
          },
          adDismissed: function onRewardDismissed() {
            rewardDismissed = true;
          },
          adViewed: function onRewardViewed() {
            rewardEarned = true;
          },
          adBreakDone: function onRewardBreakDone(placementInfo) {
            breakInfo = placementInfo && typeof placementInfo === 'object' ? { ...placementInfo } : null;
            const breakStatus = breakInfo && breakInfo.breakStatus ? String(breakInfo.breakStatus) : '';
            if (rewardEarned || breakStatus === 'viewed') {
              finish({
                ok: true,
                type: actionType,
                reason: 'reward_granted',
                mode: 'provider_rewarded',
                providerName: PROVIDER_ID,
                providerState: runtime.state,
                grantedAtMs: Date.now(),
                placementInfo: breakInfo
              });
              return;
            }
            if (rewardDismissed || breakStatus === 'dismissed') {
              finish({
                ok: false,
                type: actionType,
                reason: 'reward_not_earned',
                mode: 'provider_rewarded',
                providerName: PROVIDER_ID,
                providerState: runtime.state,
                placementInfo: breakInfo
              });
              return;
            }
            finish({
              ok: false,
              type: actionType,
              reason: mapBreakStatusToReason(breakStatus),
              mode: 'provider_rewarded',
              providerName: PROVIDER_ID,
              providerState: runtime.state,
              placementInfo: breakInfo
            });
          }
        });
      } catch (error) {
        setRuntimeStatus('error', 'provider_error', {
          available: false,
          canRequestReward: false,
          environment: config.environment,
          configSummary: buildConfigSummary(config),
          validation: validateRewardProviderConfig(config),
          lastError: error && error.message ? String(error.message) : 'provider_error'
        });
        finish({
          ok: false,
          type: actionType,
          reason: 'reward_error',
          mode: 'provider_rewarded',
          providerName: PROVIDER_ID,
          providerState: runtime.state
        });
      }
    });
  }

  function getStatus() {
    const config = resolveProviderConfig();
    const validation = validateRewardProviderConfig(config);
    const configSummary = buildConfigSummary(config, validation);
    return {
      id: PROVIDER_ID,
      name: PROVIDER_ID,
      state: runtime.state,
      reason: runtime.reason,
      available: runtime.available,
      canRequestReward: runtime.canRequestReward,
      initialized: runtime.initialized,
      readyAtMs: runtime.readyAtMs,
      lastError: runtime.lastError,
      hasClientConfig: Boolean(config.client),
      hasRewardedSlot: Boolean(config.rewardedSlot),
      requestPending: runtime.requestPending,
      lastPlacementInfo: runtime.lastPlacementInfo,
      environment: config.environment,
      configSource: config.source,
      configEnabled: config.enabled === true,
      configSummary,
      validation
    };
  }

  global.GrowSimRewardProvider = Object.freeze({
    id: PROVIDER_ID,
    name: PROVIDER_ID,
    getStatus,
    init: ensureReady,
    requestRewardGrant,
    resolveConfig: resolveProviderConfig,
    validateConfig: validateRewardProviderConfig,
    detectEnvironment: detectEnvironmentName
  });
})(window);
