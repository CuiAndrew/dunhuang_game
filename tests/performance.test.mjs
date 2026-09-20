import assert from 'node:assert/strict';
import test from 'node:test';
import { CONFIG } from '../src/core/Config.js';
import { PerformanceBudget } from '../src/systems/Performance.js';

test('PerformanceBudget degrades only after sustained low frame rate', () => {
  const budget = new PerformanceBudget({ config: CONFIG });
  assert.equal(budget.pixelRatioCap, 2);
  assert.equal(budget.update(1 / 60), false);
  assert.equal(budget.update(CONFIG.render.lowFpsDuration - 0.1), false);
  assert.equal(budget.update(0.11), true);
  assert.equal(budget.pixelRatioCap, 1.5);
  assert.equal(budget.shadowsEnabled, false);
});

test('PerformanceBudget tolerates older render configs without quality steps', () => {
  const budget = new PerformanceBudget({ config: { render: { maxPixelRatio: 2, lowFpsThreshold: 45, lowFpsDuration: 1 } } });
  assert.equal(budget.pixelRatioCap, 2);
  assert.equal(budget.update(1.1), true);
  assert.equal(budget.pixelRatioCap, 1);
});
