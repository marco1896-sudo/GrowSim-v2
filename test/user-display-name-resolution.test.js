#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const LS_STATE_KEY = 'grow-sim-state-v2';

function createMemoryStorage(initialEntries = {}) {
  const values = new Map(Object.entries(initialEntries));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    }
  };
}

async function runAuthHelperUnitTest() {
  const source = fs.readFileSync(path.join(ROOT, 'src', 'auth', 'auth.js'), 'utf8');
  let nextUser = { id: 'marco', email: 'marco@example.local', displayName: 'Marco' };
  const storage = createMemoryStorage({
    [LS_STATE_KEY]: JSON.stringify({ profile: { displayName: 'Marco' } })
  });
  const context = {
    console: { info() {} },
    localStorage: storage,
    window: {
      localStorage: storage,
      GrowSimApi: {
        apiFetch: async () => ({
          ok: true,
          json: async () => ({ token: 'auth-token', user: nextUser })
        })
      }
    }
  };
  vm.runInNewContext(source, context, { filename: 'src/auth/auth.js' });
  const auth = context.window.GrowSimAuth;

  assert.strictEqual(auth.getCurrentUserDisplayName(), null, 'stored local profile names must not become auth display names');
  assert.strictEqual(auth.getUserGreeting({ guestGreeting: 'Hallo', namedGreeting: 'Hallo, {name}' }), 'Hallo', 'signed-out users should receive a neutral greeting');
  assert.deepStrictEqual(
    { ...auth.getProfileDisplayModel({ guestTitle: 'Gast', guestSubtitle: 'Lokaler Spielstand' }) },
    { isAuthenticated: false, hasDisplayName: false, isGuest: true, title: 'Gast', subtitle: 'Lokaler Spielstand' },
    'signed-out profiles should resolve to the localized guest model'
  );

  await auth.login('marco@example.local', 'secret');
  assert.strictEqual(auth.getCurrentUserDisplayName(), 'Marco', 'authenticated users should resolve their display name');
  assert.strictEqual(auth.getUserGreeting({ guestGreeting: 'Hallo', namedGreeting: 'Hallo, {name}' }), 'Hallo, Marco', 'authenticated users should receive a named greeting');
  assert.strictEqual(
    auth.getProfileDisplayModel({ guestTitle: 'Gast', guestSubtitle: 'Lokaler Spielstand' }).title,
    'Marco',
    'authenticated profiles should use the auth display name'
  );

  auth.logout();
  assert.strictEqual(auth.getCurrentUserDisplayName(), null, 'logout should immediately clear the auth display name');
  assert.strictEqual(auth.getUserGreeting({ guestGreeting: 'Hallo', namedGreeting: 'Hallo, {name}' }), 'Hallo', 'logout should immediately restore the neutral greeting');
  await auth.restoreSession();
  assert.strictEqual(auth.getCurrentUserDisplayName(), null, 'reload after logout must not restore an old auth display name');

  nextUser = { id: 'empty-name', email: 'empty@example.local', displayName: 'Test User' };
  await auth.login('empty@example.local', 'secret');
  assert.strictEqual(auth.getCurrentUserDisplayName(), null, 'placeholder names must not be rendered as personal names');
  assert.strictEqual(
    auth.getProfileDisplayModel({ guestTitle: 'Gast', guestSubtitle: 'Lokaler Spielstand' }).title,
    'Gast',
    'missing or placeholder auth names should fall back to the guest profile label'
  );
}

function runUiWiringTest() {
  const appSource = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  const indexSource = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const de = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'i18n', 'locales', 'de.json'), 'utf8'));
  const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'i18n', 'locales', 'en.json'), 'utf8'));
  const es = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'i18n', 'locales', 'es.json'), 'utf8'));

  assert.match(appSource, /guestGreeting: i18nT\('auth\.greeting'\)/, 'Buddy Care should request the neutral auth greeting for guests');
  assert.match(appSource, /playerName: profileDisplay\.title/, 'HUD should use the central profile display model');
  assert.match(appSource, /playerRole: profileDisplay\.isGuest \? profileDisplay\.subtitle : playerRole/, 'guest HUDs should use the local-save subtitle');
  assert.match(appSource, /menuProfileNameNode\.textContent = String\(menuProfilePanel\.playerName \|\| i18nT\('auth\.guest'\)\)/, 'menu should use the localized guest fallback');
  assert.doesNotMatch(appSource, /state\.profile\.displayName[\s\S]{0,220}getBuddyCareDisplayName/, 'Buddy Care must not derive its name from a local profile');
  assert.match(indexSource, /id="playerNameValue" class="premium-playercard__name">Gast</, 'initial HUD markup should not expose a sample user name');
  assert.match(indexSource, /id="menuProfileNameValue" class="figma-top-player-title">Gast</, 'initial menu markup should not expose a loading or sample user name');
  assert.deepStrictEqual(
    [de.auth.greeting, de.auth.welcome, de.auth.guest, de.auth.local_save],
    ['Hallo', 'Willkommen', 'Gast', 'Lokaler Spielstand'],
    'German guest copy should be complete'
  );
  assert.deepStrictEqual(
    [en.auth.greeting, en.auth.welcome, en.auth.guest, en.auth.local_save],
    ['Hello', 'Welcome', 'Guest', 'Local save'],
    'English guest copy should be complete'
  );
  assert.deepStrictEqual(
    [es.auth.greeting, es.auth.welcome, es.auth.guest, es.auth.local_save],
    ['Hola', 'Bienvenido', 'Invitado', 'Partida local'],
    'Spanish guest copy should be complete'
  );
}

async function main() {
  await runAuthHelperUnitTest();
  runUiWiringTest();
  console.log('user display name resolution test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
