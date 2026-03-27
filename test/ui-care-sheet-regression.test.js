#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const HOST = '127.0.0.1';
const PORT = 4177;

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

    if ('caches' in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    }

    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  });
}

async function waitForBoot(page) {
  await page.waitForFunction(() => window.__gsBootOk === true, null, { timeout: 10000 });
}

async function main() {
  const server = createStaticServer(ROOT);
  await new Promise((resolve) => server.listen(PORT, HOST, resolve));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });

  try {
    const url = `http://${HOST}:${PORT}/`;
    await page.goto(url, { waitUntil: 'networkidle' });
    await waitForBoot(page);
    await clearClientStorage(page);
    await page.goto(url, { waitUntil: 'networkidle' });
    await waitForBoot(page);

    await page.click('#startRunBtn');
    await page.waitForFunction(() => document.getElementById('landing').classList.contains('hidden'));

    await page.evaluate(() => {
      const close = document.querySelector('#eventSheet [data-close-sheet]');
      if (close) close.click();
    });

    await page.click('#careActionBtn');
    await page.waitForFunction(() => {
      const node = document.getElementById('careSheet');
      return node && !node.classList.contains('hidden');
    });

    await page.click('#careActionList .care-action-card:first-child');

    const careUiState = await page.evaluate(() => {
      const sheetContent = document.querySelector('#careSheet .sheet-content');
      const actionList = document.getElementById('careActionList');
      const previewWrap = document.getElementById('carePreviewWrap');
      const previewLabel = document.getElementById('carePreviewLabel');
      const previewNote = document.getElementById('carePreviewNote');
      const effectsList = document.getElementById('careEffectsList');
      const executeButton = document.getElementById('careExecuteButton');

      const text = document.getElementById('careSheet').textContent || '';
      const sheetRect = sheetContent.getBoundingClientRect();
      sheetContent.scrollTop = sheetContent.scrollHeight;
      const executeRect = executeButton.getBoundingClientRect();

      const actionListStyle = window.getComputedStyle(actionList);
      const previewLabelStyle = window.getComputedStyle(previewLabel);
      const previewNoteStyle = window.getComputedStyle(previewNote);
      const effectsListStyle = window.getComputedStyle(effectsList);

      return {
        text,
        actionListOverflowY: actionListStyle.overflowY,
        actionListPaddingRight: actionListStyle.paddingRight,
        actionListScrollbarGutter: actionListStyle.scrollbarGutter || '',
        actionListHeight: actionList.getBoundingClientRect().height,
        previewHeight: previewWrap.getBoundingClientRect().height,
        effectsListOverflowY: effectsListStyle.overflowY,
        effectsListHeight: effectsList.getBoundingClientRect().height,
        effectsListChildCount: effectsList.children.length,
        previewLabelLineHeight: previewLabelStyle.lineHeight,
        previewNoteLineHeight: previewNoteStyle.lineHeight,
        previewNoteText: previewNote.textContent.trim(),
        previewLabelText: previewLabel.textContent.trim(),
        executeReachable: executeRect.bottom <= sheetRect.bottom + 1,
        sheetScrollTop: sheetContent.scrollTop,
        needsScroll: sheetContent.scrollHeight > sheetContent.clientHeight + 1
      };
    });

    assert.ok(!/\uFFFD/.test(careUiState.text), 'care sheet should not contain replacement characters');
    assert.ok(!/F\?tter|N\?hr|Bl\?tter|gro\?en/i.test(careUiState.text), 'care sheet should not show broken German umlauts');
    assert.strictEqual(careUiState.actionListOverflowY, 'auto', 'care action list should stay internally scrollable');
    assert.ok(parseFloat(careUiState.actionListPaddingRight) >= 10, 'care action list should reserve space next to the scrollbar');
    assert.ok(/stable/i.test(careUiState.actionListScrollbarGutter), 'care action list should reserve a stable scrollbar gutter');
    assert.ok(careUiState.actionListHeight >= 150, 'care action list should keep enough visible height to show multiple actions');
    assert.ok(careUiState.previewLabelText.length > 0, 'selected care preview should expose a title');
    assert.ok(careUiState.previewNoteText.length > 0, 'selected care preview should expose a subtitle');
    assert.notStrictEqual(careUiState.previewLabelLineHeight, 'normal', 'preview title should have an explicit line-height');
    assert.notStrictEqual(careUiState.previewNoteLineHeight, 'normal', 'preview subtitle should have an explicit line-height');
    assert.ok(careUiState.previewHeight >= 60 && careUiState.previewHeight <= 80, 'care preview should stay compact and secondary to the decision content');
    assert.strictEqual(careUiState.effectsListOverflowY, 'auto', 'care detail list should support internal scrolling when needed');
    assert.ok(careUiState.effectsListChildCount >= 4, 'care detail list should render hints and effect rows');
    assert.ok(careUiState.effectsListHeight >= 170, 'care detail list should retain enough visible height for hints and effects');
    assert.ok(/Hinweise zur aktuellen Lage/.test(careUiState.text), 'care detail should visibly include the hints section');
    assert.ok(/Auswirkungen der Aktion/.test(careUiState.text), 'care detail should visibly include the effects section');
    assert.ok(careUiState.executeReachable, 'care sheet should allow reaching the execute button after scrolling');
    assert.ok(!careUiState.needsScroll || careUiState.sheetScrollTop > 0, 'care sheet content should scroll when the content actually exceeds the viewport');
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main()
  .then(() => {
    console.log('care sheet ui regression test passed');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
