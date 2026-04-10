# Rewarded Provider Activation

## Modes

- `direct`: Reward-Action wird direkt ausgeführt.
- `debug_rewarded`: Reward wird lokal simuliert.
- `provider_rewarded`: echter Google Ad Placement Provider.

Setze den Modus lokal über `localStorage['gs_reward_provider_mode']`.

## Runtime Config

Der produktive Provider liest primär aus `window.GROWSIM_REWARDED_ADS_CONFIG` oder `window.__GROWSIM_REWARDED_ADS_CONFIG__`.

Beispiel:

```html
<script>
  window.GROWSIM_REWARDED_ADS_CONFIG = {
    enabled: true,
    googleAdClient: 'ca-pub-1234567890123456',
    googleAdmobRewardedSlot: 'ca-app-pub-1234567890123456/1234567890',
    googleTestingMode: true,
    environments: {
      staging: {
        enabled: true,
        googleTestingMode: true
      },
      production: {
        enabled: false
      }
    }
  };
</script>
```

## QA Overrides

Nur für Local/QA gedacht:

- `gs_reward_google_enabled`
- `gs_reward_google_ad_client`
- `gs_reward_google_admob_rewarded_slot`
- `gs_reward_google_admob_interstitial_slot`
- `gs_reward_google_test_mode`
- `gs_reward_google_ads_only`

## Rollout Stages

- `local`: alles lokal testbar
- `staging`: alles testbar, QA sichtbar
- `soft_launch`: vorsichtiger Produktionsstart, sensible Actions bleiben standardmäßig aus
- `production_candidate`: volles Set für Freigabe-Kandidaten

Setzbar über `localStorage['gs_reward_rollout_stage']` oder über die bestehende Reward-Flag-Config.

## Debug

- `window.GrowSimRewardDebug.getSummary()`
- `window.GrowSimRewardDebug.getTelemetry(20)`
- `window.GrowSimRewardDebug.setFlags({ providerModeOverride: 'provider_rewarded' })`

Wenn Konfiguration fehlt oder ungültig ist, bleibt der Provider ruhig auf `unavailable` und der bestehende Fallback-/Reject-Flow übernimmt.
