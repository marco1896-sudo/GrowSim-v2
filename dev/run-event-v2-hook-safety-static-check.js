#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const indexPath = path.join(root, 'index.html');
const appPath = path.join(root, 'app.js');
const candidatePath = path.join(root, 'src/events/v2/shadow-bridge/ShadowBridgeBrowserBridgeCandidate.js');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function countMatches(text, pattern) {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

function findFunctionBody(source, functionName) {
  const marker = `function ${functionName}(`;
  const start = source.indexOf(marker);
  if (start < 0) return null;
  const open = source.indexOf('{', start);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    const char = source[i];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(open + 1, i);
      }
    }
  }
  return null;
}

function visibleLineNumber(source, needle) {
  const index = source.indexOf(needle);
  if (index < 0) return -1;
  return source.slice(0, index).split(/\r?\n/).length;
}

const indexHtml = read(indexPath);
const appJs = read(appPath);
const helperBody = findFunctionBody(appJs, 'runEventV2ShadowBridgeBrowserNoopPreflight') || '';
const runBody = findFunctionBody(appJs, 'runEventStateMachine') || '';

const candidateScript = "{ src: 'src/events/v2/shadow-bridge/ShadowBridgeBrowserBridgeCandidate.js' }";
const appScript = "{ src: 'app.js' }";
const candidateScriptCount = countMatches(indexHtml, /src\/events\/v2\/shadow-bridge\/ShadowBridgeBrowserBridgeCandidate\.js/g);
const candidateLine = visibleLineNumber(indexHtml, candidateScript);
const appLine = visibleLineNumber(indexHtml, appScript);

const callLinePattern = /^\s*runEventV2ShadowBridgeBrowserNoopPreflight\(\);\s*$/gm;
const callLineCount = countMatches(appJs, callLinePattern);
const helperDefinitionCount = countMatches(appJs, /function\s+runEventV2ShadowBridgeBrowserNoopPreflight\s*\(/g);
const runFunctionCount = countMatches(appJs, /function\s+runEventStateMachine\s*\(\s*nowMs\s*\)/g);

const forbiddenPatterns = {
  stateToken: /\bstate\b/.test(helperBody),
  nowMsToken: /\bnowMs\b/.test(helperBody),
  snapshotToken: /snapshot|createShadowBridgeSnapshot|allowSnapshot/i.test(helperBody),
  saveOrStorageToken: /localStorage|sessionStorage|indexedDB|saveGame|saveState|persist|storage/i.test(helperBody),
  uiToken: /document\.|querySelector|getElementById|classList|innerHTML|replaceChildren|appendChild|render/i.test(helperBody),
  eventActivationToken: /activateEvent|eventActivated\s*:\s*true|triggerEvent|startEvent/i.test(helperBody),
  consoleToken: /console\./.test(helperBody)
};

const helperHas = {
  candidateLookup: /window\.ShadowBridgeBrowserBridgeCandidate/.test(helperBody),
  registerCall: /registerShadowBridgeBrowserBridgeCandidate\s*\(\s*window\s*,\s*\{[\s\S]*enabled\s*:\s*true[\s\S]*allowGlobalRegistration\s*:\s*true[\s\S]*\}\s*\)/.test(helperBody),
  guardedEntryLookup: /window\.ShadowBridgeGuardedEntry/.test(helperBody),
  noopCall: /runShadowBridgeGuardedEntry\s*\(\s*null\s*,\s*\{\s*enabled\s*:\s*false\s*\}\s*\)/.test(helperBody),
  tryCatch: /try\s*\{[\s\S]*\}\s*catch\s*\(/.test(`try {${helperBody}}`),
  safeReturnInCatch: /catch\s*\([^)]*\)\s*\{\s*return\s*;\s*\}/.test(`function x(){${helperBody}}`)
};

const legacyPath = {
  routeTickStillPassesNowMsAndState: /eventEngine\.routeTick\s*\(\s*nowMs\s*,\s*state\s*\)\.result/.test(runBody),
  canonicalFallbackStillPresent: /callCanonicalEventsRuntime\s*\(\s*'runEventStateMachine'\s*,\s*nowMs\s*\)/.test(runBody),
  hookCallBeforeLegacy: runBody.indexOf('runEventV2ShadowBridgeBrowserNoopPreflight();') >= 0
    && runBody.indexOf('runEventV2ShadowBridgeBrowserNoopPreflight();') < runBody.indexOf('const eventEngine')
};

const returnUsage = {
  assigned: /=\s*runEventV2ShadowBridgeBrowserNoopPreflight\s*\(/.test(appJs),
  returned: /return\s+runEventV2ShadowBridgeBrowserNoopPreflight\s*\(/.test(appJs),
  conditional: /if\s*\(\s*runEventV2ShadowBridgeBrowserNoopPreflight\s*\(/.test(appJs)
};

const checks = {
  candidateExists: fs.existsSync(candidatePath),
  candidateScriptCount,
  candidateBeforeApp: candidateLine > 0 && appLine > 0 && candidateLine + 1 === appLine,
  pathExact: indexHtml.includes(candidateScript),
  runFunctionCount,
  callLineCount,
  helperDefinitionCount,
  helperHas,
  forbiddenPatterns,
  returnUsage,
  legacyPath,
  hookReferenceCounts: {
    helperName: countMatches(appJs, /runEventV2ShadowBridgeBrowserNoopPreflight/g),
    candidateApi: countMatches(appJs, /ShadowBridgeBrowserBridgeCandidate/g),
    guardedEntry: countMatches(appJs, /ShadowBridgeGuardedEntry/g)
  },
  noAdditionalHookNames: countMatches(appJs, /runEventV2ShadowBridgeBrowserNoopPreflight/g) === 2
    && countMatches(appJs, /ShadowBridgeBrowserBridgeCandidate/g) === 3
    && countMatches(appJs, /ShadowBridgeGuardedEntry/g) === 3
};

const ok = checks.candidateExists
  && checks.candidateScriptCount === 1
  && checks.candidateBeforeApp
  && checks.pathExact
  && checks.runFunctionCount === 1
  && checks.callLineCount === 1
  && checks.helperDefinitionCount === 1
  && Object.values(helperHas).every(Boolean)
  && Object.values(forbiddenPatterns).every((value) => value === false)
  && Object.values(returnUsage).every((value) => value === false)
  && Object.values(legacyPath).every(Boolean)
  && checks.noAdditionalHookNames;

console.log(JSON.stringify({
  ok,
  checks,
  summary: {
    appHookAllowed: true,
    callLineCount,
    helperDefinitionCount,
    candidateScriptCount,
    candidateLine,
    appLine,
    noStateToV2: !forbiddenPatterns.stateToken,
    noNowMsToV2: !forbiddenPatterns.nowMsToken,
    noSnapshot: !forbiddenPatterns.snapshotToken,
    noSaveOrStorage: !forbiddenPatterns.saveOrStorageToken,
    noUi: !forbiddenPatterns.uiToken,
    noEventActivation: !forbiddenPatterns.eventActivationToken,
    noConsoleSpam: !forbiddenPatterns.consoleToken,
    returnValueUnused: Object.values(returnUsage).every((value) => value === false),
    legacyPathUnchanged: Object.values(legacyPath).every(Boolean)
  }
}, null, 2));

process.exit(ok ? 0 : 1);
