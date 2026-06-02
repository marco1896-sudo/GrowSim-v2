'use strict';

const ValidationStage = Object.freeze({
  SCHEMA: 'schema',
  INTEGRITY: 'integrity',
  CROSS_REF: 'crossRef',
  QUALITY: 'quality'
});

module.exports = ValidationStage;
