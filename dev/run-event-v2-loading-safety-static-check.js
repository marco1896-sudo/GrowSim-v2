'use strict';

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const indexPath = path.join(rootDir, 'index.html');
const candidateRelativePath = 'src/events/v2/shadow-bridge/ShadowBridgeBrowserBridgeCandidate.js';
const candidatePath = path.join(rootDir, ...candidateRelativePath.split('/'));

function lineNumberFor(content, needle) {
  const index = content.indexOf(needle);
  if (index < 0) return null;
  return content.slice(0, index).split(/\r?\n/).length;
}

function countMatches(content, needle) {
  return content.split(needle).length - 1;
}

function runLoadingSafetyStaticCheck() {
  const indexHtml = fs.readFileSync(indexPath, 'utf8');
  const candidateExists = fs.existsSync(candidatePath);
  const candidateEntry = `{ src: '${candidateRelativePath}' }`;
  const appEntry = `{ src: 'app.js' }`;
  const candidateCount = countMatches(indexHtml, candidateEntry);
  const v2BridgeScriptCount = (indexHtml.match(/src\/events\/v2\/shadow-bridge\/[^']+\.js/g) || []).length;
  const candidateLine = lineNumberFor(indexHtml, candidateEntry);
  const appLine = lineNumberFor(indexHtml, appEntry);
  const loaderVersionsScripts = /script\.src\s*=\s*definition\.external\s*\?\s*definition\.src\s*:\s*appendVersion\(definition\.src\)/.test(indexHtml);
  const appendVersionUsesBuildId = /v=\$\{encodeURIComponent\(buildId\)\}/.test(indexHtml);
  const candidateBeforeApp = candidateLine !== null && appLine !== null && candidateLine === appLine - 1;
  const noAppHook = !/runEventV2ShadowBridgeNoopPreflight|runShadowBridgeGuardedEntry\(|ShadowBridgeGuardedEntry/.test(fs.readFileSync(path.join(rootDir, 'app.js'), 'utf8'));

  const checks = {
    candidateExists,
    candidateCount,
    candidateLine,
    appLine,
    candidateBeforeApp,
    pathExact: candidateCount === 1,
    loaderVersionsScripts,
    appendVersionUsesBuildId,
    v2BridgeScriptCount,
    noSecondV2BridgeScript: v2BridgeScriptCount === 1,
    noAppHook
  };

  const ok = candidateExists &&
    candidateCount === 1 &&
    candidateBeforeApp &&
    loaderVersionsScripts &&
    appendVersionUsesBuildId &&
    v2BridgeScriptCount === 1 &&
    noAppHook;

  return { ok, checks };
}

if (require.main === module) {
  const result = runLoadingSafetyStaticCheck();
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

module.exports = { runLoadingSafetyStaticCheck };
