#!/usr/bin/env node
'use strict';

const assert = require('assert');
const path = require('path');
const { chromium } = require('playwright');
const {
  installAuthHarness: setupAuthHarness,
  waitForBoot: waitForBootReady,
  clearClientStorage: resetClientStorage
} = require('./support/browserRuntime');
const { startStaticServer, closeBrowser, closeServer } = require('./support/serverRuntime');

const ROOT = path.resolve(__dirname, '..');
const HOST = '127.0.0.1';
const CLIENT_HOST = HOST;
let PORT = 0;
const AUTH_TOKEN_KEY = 'grow-sim-auth-token-v1';

async function main() {
  const { server, port: resolvedPort } = await startStaticServer(ROOT, HOST);
  PORT = Number(resolvedPort || 0);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });

  try {
    await setupAuthHarness(page, AUTH_TOKEN_KEY, {
      id: 'scroll-test-user',
      email: 'scroll@test.local',
      displayName: 'Scroll Test'
    });
    await page.goto(`http://${CLIENT_HOST}:${PORT}/`, { waitUntil: 'domcontentloaded' });
    await waitForBootReady(page);

    const result = await page.evaluate(async () => {
      const container = document.querySelector('.home-content-scroll');
      if (!container) {
        return { missing: true };
      }

      const filler = document.createElement('div');
      filler.id = 'scroll-filler';
      filler.style.flex = '0 0 auto';
      filler.style.height = '1400px';
      filler.style.borderRadius = '12px';
      filler.style.background = 'rgba(255,255,255,0.04)';
      filler.style.marginBottom = '12px';
      container.appendChild(filler);

      if (typeof window.renderHud === 'function') {
        window.renderHud();
      }

      await new Promise((resolve) => setTimeout(resolve, 80));

      const style = window.getComputedStyle(container);
      const before = {
        scrollTop: container.scrollTop,
        scrollHeight: container.scrollHeight,
        clientHeight: container.clientHeight,
        overflowY: style.overflowY,
        paddingBottom: style.paddingBottom
      };

      container.scrollTop = container.scrollHeight;
      await new Promise((resolve) => setTimeout(resolve, 80));

      const after = {
        scrollTop: container.scrollTop,
        maxScrollTop: Math.max(0, container.scrollHeight - container.clientHeight),
        fillerBottom: filler.getBoundingClientRect().bottom,
        containerBottom: container.getBoundingClientRect().bottom
      };

      return { before, after };
    });

    assert.strictEqual(Boolean(result && result.missing), false, 'home scroll container should exist');
    assert.ok(/auto|scroll/i.test(result.before.overflowY), 'home scroll container should stay scrollable');
    assert.ok(parseFloat(result.before.paddingBottom) >= 120, 'home scroll container should reserve generous bottom padding');
    assert.ok(result.before.scrollHeight > result.before.clientHeight, 'test fixture should create real overflow');
    assert.ok(result.after.scrollTop > 0, 'scroll position should move downward');
    assert.ok(Math.abs(result.after.scrollTop - result.after.maxScrollTop) <= 2, 'container should reach the bottom without clipping');
    assert.ok(result.after.fillerBottom <= result.after.containerBottom + 170, 'extra content should remain reachable within the padded scroll area');
  } finally {
    await closeBrowser(browser);
    await closeServer(server);
  }
}

main()
  .then(() => {
    console.log('home scroll layout fix tests passed');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


