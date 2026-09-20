import assert from 'node:assert/strict';
import test from 'node:test';
import { CONFIG } from '../src/core/Config.js';

async function loadModule(path) {
  try {
    return await import(path);
  } catch {
    return null;
  }
}

test('ObstacleSpawner never fills all three lanes in a physical obstacle group', async () => {
  const module = await loadModule('../src/world/ObstacleSpawner.js');
  assert.ok(module, 'ObstacleSpawner module must exist');

  const rolls = [0.8, 0.4, 0.1, 0.7, 0.2, 0.9];
  let cursor = 0;
  const spawner = new module.ObstacleSpawner({
    config: CONFIG,
    random: () => rolls[(cursor += 1) % rolls.length],
    createVisual: () => null,
  });
  spawner.ensureAhead(900, CONFIG.track.keepAhead, 0.8);

  const groups = spawner.getGroupSnapshots();
  assert.ok(groups.length > 0);
  for (const group of groups) {
    assert.ok(group.occupiedLanes.length < CONFIG.laneOffsets.length);
  }
});

test('obstacle catalogue includes a traversable GAP hazard with jump semantics', async () => {
  const spawnerModule = await import('../src/world/ObstacleSpawner.js');
  const collisionModule = await import('../src/systems/Collision.js');
  assert.equal(CONFIG.spawn.obstacleTypes.includes('GAP'), true);
  const spawner = new spawnerModule.ObstacleSpawner({ config: CONFIG, random: () => 0.99, createVisual: () => null });
  spawner.ensureAhead(0, 40, 0);
  const gap = spawner.getObstacleAt(0);
  gap.type = 'GAP';
  gap.height = 0.9;
  gap.depth = 4;
  const runner = { s: gap.s, lateral: CONFIG.laneOffsets[gap.lane], verticalOffset: 0, collisionHeight: CONFIG.runner.runCollisionHeight };
  assert.equal(collisionModule.isObstacleHit(runner, gap, CONFIG), true);
  assert.equal(collisionModule.isObstacleHit({ ...runner, verticalOffset: 1.2 }, gap, CONFIG), false);
});

test('ObstacleSpawner terminates with a constant random source while selecting two lanes', async () => {
  const { ObstacleSpawner } = await import('../src/world/ObstacleSpawner.js');
  const spawner = new ObstacleSpawner({ config: CONFIG, random: () => 0.8, createVisual: () => null });
  spawner.ensureAhead(0, 80, 1);
  const group = spawner.getGroupSnapshots().find((item) => item.occupiedLanes.length === 2);
  assert.ok(group);
});

test('collision action rules forgive near misses but demand jump, slide or lane change as appropriate', async () => {
  const module = await loadModule('../src/systems/Collision.js');
  assert.ok(module, 'Collision module must exist');

  const baseRunner = {
    s: 20,
    lateral: CONFIG.laneOffsets[1],
    verticalOffset: 0,
    collisionHeight: CONFIG.runner.runCollisionHeight,
  };
  const pillar = { s: 20, lane: 1, type: 'PILLAR', height: 3.2, depth: 1.4 };
  const beam = { s: 20, lane: 1, type: 'BEAM', height: 1.25, depth: 0.4 };
  const low = { s: 20, lane: 1, type: 'LOW_BARRIER', height: 0.8, depth: 0.7 };

  assert.equal(module.isObstacleHit(baseRunner, pillar, CONFIG), true);
  assert.equal(module.isObstacleHit({ ...baseRunner, lateral: CONFIG.laneOffsets[2] }, pillar, CONFIG), false);
  assert.equal(module.isObstacleHit({ ...baseRunner, collisionHeight: CONFIG.runner.slideCollisionHeight }, beam, CONFIG), false);
  assert.equal(module.isObstacleHit({ ...baseRunner, verticalOffset: low.height - CONFIG.collision.jumpClearance }, low, CONFIG), false);
});

test('Score totals distance and coins then persists only a new high score', async () => {
  const module = await loadModule('../src/systems/Score.js');
  assert.ok(module, 'Score module must exist');

  const writes = [];
  const storage = {
    getItem: () => '30',
    setItem: (key, value) => writes.push([key, value]),
  };
  const score = new module.Score({ config: CONFIG, storage });
  score.updateDistance(25.8);
  score.addCoin();
  score.addCoin();

  assert.equal(score.distance, 25);
  assert.equal(score.coins, 2);
  assert.equal(score.total, 45);
  assert.equal(score.highScore, 45);
  score.commitHighScore();
  assert.deepEqual(writes, [[CONFIG.score.highScoreStorageKey, '45']]);
});

test('Score keeps gameplay alive when localStorage is blocked', async () => {
  const module = await import('../src/systems/Score.js');
  const blockedStorage = {
    getItem: () => { throw new Error('blocked'); },
    setItem: () => { throw new Error('blocked'); },
  };
  const score = new module.Score({ config: CONFIG, storage: blockedStorage });
  score.updateDistance(12);
  score.commitHighScore();
  assert.equal(score.distance, 12);
});

test('spawners reset their cursors and active records for a clean restart', async () => {
  const { ObstacleSpawner } = await import('../src/world/ObstacleSpawner.js');
  const { PickupSpawner } = await import('../src/world/PickupSpawner.js');
  const obstacles = new ObstacleSpawner({ config: CONFIG, random: () => 0.2 });
  obstacles.ensureAhead(0, 100, 0);
  assert.ok(obstacles.obstacleCount() > 0);
  obstacles.reset();
  assert.equal(obstacles.obstacleCount(), 0);
  const pickups = new PickupSpawner({ config: CONFIG, random: () => 0.2 });
  pickups.ensureAhead(0, 300);
  assert.ok(pickups.getCoinSnapshots().length > 0);
  pickups.reset();
  assert.equal(pickups.getCoinSnapshots().length, 0);
  assert.equal(pickups.getPowerUpSnapshots().length, 0);
});
