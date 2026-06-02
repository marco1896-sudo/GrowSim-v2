'use strict';

const { createQaMatrixCell } = require('./QaMatrixCell');
const { decideTrafficLight } = require('./TrafficLightDecision');

function createQaMatrix() {
  const cells = [];
  const runId = 'matrix_' + Date.now();

  function addCell(input) {
    const decision = input && input.qaDecision ? input.qaDecision : ((input && input.run && input.run.qaDecision) || { decision: 'warning' });
    const trafficLight = decideTrafficLight({ decision: decision.decision, notApplicable: input && input.notApplicable === true });
    const cell = createQaMatrixCell(Object.assign({}, input || {}, { trafficLight }));
    cells.push(cell);
    return cell;
  }

  function listCells() {
    return Object.freeze(cells.slice());
  }

  function summarize() {
    const out = { green: 0, yellow: 0, red: 0, gray: 0 };
    cells.forEach((cell) => {
      const key = out[cell.trafficLight] !== undefined ? cell.trafficLight : 'gray';
      out[key] += 1;
    });
    return Object.freeze(out);
  }

  return Object.freeze({
    runId,
    addCell,
    listCells,
    summarize
  });
}

module.exports = Object.freeze({
  createQaMatrix
});
