
'use strict';

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const HOST = '127.0.0.1';
const PORT = 4174;

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

async function clearClientStorage(page) {
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();

    if ('indexedDB' in window && typeof indexedDB.databases === 'function') {
      const databases = await indexedDB.databases();
      await Promise.all(
        databases
          .map((entry) => entry && entry.name)
          .filter(Boolean)
          .map((name) => new Promise((resolve) => {
            const request = indexedDB.deleteDatabase(name);
            request.onsuccess = request.onerror = request.onblocked = () => resolve();
          }))
      );
    }
  });
}

async function main() {
  const server = createStaticServer(ROOT);
  await new Promise((resolve) => server.listen(PORT, HOST, resolve));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });

  try {
    const url = `http://${HOST}:${PORT}/`;
    await page.goto(url);
    await clearClientStorage(page);
    await page.goto(url, { waitUntil: 'networkidle' });

    // Start a new run to have a fresh state
    await page.click('#startRunBtn');
    await page.waitForFunction(() => document.getElementById('landing').classList.contains('hidden'));

    // Simulate being offline for a long time (e.g., 2 days of real time)
    const now = Date.now();
    const twoDaysAgo = now - (2 * 24 * 60 * 60 * 1000); // 2 days in milliseconds
    await page.evaluate((timestamp) => {
      localStorage.setItem('grow-sim-state-v2', JSON.stringify({
        ...JSON.parse(localStorage.getItem('grow-sim-state-v2')),
        simulation: { ...JSON.parse(localStorage.getItem('grow-sim-state-v2')).simulation, lastTickRealTimeMs: timestamp }
      }));
    }, twoDaysAgo);

    // Reload the page to trigger the catch-up logic
    await page.reload({ waitUntil: 'networkidle' });

    // Check for event spam: look for multiple event dialogs/notifications
    const eventDialogs = await page.$$('.event-dialog'); // Assuming event dialogs have this class
    const logEntries = await page.evaluate(() => {
      const logs = window.state.history.systemLog || [];
      return logs.filter(log => log.type === 'event_roll' || log.type === 'event_shown');
    });

    // Expect no immediate event spam from catch-up
    assert.strictEqual(eventDialogs.length, 0, 'No event dialogs should be visible immediately after catch-up reload');
    // The logs should show events suppressed or rescheduled, not multiple activations
    const actualEventRolls = logEntries.filter(l => l.message.includes('Ereignisgrenze erreicht') && !l.message.includes('unterdrückt')).length;
    assert.strictEqual(actualEventRolls, 0, 'No actual event rolls should trigger during catch-up mode');

    // Check death/freeze logic: should not show multiple death overlays or unexpected states
    const deathOverlay = await page.$('#deathOverlay');
    const deathOverlayVisible = deathOverlay ? await deathOverlay.isVisible() : false;
    const plantIsDead = await page.evaluate(() => window.state.plant.isDead);
    
    // If the plant would have died, only one death overlay should show, and the plant state should be dead
    if (plantIsDead) {
      // Check if it died cleanly, only one dialog
      const dialogs = await page.$$('.open-menu-dialog'); // assuming this class is used for the mission popup
      assert.strictEqual(dialogs.length, 1, 'Only one death/mission dialog should show if plant died during offline');
      assert.ok(deathOverlayVisible, 'Death overlay should be visible if plant died');
    } else {
      assert.strictEqual(deathOverlayVisible, false, 'Death overlay should not be visible if plant is not dead');
    }

    console.log('Offline event spam regression test passed');
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error('Offline event spam regression test failed:', error);
  process.exit(1);
});
