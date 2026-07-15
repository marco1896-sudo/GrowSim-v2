'use strict';

(function attachGrowSimBuddyCarePhotoStorage(globalScope) {
  const DB_NAME = 'grow-sim-care-photos';
  const DB_VERSION = 1;
  const PHOTO_STORE = 'photos';
  const BLOB_STORE = 'blobs';
  const PHOTO_SCHEMA_VERSION = 1;
  const SOURCE_TYPES = Object.freeze(['profile', 'daily_check', 'journal', 'follow_up']);
  const CATEGORIES = Object.freeze(['whole_plant', 'leaf_top', 'leaf_bottom', 'detail', 'other']);

  function normalizeString(value, fallback = '') {
    const result = typeof value === 'string' ? value.trim() : '';
    return result || fallback;
  }

  function normalizePositiveNumber(value, fallback = 0) {
    const result = Number(value);
    return Number.isFinite(result) && result > 0 ? Math.round(result) : fallback;
  }

  function isValidPhotoBlob(value) {
    const BlobConstructor = globalScope && typeof globalScope.Blob === 'function' ? globalScope.Blob : null;
    const isBlob = BlobConstructor
      ? value instanceof BlobConstructor
      : Object.prototype.toString.call(value) === '[object Blob]';
    return Boolean(
      isBlob
      && typeof value.size === 'number'
      && value.size > 0
      && /^image\/(?:jpeg|png|webp)$/i.test(normalizeString(value.type))
    );
  }

  function normalizePhotoMetadata(value = {}) {
    const safeValue = value && typeof value === 'object' ? value : {};
    const createdAt = normalizePositiveNumber(safeValue.createdAt, Date.now());
    const sourceType = SOURCE_TYPES.includes(String(safeValue.sourceType || '').trim())
      ? String(safeValue.sourceType).trim()
      : 'profile';
    const category = CATEGORIES.includes(String(safeValue.category || '').trim())
      ? String(safeValue.category).trim()
      : 'other';
    return {
      id: normalizeString(safeValue.id),
      plantId: normalizeString(safeValue.plantId),
      sourceType,
      sourceId: normalizeString(safeValue.sourceId) || null,
      category,
      createdAt,
      updatedAt: normalizePositiveNumber(safeValue.updatedAt, createdAt),
      width: normalizePositiveNumber(safeValue.width),
      height: normalizePositiveNumber(safeValue.height),
      mimeType: normalizeString(safeValue.mimeType, 'image/webp').toLowerCase(),
      byteSize: normalizePositiveNumber(safeValue.byteSize),
      originalByteSize: normalizePositiveNumber(safeValue.originalByteSize),
      isPrimary: safeValue.isPrimary === true,
      note: normalizeString(safeValue.note).slice(0, 180),
      schemaVersion: PHOTO_SCHEMA_VERSION
    };
  }

  function createPhotoId(now = Date.now()) {
    const randomPart = globalScope.crypto && typeof globalScope.crypto.randomUUID === 'function'
      ? globalScope.crypto.randomUUID()
      : `${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    return `care-photo-${Math.max(0, Number(now) || Date.now()).toString(36)}-${randomPart}`;
  }

  function requestResult(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('care_photo_storage_request_failed'));
    });
  }

  function transactionDone(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error || new Error('care_photo_storage_transaction_aborted'));
      transaction.onerror = () => reject(transaction.error || new Error('care_photo_storage_transaction_failed'));
    });
  }

  function createPhotoStorage(options = {}) {
    const indexedDbApi = options.indexedDB || globalScope.indexedDB;
    let dbPromise = null;

    function openDatabase() {
      if (!indexedDbApi || typeof indexedDbApi.open !== 'function') {
        return Promise.reject(new Error('care_photo_storage_unavailable'));
      }
      if (dbPromise) {
        return dbPromise;
      }
      dbPromise = new Promise((resolve, reject) => {
        const request = indexedDbApi.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          const photos = db.objectStoreNames.contains(PHOTO_STORE)
            ? request.transaction.objectStore(PHOTO_STORE)
            : db.createObjectStore(PHOTO_STORE, { keyPath: 'id' });
          const indexDefinitions = [
            ['plantId', 'plantId'],
            ['sourceType', 'sourceType'],
            ['sourceId', 'sourceId'],
            ['createdAt', 'createdAt'],
            ['isPrimary', 'isPrimary']
          ];
          indexDefinitions.forEach(([name, keyPath]) => {
            if (!photos.indexNames.contains(name)) {
              photos.createIndex(name, keyPath, { unique: false });
            }
          });
          if (!db.objectStoreNames.contains(BLOB_STORE)) {
            db.createObjectStore(BLOB_STORE, { keyPath: 'id' });
          }
        };
        request.onerror = () => {
          dbPromise = null;
          reject(request.error || new Error('care_photo_storage_open_failed'));
        };
        request.onblocked = () => {
          dbPromise = null;
          reject(new Error('care_photo_storage_upgrade_blocked'));
        };
        request.onsuccess = () => {
          const db = request.result;
          db.onversionchange = () => {
            db.close();
            dbPromise = null;
          };
          resolve(db);
        };
      });
      return dbPromise;
    }

    async function savePhotos(records) {
      const safeRecords = Array.isArray(records) ? records : [];
      if (!safeRecords.length) {
        return [];
      }
      const prepared = safeRecords.map((record) => {
        const blob = record && record.blob;
        const metadata = normalizePhotoMetadata(record && (record.metadata || record));
        if (!metadata.id || !metadata.plantId) {
          throw new Error('care_photo_metadata_invalid');
        }
        if (!isValidPhotoBlob(blob)) {
          throw new Error('care_photo_blob_invalid');
        }
        return {
          metadata: normalizePhotoMetadata({ ...metadata, byteSize: blob.size, mimeType: blob.type || metadata.mimeType }),
          blob
        };
      });
      const db = await openDatabase();
      const transaction = db.transaction([PHOTO_STORE, BLOB_STORE], 'readwrite');
      const photos = transaction.objectStore(PHOTO_STORE);
      const blobs = transaction.objectStore(BLOB_STORE);
      prepared.forEach((record) => {
        photos.put(record.metadata);
        blobs.put({
          id: record.metadata.id,
          blob: record.blob,
          mimeType: record.metadata.mimeType,
          byteSize: record.blob.size,
          createdAt: record.metadata.createdAt
        });
      });
      await transactionDone(transaction);

      const verificationTransaction = db.transaction([PHOTO_STORE, BLOB_STORE], 'readonly');
      const verified = await Promise.all(prepared.map(async (record) => {
        const [storedMetadata, storedBlobRecord] = await Promise.all([
          requestResult(verificationTransaction.objectStore(PHOTO_STORE).get(record.metadata.id)),
          requestResult(verificationTransaction.objectStore(BLOB_STORE).get(record.metadata.id))
        ]);
        return Boolean(
          storedMetadata
          && storedMetadata.id === record.metadata.id
          && storedBlobRecord
          && storedBlobRecord.id === record.metadata.id
          && isValidPhotoBlob(storedBlobRecord.blob)
          && storedBlobRecord.blob.size === record.metadata.byteSize
        );
      }));
      await transactionDone(verificationTransaction);
      if (verified.some((result) => !result)) {
        await deletePhotos(prepared.map((record) => record.metadata.id)).catch(() => {});
        throw new Error('care_photo_storage_verification_failed');
      }
      return prepared.map((record) => record.metadata);
    }

    async function savePhoto(record) {
      const results = await savePhotos([record]);
      return results[0] || null;
    }

    async function getPhoto(photoId) {
      const safeId = normalizeString(photoId);
      if (!safeId) return null;
      const db = await openDatabase();
      const transaction = db.transaction(PHOTO_STORE, 'readonly');
      const value = await requestResult(transaction.objectStore(PHOTO_STORE).get(safeId));
      await transactionDone(transaction);
      return value ? normalizePhotoMetadata(value) : null;
    }

    async function getPhotoBlob(photoId) {
      const safeId = normalizeString(photoId);
      if (!safeId) return null;
      const db = await openDatabase();
      const transaction = db.transaction(BLOB_STORE, 'readonly');
      const value = await requestResult(transaction.objectStore(BLOB_STORE).get(safeId));
      await transactionDone(transaction);
      const blob = isValidPhotoBlob(value) ? value : value && value.blob;
      return isValidPhotoBlob(blob) ? blob : null;
    }

    async function getPhotosByIndex(indexName, queryValue) {
      const db = await openDatabase();
      const transaction = db.transaction(PHOTO_STORE, 'readonly');
      const store = transaction.objectStore(PHOTO_STORE);
      const index = store.index(indexName);
      const values = typeof index.getAll === 'function'
        ? await requestResult(index.getAll(queryValue))
        : await new Promise((resolve, reject) => {
          const items = [];
          const request = index.openCursor(queryValue);
          request.onerror = () => reject(request.error || new Error('care_photo_storage_cursor_failed'));
          request.onsuccess = () => {
            const cursor = request.result;
            if (!cursor) {
              resolve(items);
              return;
            }
            items.push(cursor.value);
            cursor.continue();
          };
        });
      await transactionDone(transaction);
      return (Array.isArray(values) ? values : [])
        .map(normalizePhotoMetadata)
        .sort((left, right) => right.createdAt - left.createdAt);
    }

    function getPhotosForPlant(plantId) {
      const safePlantId = normalizeString(plantId);
      return safePlantId ? getPhotosByIndex('plantId', safePlantId) : Promise.resolve([]);
    }

    async function getPhotosForSource(sourceType, sourceId) {
      const safeSourceType = SOURCE_TYPES.includes(String(sourceType || '').trim()) ? String(sourceType).trim() : '';
      const safeSourceId = normalizeString(sourceId);
      if (!safeSourceType || !safeSourceId) return [];
      const candidates = await getPhotosByIndex('sourceId', safeSourceId);
      return candidates.filter((photo) => photo.sourceType === safeSourceType);
    }

    async function getPrimaryPhoto(plantId) {
      const photos = await getPhotosForPlant(plantId);
      return photos.find((photo) => photo.isPrimary) || null;
    }

    async function setPrimaryPhoto(plantId, photoId) {
      const safePlantId = normalizeString(plantId);
      const safePhotoId = normalizeString(photoId);
      if (!safePlantId) throw new Error('care_photo_plant_id_missing');
      const records = await getPhotosForPlant(safePlantId);
      const selected = records.find((record) => record && record.id === safePhotoId) || null;
      if (safePhotoId && !selected) {
        throw new Error('care_photo_not_found');
      }
      const db = await openDatabase();
      const transaction = db.transaction(PHOTO_STORE, 'readwrite');
      const store = transaction.objectStore(PHOTO_STORE);
      records.forEach((record) => {
        store.put(normalizePhotoMetadata({
          ...record,
          isPrimary: Boolean(safePhotoId && record.id === safePhotoId),
          updatedAt: Date.now()
        }));
      });
      await transactionDone(transaction);
      return selected ? normalizePhotoMetadata({ ...selected, isPrimary: true, updatedAt: Date.now() }) : null;
    }

    async function deletePhoto(photoId) {
      const safeId = normalizeString(photoId);
      if (!safeId) return false;
      const db = await openDatabase();
      const transaction = db.transaction([PHOTO_STORE, BLOB_STORE], 'readwrite');
      transaction.objectStore(PHOTO_STORE).delete(safeId);
      transaction.objectStore(BLOB_STORE).delete(safeId);
      await transactionDone(transaction);
      return true;
    }

    async function deletePhotos(photoIds) {
      const ids = Array.from(new Set((Array.isArray(photoIds) ? photoIds : []).map(normalizeString).filter(Boolean)));
      if (!ids.length) return 0;
      const db = await openDatabase();
      const transaction = db.transaction([PHOTO_STORE, BLOB_STORE], 'readwrite');
      ids.forEach((id) => {
        transaction.objectStore(PHOTO_STORE).delete(id);
        transaction.objectStore(BLOB_STORE).delete(id);
      });
      await transactionDone(transaction);
      return ids.length;
    }

    async function deletePhotosForPlant(plantId) {
      const photos = await getPhotosForPlant(plantId);
      return deletePhotos(photos.map((photo) => photo.id));
    }

    async function detachPhotosFromSource(sourceType, sourceId) {
      const photos = await getPhotosForSource(sourceType, sourceId);
      if (!photos.length) return { deleted: 0, retainedPrimary: 0 };
      const retained = photos.filter((photo) => photo.isPrimary);
      const removable = photos.filter((photo) => !photo.isPrimary);
      const db = await openDatabase();
      const transaction = db.transaction([PHOTO_STORE, BLOB_STORE], 'readwrite');
      const photoStore = transaction.objectStore(PHOTO_STORE);
      const blobStore = transaction.objectStore(BLOB_STORE);
      retained.forEach((photo) => photoStore.put(normalizePhotoMetadata({
        ...photo,
        sourceType: 'profile',
        sourceId: null,
        updatedAt: Date.now()
      })));
      removable.forEach((photo) => {
        photoStore.delete(photo.id);
        blobStore.delete(photo.id);
      });
      await transactionDone(transaction);
      return { deleted: removable.length, retainedPrimary: retained.length };
    }

    async function cleanupOrphanedPhotos(options = {}) {
      const validPlantIds = options.validPlantIds instanceof Set ? options.validPlantIds : null;
      const validSourceRefs = options.validSourceRefs instanceof Set ? options.validSourceRefs : null;
      const validPhotoIds = options.validPhotoIds instanceof Set ? options.validPhotoIds : null;
      const db = await openDatabase();
      const readTransaction = db.transaction([PHOTO_STORE, BLOB_STORE], 'readonly');
      const [photos, blobRecords] = await Promise.all([
        requestResult(readTransaction.objectStore(PHOTO_STORE).getAll()),
        requestResult(readTransaction.objectStore(BLOB_STORE).getAll())
      ]);
      const transaction = db.transaction([PHOTO_STORE, BLOB_STORE], 'readwrite');
      const photoStore = transaction.objectStore(PHOTO_STORE);
      const blobStore = transaction.objectStore(BLOB_STORE);
      const photoIds = new Set((photos || []).map((photo) => photo && photo.id).filter(Boolean));
      const blobIds = new Set((blobRecords || []).filter((record) => record && record.blob && record.blob.size > 0).map((record) => record.id));
      const removedPhotoIds = [];
      (photos || []).forEach((photo) => {
        const invalidPlant = validPlantIds && !validPlantIds.has(String(photo && photo.plantId || '').trim());
        const sourceKey = `${String(photo && photo.sourceType || '')}:${String(photo && photo.sourceId || '')}`;
        const invalidSource = validSourceRefs
          && photo
          && photo.sourceType !== 'profile'
          && photo.sourceId
          && !validSourceRefs.has(sourceKey)
          && !(validPhotoIds && validPhotoIds.has(photo.id));
        if (!photo || !photo.id || !blobIds.has(photo.id) || invalidPlant || invalidSource) {
          if (photo && photo.id) removedPhotoIds.push(photo.id);
          photoStore.delete(photo && photo.id);
          blobStore.delete(photo && photo.id);
        }
      });
      (blobRecords || []).forEach((record) => {
        if (!record || !record.id || !photoIds.has(record.id)) {
          blobStore.delete(record && record.id);
        }
      });
      await transactionDone(transaction);
      return { removedPhotoIds, removedBlobCount: (blobRecords || []).filter((record) => !record || !photoIds.has(record.id)).length };
    }

    async function clearAllPhotos() {
      const db = await openDatabase();
      const transaction = db.transaction([PHOTO_STORE, BLOB_STORE], 'readwrite');
      transaction.objectStore(PHOTO_STORE).clear();
      transaction.objectStore(BLOB_STORE).clear();
      await transactionDone(transaction);
      return true;
    }

    function close() {
      if (!dbPromise) return;
      dbPromise.then((db) => db.close()).catch(() => {});
      dbPromise = null;
    }

    return Object.freeze({
      openDatabase,
      savePhoto,
      savePhotos,
      getPhoto,
      getPhotoBlob,
      getPhotosForPlant,
      getPhotosForSource,
      getPrimaryPhoto,
      setPrimaryPhoto,
      deletePhoto,
      deletePhotos,
      deletePhotosForPlant,
      detachPhotosFromSource,
      cleanupOrphanedPhotos,
      clearAllPhotos,
      close
    });
  }

  const api = Object.freeze({
    DB_NAME,
    DB_VERSION,
    PHOTO_STORE,
    BLOB_STORE,
    PHOTO_SCHEMA_VERSION,
    SOURCE_TYPES,
    CATEGORIES,
    normalizePhotoMetadata,
    isValidPhotoBlob,
    createPhotoId,
    createPhotoStorage,
    storage: createPhotoStorage()
  });

  globalScope.GrowSimBuddyCarePhotoStorage = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
