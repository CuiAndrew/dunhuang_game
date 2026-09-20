import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { CONFIG } from '../src/core/Config.js';
import { Runner } from '../src/entities/Runner.js';
import { EnvironmentSystem } from '../src/world/Environment.js';
import { ObstacleSpawner } from '../src/world/ObstacleSpawner.js';
import { PickupSpawner } from '../src/world/PickupSpawner.js';
import { TrackGraph } from '../src/world/TrackGraph.js';

test('five-minute deterministic run keeps world pools bounded and difficulty rising', () => {
  const track = new TrackGraph({ Vector3: THREE.Vector3, config: CONFIG, random: () => 0.31 });
  const runner = new Runner({ THREE, Vector3: THREE.Vector3, track, config: CONFIG, palette: { ochreRed: 0xA63B29, plaster: 0xF0E2C8, dunhuangGold: 0xE8B23A, stoneBlue: 0x2E5C8A, ink: 0x2B1F1A } });
  const obstacles = new ObstacleSpawner({ config: CONFIG, random: () => 0.8 });
  const pickups = new PickupSpawner({ config: CONFIG, random: () => 0.31 });
  const environment = new EnvironmentSystem({
    config: CONFIG,
    track,
    random: () => 0.31,
    createVisual: () => ({ visible: false, position: new THREE.Vector3(), rotation: { y: 0 } }),
  });
  let earlyGroups = 0;
  let lateGroups = 0;
  let earlyTwoLaneGroups = 0;
  let lateTwoLaneGroups = 0;
  for (let step = 0; step < 60 * 60 * 5; step += 1) {
    runner.update(CONFIG.loop.fixedDt);
    track.ensureAhead(runner.s, CONFIG.track.keepAhead);
    obstacles.ensureAhead(runner.s, CONFIG.track.keepAhead, Math.min(1, runner.s / 2500));
    obstacles.recycleBefore(runner.s - CONFIG.track.recycleBehind);
    pickups.ensureAhead(runner.s, CONFIG.track.keepAhead);
    pickups.recycleBefore(runner.s - CONFIG.track.recycleBehind);
    environment.update(runner.s, CONFIG.track.keepAhead);
    if (step === 60 * 60 * 1) {
      const snapshots = obstacles.getGroupSnapshots();
      earlyGroups = snapshots.length;
      earlyTwoLaneGroups = snapshots.filter((group) => group.occupiedLanes.length === 2).length;
    }
    if (step === 60 * 60 * 4) {
      const snapshots = obstacles.getGroupSnapshots();
      lateGroups = snapshots.length;
      lateTwoLaneGroups = snapshots.filter((group) => group.occupiedLanes.length === 2).length;
    }
  }
  assert.equal(track.sampleCount() <= CONFIG.track.samplePoolSize, true);
  assert.equal(obstacles.obstacleCount() <= CONFIG.spawn.obstaclePoolSize, true);
  assert.equal(pickups.poolStats().activeCoins <= CONFIG.spawn.coinPoolSize, true);
  assert.equal(environment.poolStats().active <= CONFIG.art.decorationPoolSize, true);
  assert.equal(runner.s > 2500, true);
  assert.equal(lateGroups >= earlyGroups, true);
  assert.equal(earlyTwoLaneGroups, 0);
  assert.equal(lateTwoLaneGroups > 0, true);
});
