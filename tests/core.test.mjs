import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

async function loadModule(path) {
  try {
    return await import(path);
  } catch {
    return null;
  }
}

test('Config centralizes the fixed game tuning values', async () => {
  const module = await loadModule('../src/core/Config.js');
  assert.ok(module, 'Config module must exist');

  const { CONFIG } = module;
  assert.deepEqual(CONFIG.laneOffsets, [-2.6, 0, 2.6]);
  assert.equal(CONFIG.track.keepAhead, 220);
  assert.equal(CONFIG.track.recycleBehind, 40);
  assert.equal(CONFIG.runner.baseSpeed, 12.5);
  assert.equal(CONFIG.runner.maxSpeed, 30);
  assert.equal(CONFIG.runner.jumpAirTime, 0.78);
  assert.equal(CONFIG.loop.fixedDt, 1 / 60);
  assert.equal(CONFIG.loop.maxFrameDelta, 0.1);
});

test('GameState permits the menu, play, pause and restart transitions only', async () => {
  const module = await loadModule('../src/core/GameState.js');
  assert.ok(module, 'GameState module must exist');

  const { GAME_STATES, GameState } = module;
  const state = new GameState();

  assert.equal(state.current, GAME_STATES.LOADING);
  assert.equal(state.transition(GAME_STATES.MENU), true);
  assert.equal(state.current, GAME_STATES.MENU);
  assert.equal(state.transition(GAME_STATES.PLAYING), true);
  assert.equal(state.transition(GAME_STATES.PAUSED), true);
  assert.equal(state.transition(GAME_STATES.PLAYING), true);
  assert.equal(state.transition(GAME_STATES.DEAD), true);
  assert.equal(state.transition(GAME_STATES.PLAYING), true);
  assert.equal(state.transition(GAME_STATES.LOADING), false);
});

test('FixedStepLoop caps a long frame, advances deterministic steps and renders interpolation', async () => {
  const module = await loadModule('../src/core/Loop.js');
  assert.ok(module, 'Loop module must exist');

  const updates = [];
  let renderedAlpha = -1;
  const loop = new module.FixedStepLoop({
    fixedDt: 0.1,
    maxFrameDelta: 0.25,
    update: (dt) => updates.push(dt),
    render: (alpha) => {
      renderedAlpha = alpha;
    },
  });

  loop.advance(0.26);
  assert.deepEqual(updates, [0.1, 0.1]);
  assert.ok(renderedAlpha > 0.49 && renderedAlpha < 0.51);

  loop.paused = true;
  loop.advance(0.2);
  assert.equal(updates.length, 2);
});

test('index bootstraps Three r169 and exposes accessible application containers', () => {
  const indexPath = new URL('../index.html', import.meta.url);
  assert.equal(existsSync(indexPath), true, 'index.html must exist');

  const html = readFileSync(indexPath, 'utf8');
  assert.match(html, /https:\/\/unpkg\.com\/three@0\.169\.0\/build\/three\.module\.js/);
  assert.match(html, /https:\/\/unpkg\.com\/three@0\.169\.0\/examples\/jsm\//);
  assert.match(html, /<main id="game-shell"/);
  assert.match(html, /id="game-canvas"/);
  assert.match(html, /id="hud"/);
  assert.match(html, /id="screen-layer"/);
  assert.match(html, /id="error-panel"/);
  assert.match(html, /src="\.\/src\/main\.js(?:\?v=[^"]+)?"/);
  assert.match(html, /src="\.\/src\/main\.js\?v=/);
  assert.match(html, /src="\.\/src\/main\.js\?v=20260920-10"/);
  assert.match(html, /#screen-layer\[hidden\]\s*\{\s*display:\s*none;/);
});
