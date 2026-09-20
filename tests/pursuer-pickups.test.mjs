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

test('Pursuer recovers distance naturally, loses distance on impact and signals death at zero', async () => {
  const module = await loadModule('../src/entities/Pursuer.js');
  assert.ok(module, 'Pursuer module must exist');

  const pursuer = new module.Pursuer({ config: CONFIG, createVisual: () => null });
  const runner = { s: 100, speed: CONFIG.runner.baseSpeed };
  pursuer.update(runner, 1);
  assert.equal(pursuer.distance, Math.min(CONFIG.pursuer.maxDistance, CONFIG.pursuer.startDistance + CONFIG.pursuer.recoverRate));
  pursuer.registerHit(runner);
  assert.equal(pursuer.distance, CONFIG.pursuer.startDistance + CONFIG.pursuer.recoverRate - CONFIG.pursuer.hitPushBack);
  pursuer.distance = 0;
  pursuer.update(runner, 0);
  assert.equal(pursuer.dead, true);
  assert.equal(runner.speed, CONFIG.runner.baseSpeed * CONFIG.runner.hitSpeedPenalty);
});

test('PickupSpawner keeps coin strings spaced and creates rare power-ups in the configured window', async () => {
  const module = await loadModule('../src/world/PickupSpawner.js');
  assert.ok(module, 'PickupSpawner module must exist');

  const spawner = new module.PickupSpawner({ config: CONFIG, random: () => 0.2 });
  spawner.ensureAhead(0, 500);
  const coins = spawner.getCoinSnapshots();
  assert.ok(coins.length >= CONFIG.spawn.coinPerGroup[0]);
  for (let index = 1; index < coins.length; index += 1) {
    assert.ok(coins[index].s - coins[index - 1].s >= CONFIG.spawn.coinSpacing - 1e-9);
  }
  assert.ok(spawner.getPowerUpSnapshots().every((item) => item.s >= CONFIG.spawn.powerUpGapMin));
});

test('PowerUp tracks independent timers, one-shot shield and non-stacking boost reset', async () => {
  const module = await loadModule('../src/systems/PowerUp.js');
  assert.ok(module, 'PowerUp module must exist');

  const powerUp = new module.PowerUp({ config: CONFIG });
  powerUp.activate('MAGNET');
  powerUp.activate('SHIELD');
  powerUp.activate('BOOST');
  powerUp.update(CONFIG.powerUp.boostDuration / 2);
  powerUp.activate('BOOST');
  assert.equal(powerUp.magnetRemaining > 0, true);
  assert.equal(powerUp.shieldActive, true);
  assert.equal(powerUp.boostRemaining, CONFIG.powerUp.boostDuration);
  assert.equal(powerUp.consumeShield(), true);
  assert.equal(powerUp.consumeShield(), false);
  powerUp.update(CONFIG.powerUp.boostDuration);
  assert.equal(powerUp.boostRemaining, 0);
});
