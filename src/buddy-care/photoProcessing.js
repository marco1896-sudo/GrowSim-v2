'use strict';

(function attachGrowSimBuddyCarePhotoProcessing(globalScope) {
  const DEFAULT_OPTIONS = Object.freeze({
    maxRawBytes: 15 * 1024 * 1024,
    maxLongEdge: 1600,
    targetBytes: 600 * 1024,
    maxOutputBytes: 1024 * 1024,
    minQuality: 0.58,
    initialQuality: 0.86
  });
  const SUPPORTED_TYPES = Object.freeze(['image/jpeg', 'image/png', 'image/webp']);

  function createProcessingError(code, cause = null) {
    const error = new Error(code);
    error.code = code;
    if (cause) error.cause = cause;
    return error;
  }

  function normalizeMimeType(value) {
    const safeValue = String(value || '').trim().toLowerCase();
    return safeValue === 'image/jpg' ? 'image/jpeg' : safeValue;
  }

  function validateCarePhotoFile(file, options = {}) {
    const settings = { ...DEFAULT_OPTIONS, ...options };
    if (!file || typeof file.size !== 'number') {
      throw createProcessingError('file_missing');
    }
    if (file.size <= 0) {
      throw createProcessingError('file_empty');
    }
    if (file.size > settings.maxRawBytes) {
      throw createProcessingError('file_too_large');
    }
    const mimeType = normalizeMimeType(file.type);
    if (/heic|heif/.test(mimeType)) {
      throw createProcessingError('heic_unsupported');
    }
    if (!SUPPORTED_TYPES.includes(mimeType)) {
      throw createProcessingError('format_unsupported');
    }
    return { mimeType, originalByteSize: file.size };
  }

  function loadWithImageElement(file) {
    return new Promise((resolve, reject) => {
      if (!globalScope.document || typeof globalScope.Image !== 'function' || !globalScope.URL) {
        reject(createProcessingError('image_decode_failed'));
        return;
      }
      const objectUrl = globalScope.URL.createObjectURL(file);
      const image = new globalScope.Image();
      image.decoding = 'async';
      image.onload = () => resolve({
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        close() {
          globalScope.URL.revokeObjectURL(objectUrl);
        }
      });
      image.onerror = () => {
        globalScope.URL.revokeObjectURL(objectUrl);
        reject(createProcessingError('image_decode_failed'));
      };
      image.src = objectUrl;
    });
  }

  async function decodeCarePhoto(file) {
    if (typeof globalScope.createImageBitmap === 'function') {
      try {
        const bitmap = await globalScope.createImageBitmap(file, { imageOrientation: 'from-image' });
        return {
          source: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          close() {
            if (bitmap && typeof bitmap.close === 'function') bitmap.close();
          }
        };
      } catch (_error) {
        // Image element fallback keeps camera/gallery support on older Safari versions.
      }
    }
    return loadWithImageElement(file);
  }

  function calculateOutputDimensions(width, height, maxLongEdge) {
    const safeWidth = Math.round(Number(width) || 0);
    const safeHeight = Math.round(Number(height) || 0);
    if (safeWidth <= 0 || safeHeight <= 0 || safeWidth > 20000 || safeHeight > 20000 || (safeWidth * safeHeight) > 60000000) {
      throw createProcessingError('image_dimensions_invalid');
    }
    const longEdge = Math.max(safeWidth, safeHeight);
    const scale = longEdge > maxLongEdge ? maxLongEdge / longEdge : 1;
    return {
      width: Math.max(1, Math.round(safeWidth * scale)),
      height: Math.max(1, Math.round(safeHeight * scale))
    };
  }

  function canvasToBlob(canvas, mimeType, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob || blob.size <= 0) {
          reject(createProcessingError('image_encode_failed'));
          return;
        }
        resolve(blob);
      }, mimeType, quality);
    });
  }

  async function encodeCanvas(canvas, settings) {
    const formats = ['image/webp', 'image/jpeg'];
    let bestBlob = null;
    for (const format of formats) {
      for (let quality = settings.initialQuality; quality >= settings.minQuality - 0.001; quality -= 0.07) {
        let blob = null;
        try {
          blob = await canvasToBlob(canvas, format, Math.max(settings.minQuality, quality));
        } catch (_error) {
          blob = null;
        }
        if (!blob || normalizeMimeType(blob.type) !== format) {
          continue;
        }
        if (!bestBlob || blob.size < bestBlob.size) bestBlob = blob;
        if (blob.size <= settings.targetBytes) return blob;
      }
      if (bestBlob && bestBlob.size <= settings.maxOutputBytes) return bestBlob;
      if (format === 'image/webp') bestBlob = null;
    }
    if (!bestBlob) throw createProcessingError('image_encode_failed');
    return bestBlob;
  }

  async function processCarePhoto(file, options = {}) {
    const settings = { ...DEFAULT_OPTIONS, ...options };
    const validation = validateCarePhotoFile(file, settings);
    const decoded = await decodeCarePhoto(file);
    try {
      const dimensions = calculateOutputDimensions(decoded.width, decoded.height, settings.maxLongEdge);
      const canvas = globalScope.document && typeof globalScope.document.createElement === 'function'
        ? globalScope.document.createElement('canvas')
        : null;
      if (!canvas) throw createProcessingError('image_processing_unavailable');
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw createProcessingError('image_processing_unavailable');
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, dimensions.width, dimensions.height);
      context.drawImage(decoded.source, 0, 0, dimensions.width, dimensions.height);
      let blob = await encodeCanvas(canvas, settings);

      if (blob.size > settings.maxOutputBytes && Math.max(canvas.width, canvas.height) > 900) {
        const retryScale = Math.max(900 / Math.max(canvas.width, canvas.height), Math.sqrt(settings.maxOutputBytes / blob.size) * 0.92);
        const retryWidth = Math.max(1, Math.round(canvas.width * Math.min(1, retryScale)));
        const retryHeight = Math.max(1, Math.round(canvas.height * Math.min(1, retryScale)));
        const retryCanvas = globalScope.document.createElement('canvas');
        retryCanvas.width = retryWidth;
        retryCanvas.height = retryHeight;
        const retryContext = retryCanvas.getContext('2d', { alpha: false });
        if (!retryContext) throw createProcessingError('image_processing_unavailable');
        retryContext.fillStyle = '#ffffff';
        retryContext.fillRect(0, 0, retryWidth, retryHeight);
        retryContext.drawImage(canvas, 0, 0, retryWidth, retryHeight);
        blob = await encodeCanvas(retryCanvas, { ...settings, initialQuality: 0.74, targetBytes: settings.maxOutputBytes });
        dimensions.width = retryWidth;
        dimensions.height = retryHeight;
      }

      if (!blob || blob.size <= 0) throw createProcessingError('image_encode_failed');
      return {
        blob,
        width: dimensions.width,
        height: dimensions.height,
        mimeType: normalizeMimeType(blob.type),
        byteSize: blob.size,
        originalByteSize: validation.originalByteSize
      };
    } catch (error) {
      throw error && error.code ? error : createProcessingError('image_processing_failed', error);
    } finally {
      if (decoded && typeof decoded.close === 'function') decoded.close();
    }
  }

  const api = Object.freeze({
    DEFAULT_OPTIONS,
    SUPPORTED_TYPES,
    normalizeMimeType,
    validateCarePhotoFile,
    calculateOutputDimensions,
    processCarePhoto
  });

  globalScope.GrowSimBuddyCarePhotoProcessing = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
