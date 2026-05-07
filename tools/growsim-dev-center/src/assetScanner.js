'use strict';

const fs = require('fs');
const path = require('path');
const { readImageMetadata } = require('./imageMetadata');
const { toPosixPath } = require('./pathUtils');

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg']);
const EXPECTED_DIRS = [
  'assets/ui/icons',
  'assets/onboarding',
  'assets/events',
  'assets/buddy',
  'assets/plants'
];

function walkFiles(dirPath, out = []) {
  if (!fs.existsSync(dirPath)) return out;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const absolutePath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkFiles(absolutePath, out);
    } else if (entry.isFile()) {
      out.push(absolutePath);
    }
  }
  return out;
}

function getAssetDirectories(projectRoot) {
  const dirs = new Map();
  for (const relativePath of EXPECTED_DIRS) {
    dirs.set(relativePath, {
      relativePath,
      expected: true,
      exists: fs.existsSync(path.join(projectRoot, relativePath))
    });
  }

  const assetsRoot = path.join(projectRoot, 'assets');
  if (fs.existsSync(assetsRoot)) {
    for (const entry of fs.readdirSync(assetsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const relativePath = toPosixPath(path.join('assets', entry.name));
      if (!dirs.has(relativePath)) {
        dirs.set(relativePath, { relativePath, expected: false, exists: true });
      }
    }
  }
  return Array.from(dirs.values()).sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function scanAssets(projectRoot) {
  const directories = getAssetDirectories(projectRoot);
  const files = [];
  const totals = {
    files: 0,
    images: 0,
    warnings: 0,
    bytes: 0
  };

  for (const directory of directories.filter((item) => item.exists)) {
    const absoluteDir = path.join(projectRoot, directory.relativePath);
    for (const absolutePath of walkFiles(absoluteDir)) {
      const stat = fs.statSync(absolutePath);
      const extension = path.extname(absolutePath).toLowerCase();
      const isImage = IMAGE_EXTENSIONS.has(extension);
      const metadata = isImage ? readImageMetadata(absolutePath, extension) : null;
      const relativePath = toPosixPath(path.relative(projectRoot, absolutePath));
      const warnings = [];
      if (!isImage) warnings.push('Untypical format for an asset preview.');
      if (stat.size > 2 * 1024 * 1024) warnings.push('Large file over 2 MB.');
      if (stat.size > 5 * 1024 * 1024) warnings.push('Very large file over 5 MB.');
      if (metadata && (!metadata.width || !metadata.height)) warnings.push('Image dimensions could not be fully detected.');

      totals.files += 1;
      totals.bytes += stat.size;
      if (isImage) totals.images += 1;
      totals.warnings += warnings.length ? 1 : 0;

      files.push({
        relativePath,
        directory: directory.relativePath,
        name: path.basename(absolutePath),
        extension: extension.replace('.', '') || '(none)',
        sizeBytes: stat.size,
        isImage,
        metadata,
        warnings,
        previewUrl: isImage ? `/api/assets/preview?path=${encodeURIComponent(relativePath)}` : null
      });
    }
  }

  return {
    directories,
    files,
    totals,
    scannedAt: new Date().toISOString()
  };
}

module.exports = {
  scanAssets
};
