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

test('PickupSpawner only expands coin collection radius while magnet is active', async () => {
  const { PickupSpawner } = await import('../src/world/PickupSpawner.js');
  const spawner = new PickupSpawner({ config: CONFIG, random: () => 0.2 });
  spawner.ensureAhead(0, 40);
  const coin = spawner.coins[0];
  const runner = {
    s: coin.s + CONFIG.spawn.coinCollectRadius + 0.2,
    lateral: CONFIG.laneOffsets[coin.lane],
  };
  spawner.collectCoins(runner, () => {});
  assert.equal(coin.collected, false);
  spawner.collectCoins(runner, () => {}, { magnetActive: true });
  assert.equal(coin.collected, false);
  assert.ok(coin.magnetFlightRemaining > 0);
  let targetCollected = 0;
  spawner.updateMagnetFlights(runner, CONFIG.powerUp.magnetFlightDuration / 2, (item) => {
    if (item === coin) targetCollected += 1;
  });
  assert.equal(coin.collected, false);
  spawner.updateMagnetFlights(runner, CONFIG.powerUp.magnetFlightDuration / 2, (item) => {
    if (item === coin) targetCollected += 1;
  });
  assert.equal(coin.collected, true);
  assert.equal(targetCollected, 1);
});

test('PickupSpawner keeps active pickups bounded by fixed pools and reuses released slots', async () => {
  const module = await loadModule('../src/world/PickupSpawner.js');
  const spawner = new module.PickupSpawner({ config: CONFIG, random: () => 0.2 });
  spawner.ensureAhead(0, 20000);
  const firstStats = spawner.poolStats();
  assert.equal(firstStats.activeCoins <= CONFIG.spawn.coinPoolSize, true);
  assert.equal(firstStats.activePowerUps <= CONFIG.spawn.powerUpPoolSize, true);
  assert.equal(firstStats.activeCoins + firstStats.freeCoins, CONFIG.spawn.coinPoolSize);
  assert.equal(firstStats.activePowerUps + firstStats.freePowerUps, CONFIG.spawn.powerUpPoolSize);
  spawner.recycleBefore(15000);
  const recycledStats = spawner.poolStats();
  assert.equal(recycledStats.freeCoins > firstStats.freeCoins, true);
  assert.equal(recycledStats.freePowerUps > firstStats.freePowerUps, true);
  spawner.ensureAhead(15000, 3000);
  assert.equal(spawner.poolStats().activeCoins <= CONFIG.spawn.coinPoolSize, true);
});

test('PickupSpawner occasionally lays coins across an arc of lanes', async () => {
  const module = await loadModule('../src/world/PickupSpawner.js');
  const spawner = new module.PickupSpawner({ config: CONFIG, random: () => 0.1 });
  spawner.ensureAhead(0, 30);
  const lanes = new Set(spawner.getCoinSnapshots().slice(0, 5).map((coin) => coin.lane));
  assert.equal(lanes.size >= 3, true);
});

test('PickupSpawner prewarms pickup visuals before the update loop', async () => {
  const module = await loadModule('../src/world/PickupSpawner.js');
  let coinVisuals = 0;
  let powerVisuals = 0;
  const spawner = new module.PickupSpawner({
    config: CONFIG,
    createCoinVisual: () => { coinVisuals += 1; return { visible: false }; },
    createPowerUpVisual: () => { powerVisuals += 1; return { visible: false }; },
  });
  assert.equal(coinVisuals, CONFIG.spawn.coinPoolSize);
  assert.equal(powerVisuals, CONFIG.spawn.powerUpPoolSize);
  const warmed = coinVisuals + powerVisuals;
  spawner.ensureAhead(0, 300);
  assert.equal(coinVisuals + powerVisuals, warmed);
});

test('PowerUp tracks independent timers, one-shot shield and non-stacking boost reset', async () => {
  const module = await loadModule('../src/systems/PowerUp.js');
  assert.ok(module, 'PowerUp module must exist');

  const powerUp = new module.PowerUp({ config: CONFIG });
  powerUp.activate('MAGNET');
  powerUp.activate('SHIELD');
  powerUp.activate('BOOST');
  assert.equal(powerUp.boostActive, true);
  powerUp.update(CONFIG.powerUp.boostDuration / 2);
  powerUp.activate('BOOST');
  assert.equal(powerUp.magnetRemaining > 0, true);
  assert.equal(powerUp.shieldActive, true);
  assert.equal(powerUp.boostRemaining, CONFIG.powerUp.boostDuration);
  assert.equal(powerUp.consumeShield(), true);
  assert.equal(powerUp.consumeShield(), false);
  powerUp.update(CONFIG.powerUp.boostDuration);
  assert.equal(powerUp.boostRemaining, 0);
  assert.equal(powerUp.boostActive, false);
});

test('ChunkPool recycles decoration records without growing active storage', async () => {
  const module = await import('../src/world/ChunkPool.js');
  const pool = new module.ChunkPool({ size: 2, create: () => ({ visible: false }) });
  const first = pool.acquire(10, 'dune');
  pool.acquire(20, 'lantern');
  assert.equal(pool.activeCount(), 2);
  assert.equal(pool.acquire(30), null);
  pool.recycleBefore(15, (slot) => { slot.item.visible = false; });
  assert.equal(pool.activeCount(), 1);
  assert.equal(pool.freeCount(), 1);
  const reused = pool.acquire(40, 'dune');
  assert.equal(reused.item.visible, false);
  assert.equal(first.active, true);
});
