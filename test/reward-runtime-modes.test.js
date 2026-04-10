#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const HOST = '0.0.0.0';
const CLIENT_HOST = '127.0.0.1';
const PORT = 4187;
const AUTH_TOKEN_KEY = 'grow-sim-auth-token-v1';

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const byExt = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.webp': 'image/webp'
  };
  return byExt[ext] || 'application/octet-stream';
}

function createStaticServer(rootDir) {
  return http.createServer((req, res) => {
    const requestUrl = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);
    const relativePath = decodeURIComponent(requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname);
    const safeRelativePath = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
    const filePath = path.join(rootDir, safeRelativePath);

    if (!filePath.startsWith(rootDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        res.writeHead(error.code === 'ENOENT' ? 404 : 500);
        res.end(error.code === 'ENOENT' ? 'Not found' : 'Internal server error');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentTypeFor(filePath) });
      res.end(data);
    });
  });
}

async function installAuthHarness(page) {
  await page.addInitScript((tokenKey) => {
    localStorage.setItem(tokenKey, 'reward-runtime-test');
  }, AUTH_TOKEN_KEY);

  await page.route('https://api.growsimulator.tech/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === '/api/auth/me') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'reward-runtime-user',
            email: 'reward@test.local',
            displayName: 'Reward Runtime'
          }
        })
      });
      return;
    }

    if (url.pathname === '/api/save') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: request.method() === 'GET'
          ? JSON.stringify({ save: null })
          : JSON.stringify({ ok: true })
      });
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Unhandled test route' })
    });
  });
}

async function waitForBoot(page) {
  await page.waitForFunction(() => window.__gsBootOk === true, null, { timeout: 25000 });
}

async function runRewardScenario(page, scenario) {
  return page.evaluate(async (input) => {
    const actionType = String(input.actionType || 'care_boost');
    const rewardState = window.__gsState.rewardActions;
    rewardState.byType = rewardState.byType || {};
    rewardState.byType[actionType] = {
      lastTriggeredAtMs: 0,
      lastGrantedAtMs: 0,
      lastExecutedAtMs: 0,
      lastUsedAtMs: 0,
      lastRejectedAtMs: 0,
      sessionUses: 0,
      lifetimeUses: 0,
      lastResult: '',
      lastRejectedReason: ''
    };

    Object.assign(window.__gsState.status, {
      water: input.status && Number.isFinite(Number(input.status.water)) ? Number(input.status.water) : 28,
      nutrition: input.status && Number.isFinite(Number(input.status.nutrition)) ? Number(input.status.nutrition) : 34,
      health: input.status && Number.isFinite(Number(input.status.health)) ? Number(input.status.health) : 58,
      stress: input.status && Number.isFinite(Number(input.status.stress)) ? Number(input.status.stress) : 54,
      risk: input.status && Number.isFinite(Number(input.status.risk)) ? Number(input.status.risk) : 42
    });
    window.__gsState.plant.isDead = input.dead === true;
    window.__gsState.plant.phase = input.dead === true ? 'dead' : 'vegetative';
    window.__gsState.run.status = input.dead === true ? 'downed' : 'active';
    localStorage.removeItem('gs_reward_feature_flags');

    localStorage.setItem('gs_reward_provider_mode', input.mode);
    localStorage.setItem('gs_reward_rollout_stage', input.rolloutStage || 'local');
    window.__GROWSIM_DEBUG_REWARDED_RESULT__ = input.debugResult || '';
    window.__GROWSIM_DEBUG_REWARDED_DELAY_MS__ = 0;
    window.GrowSimRewardDebug.clearTelemetry();

    const result = await window.triggerRewardAction(actionType);
    const telemetry = window.GrowSimRewardDebug
      .getTelemetry(20)
      .filter((entry) => entry.actionType === actionType)
      .map((entry) => entry.eventName);

    return {
      result,
      telemetry,
      executedCount: telemetry.filter((eventName) => eventName === 'reward_executed').length,
      rejectedCount: telemetry.filter((eventName) => eventName === 'reward_rejected').length,
      grantedCount: telemetry.filter((eventName) => eventName === 'reward_granted').length
    };
  }, scenario);
}

async function main() {
  const server = createStaticServer(ROOT);
  await new Promise((resolve) => server.listen(PORT, HOST, resolve));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });

  try {
    await installAuthHarness(page);
    await page.goto(`http://${CLIENT_HOST}:${PORT}/`, { waitUntil: 'domcontentloaded' });
    await waitForBoot(page);

    const direct = await runRewardScenario(page, { mode: 'direct' });
    assert.strictEqual(direct.result.ok, true, 'direct mode should still execute reward action');
    assert.strictEqual(direct.executedCount, 1, 'direct mode should execute exactly once');
    assert.strictEqual(direct.rejectedCount, 0, 'direct mode should not reject');

    const debugSuccess = await runRewardScenario(page, { mode: 'debug_rewarded', debugResult: 'success' });
    assert.strictEqual(debugSuccess.result.ok, true, 'debug rewarded success should grant and execute');
    assert.strictEqual(debugSuccess.grantedCount, 1, 'debug rewarded success should grant exactly once');
    assert.strictEqual(debugSuccess.executedCount, 1, 'debug rewarded success should execute exactly once');

    const debugCancel = await runRewardScenario(page, { mode: 'debug_rewarded', debugResult: 'cancel' });
    assert.strictEqual(debugCancel.result.ok, false, 'debug rewarded cancel should reject');
    assert.strictEqual(debugCancel.result.reason, 'reward_cancelled', 'debug rewarded cancel should map to reward_cancelled');
    assert.strictEqual(debugCancel.executedCount, 0, 'debug rewarded cancel should not execute');

    const providerUnavailable = await runRewardScenario(page, { mode: 'provider_rewarded' });
    assert.strictEqual(providerUnavailable.result.ok, false, 'provider mode without config should reject');
    assert.ok(
      providerUnavailable.result.reason === 'provider_disabled'
      || providerUnavailable.result.reason === 'missing_client'
      || providerUnavailable.result.reason === 'reward_action_disabled'
      || providerUnavailable.result.reason === 'provider_unavailable'
      || providerUnavailable.result.reason === 'provider_initializing'
      || providerUnavailable.result.reason === 'provider_error',
      'provider mode without config should fail with a provider reason'
    );
    assert.strictEqual(providerUnavailable.executedCount, 0, 'provider mode without config should not execute');

    const emergencySoftLaunch = await runRewardScenario(page, {
      actionType: 'emergency_save',
      mode: 'direct',
      rolloutStage: 'soft_launch',
      dead: true,
      status: {
        water: 12,
        nutrition: 18,
        health: 0,
        stress: 94,
        risk: 92
      }
    });
    assert.strictEqual(emergencySoftLaunch.result.ok, false, 'soft launch should keep emergency save disabled by default');
    assert.strictEqual(emergencySoftLaunch.result.reason, 'reward_action_disabled', 'soft launch should block emergency save through rollout gating');
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main()
  .then(() => {
    console.log('reward runtime mode tests passed');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
