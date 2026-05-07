'use strict';

const path = require('path');

function toPosixPath(value) {
  return String(value || '').replace(/\\/g, '/');
}

function getProjectRoot() {
  return path.resolve(__dirname, '..', '..', '..');
}

function normalizeProjectRelative(projectRoot, targetPath) {
  const resolved = path.resolve(projectRoot, targetPath || '.');
  const relative = path.relative(projectRoot, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    const error = new Error('Path is outside the project root.');
    error.code = 'PATH_OUTSIDE_PROJECT';
    throw error;
  }
  return {
    absolutePath: resolved,
    relativePath: toPosixPath(relative || '.')
  };
}

module.exports = {
  getProjectRoot,
  normalizeProjectRelative,
  toPosixPath
};
