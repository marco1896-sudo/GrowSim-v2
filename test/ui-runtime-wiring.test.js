#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const uiSource = fs.readFileSync(path.join(ROOT, 'ui.js'), 'utf8');
const appSource = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');

function getFunctionBody(source, functionName) {
  const signature = `function ${functionName}(`;
  const start = source.indexOf(signature);
  assert(start >= 0, `Missing function ${functionName}`);
  const argsOpenIndex = source.indexOf('(', start);
  assert(argsOpenIndex >= 0, `Missing argument list for ${functionName}`);

  let argDepth = 0;
  let argsCloseIndex = -1;
  for (let index = argsOpenIndex; index < source.length; index += 1) {
    const char = source[index];
    if (char === '(') {
      argDepth += 1;
    } else if (char === ')') {
      argDepth -= 1;
      if (argDepth === 0) {
        argsCloseIndex = index;
        break;
      }
    }
  }
  assert(argsCloseIndex >= 0, `Missing closing parenthesis for ${functionName}`);

  const openBrace = source.indexOf('{', argsCloseIndex);
  assert(openBrace >= 0, `Missing opening brace for ${functionName}`);

  let depth = 0;
  for (let index = openBrace; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(openBrace + 1, index);
      }
    }
  }
  throw new Error(`Unclosed function body for ${functionName}`);
}

function assertDelegatesToRuntime(source, functionName, runtimeMethodName) {
  const body = getFunctionBody(source, functionName);
  assert(
    body.includes('const appUiRuntime = window.GrowSimAppUiRuntime;'),
    `${functionName} should read GrowSimAppUiRuntime`
  );
  assert(
    body.includes(`typeof appUiRuntime.${runtimeMethodName} === 'function'`),
    `${functionName} should gate on app runtime method ${runtimeMethodName}`
  );
  assert(
    body.includes(`return appUiRuntime.${runtimeMethodName}`),
    `${functionName} should delegate to app runtime method ${runtimeMethodName}`
  );
}

assertDelegatesToRuntime(uiSource, 'renderGameMenu', 'renderGameMenu');
assertDelegatesToRuntime(uiSource, 'renderDeathOverlay', 'renderDeathOverlay');
assertDelegatesToRuntime(uiSource, 'openMenu', 'openMenu');
assertDelegatesToRuntime(uiSource, 'closeMenu', 'closeMenu');
assertDelegatesToRuntime(uiSource, 'openMenuDialog', 'openMenuDialog');
assertDelegatesToRuntime(uiSource, 'closeMenuDialog', 'closeMenuDialog');

const renderDeathOverlayBody = getFunctionBody(uiSource, 'renderDeathOverlay');
assert(
  !renderDeathOverlayBody.includes('diagnosisDrivers('),
  'ui renderDeathOverlay fallback should not compute diagnosis details locally'
);

assert(
  appSource.includes('window.GrowSimAppUiRuntime = Object.freeze({'),
  'app runtime wiring object must exist'
);
for (const methodName of [
  'renderGameMenu',
  'renderDeathOverlay',
  'openMenu',
  'closeMenu',
  'openMenuDialog',
  'closeMenuDialog'
]) {
  assert(
    appSource.includes(`${methodName}:`),
    `GrowSimAppUiRuntime must expose ${methodName}`
  );
}

console.log('ui-runtime-wiring.test.js passed');
