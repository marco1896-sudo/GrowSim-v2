'use strict';

const fs = require('fs');

function readUInt24LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

function parsePng(filePath) {
  const buffer = fs.readFileSync(filePath);
  const signature = buffer.slice(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a' || buffer.length < 33) return null;
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const colorType = buffer[25];
  let hasTransparency = colorType === 4 || colorType === 6;
  let offset = 8;
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.slice(offset + 4, offset + 8).toString('ascii');
    if (type === 'tRNS') hasTransparency = true;
    offset += 12 + length;
  }
  return { width, height, format: 'png', hasTransparency };
}

function parseJpeg(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return {
        width: buffer.readUInt16BE(offset + 7),
        height: buffer.readUInt16BE(offset + 5),
        format: 'jpg',
        hasTransparency: false
      };
    }
    offset += 2 + length;
  }
  return null;
}

function parseWebp(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.slice(0, 4).toString('ascii') !== 'RIFF' || buffer.slice(8, 12).toString('ascii') !== 'WEBP') {
    return null;
  }
  const chunkType = buffer.slice(12, 16).toString('ascii');
  if (chunkType === 'VP8X' && buffer.length >= 30) {
    const flags = buffer[20];
    return {
      width: 1 + readUInt24LE(buffer, 24),
      height: 1 + readUInt24LE(buffer, 27),
      format: 'webp',
      hasTransparency: Boolean(flags & 0x10)
    };
  }
  if (chunkType === 'VP8 ' && buffer.length >= 30) {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
      format: 'webp',
      hasTransparency: false
    };
  }
  if (chunkType === 'VP8L' && buffer.length >= 25) {
    const b0 = buffer[21];
    const b1 = buffer[22];
    const b2 = buffer[23];
    const b3 = buffer[24];
    return {
      width: 1 + (((b1 & 0x3f) << 8) | b0),
      height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
      format: 'webp',
      hasTransparency: true
    };
  }
  return { width: null, height: null, format: 'webp', hasTransparency: null };
}

function parseSvg(filePath) {
  const content = fs.readFileSync(filePath, 'utf8').slice(0, 8000);
  const svgMatch = content.match(/<svg\b[^>]*>/i);
  if (!svgMatch) return null;
  const tag = svgMatch[0];
  const widthMatch = tag.match(/\bwidth=["']?([\d.]+)/i);
  const heightMatch = tag.match(/\bheight=["']?([\d.]+)/i);
  const viewBoxMatch = tag.match(/\bviewBox=["']([\d.\s-]+)["']/i);
  let width = widthMatch ? Number(widthMatch[1]) : null;
  let height = heightMatch ? Number(heightMatch[1]) : null;
  if ((!width || !height) && viewBoxMatch) {
    const parts = viewBoxMatch[1].trim().split(/\s+/).map(Number);
    if (parts.length === 4) {
      width = width || parts[2];
      height = height || parts[3];
    }
  }
  return {
    width: Number.isFinite(width) ? width : null,
    height: Number.isFinite(height) ? height : null,
    format: 'svg',
    hasTransparency: true
  };
}

function readImageMetadata(filePath, extension) {
  try {
    if (extension === '.png') return parsePng(filePath);
    if (extension === '.jpg' || extension === '.jpeg') return parseJpeg(filePath);
    if (extension === '.webp') return parseWebp(filePath);
    if (extension === '.svg') return parseSvg(filePath);
  } catch (error) {
    return { width: null, height: null, format: extension.replace('.', ''), hasTransparency: null, error: error.message };
  }
  return null;
}

module.exports = {
  readImageMetadata
};
