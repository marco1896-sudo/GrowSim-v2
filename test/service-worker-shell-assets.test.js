const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const swSource = fs.readFileSync(path.join(repoRoot, 'sw.js'), 'utf8');

const shellListMatch = swSource.match(/const APP_SHELL_FILES = \[(.*?)\];/s);
assert(shellListMatch, 'APP_SHELL_FILES should be defined in sw.js');

const assetPaths = [...shellListMatch[1].matchAll(/appPath\('([^']*)'\)/g)]
  .map((match) => match[1])
  .filter(Boolean);

const missingPaths = assetPaths.filter((relativePath) => !fs.existsSync(path.join(repoRoot, relativePath)));

assert.deepStrictEqual(
  missingPaths,
  [],
  `service worker shell cache contains missing files: ${missingPaths.join(', ')}`
);

const requiredMigrationFiles = [
  'src/ui/components/primitives.js',
  'src/ui/controller/uiController.js',
  'src/ui/runtime/screenRuntimeManager.js',
  'src/ui/mappings/homeMapping.js',
  'src/ui/mappings/careMapping.js',
  'src/ui/screens/screenModules.js'
];

for (const relativePath of requiredMigrationFiles) {
  assert(
    assetPaths.includes(relativePath),
    `service worker shell cache should include migrated UI runtime file: ${relativePath}`
  );
}

console.log('service worker shell asset test passed');
