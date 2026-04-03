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
const PORT = 4182;
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
    localStorage.setItem(tokenKey, 'test-auth-token');
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
            id: 'scroll-test-user',
            email: 'scroll@test.local',
            displayName: 'Scroll Test'
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

async function main() {
  const server = createStaticServer(ROOT);
  await new Promise((resolve) => server.listen(PORT, HOST, resolve));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });

  try {
    await installAuthHarness(page);
    await page.goto(`http://${CLIENT_HOST}:${PORT}/`, { waitUntil: 'domcontentloaded' });
    await waitForBoot(page);

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
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
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
