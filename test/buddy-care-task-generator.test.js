#!/usr/bin/env node
'use strict';

const assert = require('assert');
require('../src/buddy-care/phaseEngine.js');
const taskGenerator = require('../src/buddy-care/taskGenerator.js');

const NOW = Date.UTC(2026, 6, 9);

(function testSeedlingTasks() {
  const tasks = taskGenerator.generateTodayTasksForPlant({
    id: 'seed-1',
    plantType: 'auto',
    startDate: '2026-07-09',
    environment: 'indoor'
  }, { now: NOW, phase: 'seedling' });

  assert.ok(tasks.some((task) => task.category === 'observe'), 'seedling should include an observation task');
  assert.ok(tasks.some((task) => task.category === 'photo'), 'seedling should include a photo task');
})();

(function testVegOutdoorTasks() {
  const tasks = taskGenerator.generateTodayTasksForPlant({
    id: 'veg-outdoor',
    plantType: 'photoperiod',
    environment: 'outdoor',
    startDate: '2026-05-01'
  }, { now: NOW, phase: 'veg' });

  assert.ok(tasks.some((task) => task.title === 'Wetterstress beobachten'), 'veg outdoor should include a weather stress task');
})();

(function testFlowerGreenhouseTasks() {
  const tasks = taskGenerator.generateTodayTasksForPlant({
    id: 'flower-greenhouse',
    plantType: 'photoperiod',
    environment: 'greenhouse',
    startDate: '2026-03-01'
  }, { now: NOW, phase: 'flower' });

  assert.ok(tasks.some((task) => task.title === 'Feuchte und Luftbewegung beobachten'), 'flower greenhouse should include the greenhouse environment task');
})();

(function testUnknownTasks() {
  const tasks = taskGenerator.generateTodayTasksForPlant({
    id: 'unknown-1',
    plantType: 'unknown',
    environment: 'indoor',
    startDate: ''
  }, { now: NOW, phase: 'unknown' });

  assert.ok(tasks.some((task) => task.title === 'Pflanzendaten vervollstaendigen'), 'unknown phase should include a setup task');
})();

(function testTaskShapeAndLimit() {
  const tasks = taskGenerator.generateTodayTasksForPlant({
    id: 'stretch-1',
    plantType: 'photoperiod',
    environment: 'outdoor',
    startDate: '2026-04-25'
  }, { now: NOW, phase: 'stretch' });

  assert.ok(tasks.length <= 3, 'today tasks should be capped at three items');
  for (const task of tasks) {
    assert.ok(task.title, 'each task should include a title');
    assert.ok(task.category, 'each task should include a category');
    assert.ok(task.priority, 'each task should include a priority');
    assert.ok(task.dueDate, 'each task should include a due date');
  }
})();

console.log('buddy-care-task-generator.test.js passed');
