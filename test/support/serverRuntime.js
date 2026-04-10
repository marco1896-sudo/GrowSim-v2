'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');

const CONTENT_TYPES = Object.freeze({
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
});

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return CONTENT_TYPES[ext] || 'application/octet-stream';
}

function buildBaseUrl(host, port) {
  return `http://${String(host || '127.0.0.1')}:${Number(port)}`;
}

function createStaticRequestHandler(rootDir, host, port, options = {}) {
  const safeRootDir = path.resolve(rootDir);
  const defaultHeaders = options.defaultHeaders && typeof options.defaultHeaders === 'object'
    ? options.defaultHeaders
    : {};

  return (req, res) => {
    const requestUrl = new URL(req.url, `${buildBaseUrl(host, port)}${req.url || '/'}`);
    const relativePath = decodeURIComponent(requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname);
    const safeRelativePath = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
    const filePath = path.join(safeRootDir, safeRelativePath);

    if (!filePath.startsWith(safeRootDir)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        res.writeHead(error.code === 'ENOENT' ? 404 : 500, {
          'Content-Type': 'text/plain; charset=utf-8'
        });
        res.end(error.code === 'ENOENT' ? 'Not found' : 'Internal server error');
        return;
      }

      res.writeHead(200, {
        'Content-Type': contentTypeFor(filePath),
        ...defaultHeaders
      });
      res.end(data);
    });
  };
}

async function getFreePort(host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    const probe = http.createServer();
    probe.once('error', reject);
    probe.listen(0, host, () => {
      const address = probe.address();
      const port = address && typeof address === 'object' ? Number(address.port) : 0;
      probe.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }
        resolve(port);
      });
    });
  });
}

async function startStaticServer(rootDir, host = '127.0.0.1', port, options = {}) {
  const requestedPort = Number(port);
  const resolvedPort = Number.isFinite(requestedPort) && requestedPort > 0
    ? requestedPort
    : await getFreePort(host);
  const server = http.createServer(createStaticRequestHandler(rootDir, host, resolvedPort, options));

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(resolvedPort, host, resolve);
  });

  return {
    server,
    host,
    port: resolvedPort,
    baseUrl: buildBaseUrl(host, resolvedPort)
  };
}

async function closeServer(server) {
  if (!server || typeof server.close !== 'function' || server.listening !== true) {
    return;
  }
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

async function closeBrowser(browser) {
  if (!browser || typeof browser.close !== 'function') {
    return;
  }
  await browser.close();
}

async function closeContext(context) {
  if (!context || typeof context.close !== 'function') {
    return;
  }
  await context.close();
}

module.exports = {
  buildBaseUrl,
  closeBrowser,
  closeContext,
  closeServer,
  getFreePort,
  startStaticServer
};
