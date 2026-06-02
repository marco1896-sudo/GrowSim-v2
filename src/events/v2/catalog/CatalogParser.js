'use strict';
const { classifyCatalogEntry, classifyCatalogRecord } = require('./CatalogEntryClassifier');

function detectExampleKind(fileName) {
  return classifyCatalogEntry(fileName);
}

function expectedSchemaFile(exampleKind) {
  if (exampleKind === 'event') {
    return 'event.schema.json';
  }

  if (exampleKind === 'chain') {
    return 'chain.schema.json';
  }

  if (exampleKind === 'learning-card') {
    return 'learning-card.schema.json';
  }

  return null;
}

function parseExampleDescriptor(exampleRecord) {
  const kind = classifyCatalogRecord(exampleRecord);

  return Object.freeze({
    fileName: exampleRecord.fileName,
    filePath: exampleRecord.filePath,
    kind,
    expectedSchema: expectedSchemaFile(kind),
    data: exampleRecord.data
  });
}

function parseCatalogRecords(records) {
  return (Array.isArray(records) ? records : []).map(parseExampleDescriptor);
}

module.exports = Object.freeze({
  detectExampleKind,
  expectedSchemaFile,
  parseExampleDescriptor,
  parseCatalogRecords
});
