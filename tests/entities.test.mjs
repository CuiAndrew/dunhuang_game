import assert from 'node:assert/strict';
import test from 'node:test';
import { CONFIG } from '../src/core/Config.js';

class TestVector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.set(x, y, z);
  }

  set(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
}

class TestNode {
  constructor() {
    this.position = new TestVector3();
    this.rotation = { x: 0, y: 0, z: 0 };
    this.scale = new TestVector3(1, 1, 1);
    this.children = [];
  }

  add(...children) {
    this.children.push(...children);
  }
}

class TestMesh extends TestNode {}
class TestGeometry {}
class TestMaterial {}

const TEST_THREE = {
  Group: TestNode,
  Mesh: TestMesh,
  CapsuleGeometry: TestGeometry,
  SphereGeometry: TestGeometry,
  CircleGeometry: TestGeometry,
  CylinderGeometry: TestGeometry,
  MeshStandardMaterial: TestMaterial,
  MeshBasicMaterial: TestMaterial,
  DoubleSide: 'DoubleSide',
};

function createTrack() {
  return {
    evalTrack(s, out) {
      out.position.set(0, 0, s);
      out.forward.set(0, 0, 1);
      out.right.set(1, 0, 0);
      return out;
    },
  };
}

async function loadModule(path) {
  try {
    return await import(path);
  } catch {
    return null;
  }
}

test('Runner advances along the shared track frame at the configured speed', async () => {
  const module = await loadModule('../src/entities/Runner.js');
  assert.ok(module, 'Runner module must exist');

  const runner = new module.Runner({
    THREE: TEST_THREE,
    Vector3: TestVector3,
    track: createTrack(),
    config: CONFIG,
    palette: { ochreRed: 0, plaster: 0, dunhuangGold: 0, stoneBlue: 0 },
  });

  runner.update(0.5);
  assert.equal(runner.s, CONFIG.runner.baseSpeed * 0.5);
  assert.equal(runner.root.position.z, runner.s);
  assert.equal(runner.root.position.y, CONFIG.scene.runnerBaseHeight);
});

test('Pursuer keeps runner at hit speed and recovers linearly over the penalty window', async () => {
  const { Runner } = await import('../src/entities/Runner.js');
  const { Pursuer } = await import('../src/entities/Pursuer.js');
  const runner = new Runner({
    THREE: TEST_THREE,
    Vector3: TestVector3,
    track: createTrack(),
    config: CONFIG,
    palette: { ochreRed: 0, plaster: 0, dunhuangGold: 0, stoneBlue: 0, ink: 0 },
  });
  const pursuer = new Pursuer({ config: CONFIG, createVisual: () => null });

  runner.update(CONFIG.loop.fixedDt);
  const naturalAtHit = CONFIG.runner.baseSpeed + runner.s * CONFIG.runner.accelPerMeter;
  pursuer.registerHit(runner);
  assert.ok(Math.abs(runner.speed / naturalAtHit - CONFIG.runner.hitSpeedPenalty) < 1e-9);

  runner.update(CONFIG.loop.fixedDt);
  pursuer.update(runner, CONFIG.loop.fixedDt);
  const naturalAfterFirstPenaltyFrame = CONFIG.runner.baseSpeed + runner.s * CONFIG.runner.accelPerMeter;
  assert.ok(Math.abs(runner.speed / naturalAfterFirstPenaltyFrame - CONFIG.runner.hitSpeedPenalty) < 1e-9);

  runner.update(CONFIG.loop.fixedDt);
  pursuer.update(runner, CONFIG.loop.fixedDt);
  const naturalAfterOneFrame = CONFIG.runner.baseSpeed + runner.s * CONFIG.runner.accelPerMeter;
  const factorAfterOneFrame = runner.speed / naturalAfterOneFrame;
  assert.ok(factorAfterOneFrame > CONFIG.runner.hitSpeedPenalty);
  assert.ok(factorAfterOneFrame < 0.42);

  for (let frame = 1; frame < 72; frame += 1) {
    runner.update(CONFIG.loop.fixedDt);
    pursuer.update(runner, CONFIG.loop.fixedDt);
  }
  const naturalAfterRecovery = CONFIG.runner.baseSpeed + runner.s * CONFIG.runner.accelPerMeter;
  assert.ok(Math.abs(runner.speed / naturalAfterRecovery - 1) < 0.01);
});

test('CameraRig follows the runner from behind and increases FOV with speed', async () => {
  const module = await loadModule('../src/entities/CameraRig.js');
  assert.ok(module, 'CameraRig module must exist');

  const camera = {
    position: new TestVector3(),
    fov: CONFIG.camera.fovBase,
    updateProjectionMatrixCalls: 0,
    updateProjectionMatrix() {
      this.updateProjectionMatrixCalls += 1;
    },
    lookAt(x, y, z) {
      this.lookTarget = { x, y, z };
    },
  };
  const runner = { s: 20, lateral: 0, speed: CONFIG.runner.maxSpeed };
  const rig = new module.CameraRig({
    camera,
    Vector3: TestVector3,
    track: createTrack(),
    config: CONFIG,
  });

  rig.snapTo(runner);
  rig.update(runner, 0.1);

  assert.equal(camera.position.z, runner.s - CONFIG.camera.offsetBack);
  assert.equal(camera.lookTarget.z, runner.s + CONFIG.camera.lookAhead);
  assert.equal(camera.fov, CONFIG.camera.fovMax);
  assert.ok(camera.updateProjectionMatrixCalls > 0);
});

test('CameraRig applies a bounded impact shake after a collision', async () => {
  const module = await loadModule('../src/entities/CameraRig.js');
  assert.ok(module, 'CameraRig module must exist');
  const camera = {
    position: new TestVector3(),
    fov: CONFIG.camera.fovBase,
    updateProjectionMatrix() {},
    lookAt() {},
  };
  const rig = new module.CameraRig({ camera, Vector3: TestVector3, track: createTrack(), config: CONFIG });
  rig.snapTo({ s: 20, lateral: 0, speed: CONFIG.runner.baseSpeed });
  const baseline = camera.position.x;
  rig.triggerShake();
  rig.update({ s: 20, lateral: 0, speed: CONFIG.runner.baseSpeed }, 0.04);
  assert.notEqual(camera.position.x, baseline);
  assert.equal(rig.shakeRemaining > 0, true);
});

test('Runner exposes lane, jump and slide actions with fixed-duration movement rules', async () => {
  const module = await loadModule('../src/entities/Runner.js');
  assert.ok(module, 'Runner module must exist');

  const runner = new module.Runner({
    THREE: TEST_THREE,
    Vector3: TestVector3,
    track: createTrack(),
    config: CONFIG,
    palette: { ochreRed: 0, plaster: 0, dunhuangGold: 0, stoneBlue: 0, ink: 0 },
  });
  assert.equal(typeof runner.handleAction, 'function', 'Runner must receive semantic input actions');
  assert.equal(typeof runner.moveLane, 'function', 'Runner must support lane movement');
  if (typeof runner.handleAction !== 'function' || typeof runner.moveLane !== 'function') {
    return;
  }

  runner.handleAction('LEFT');
  runner.update(CONFIG.runner.laneChangeTime);
  assert.equal(runner.laneIndex, 0);
  assert.equal(runner.lateral, CONFIG.laneOffsets[0]);

  runner.handleAction('JUMP');
  runner.update(CONFIG.runner.jumpRiseTime);
  assert.equal(runner.state, 'JUMP');
  assert.ok(Math.abs(runner.verticalOffset - CONFIG.runner.jumpHeight) < 0.0001);
  runner.update(CONFIG.runner.jumpFallTime);
  assert.equal(runner.state, 'RUN');
  assert.equal(runner.verticalOffset, 0);

  runner.handleAction('SLIDE');
  assert.equal(runner.state, 'SLIDE');
  assert.equal(runner.collisionHeight, CONFIG.runner.slideCollisionHeight);
  runner.update(CONFIG.runner.slideTime);
  assert.equal(runner.state, 'RUN');
  assert.equal(runner.collisionHeight, CONFIG.runner.runCollisionHeight);
});

test('Runner applies an active boost multiplier to forward speed', async () => {
  const module = await loadModule('../src/entities/Runner.js');
  assert.ok(module, 'Runner module must exist');
  const runner = new module.Runner({
    THREE: TEST_THREE,
    Vector3: TestVector3,
    track: createTrack(),
    config: CONFIG,
    palette: { ochreRed: 0, plaster: 0, dunhuangGold: 0, stoneBlue: 0, ink: 0 },
  });
  runner.setSpeedMultiplier(1.5);
  runner.update(0.2);
  assert.equal(runner.speed, Math.min(CONFIG.runner.maxSpeed, CONFIG.runner.baseSpeed + runner.s * CONFIG.runner.accelPerMeter) * 1.5);
});

test('Runner does not restart a jump from airborne input or stale jump buffering', async () => {
  const module = await loadModule('../src/entities/Runner.js');
  assert.ok(module, 'Runner module must exist');
  const runner = new module.Runner({
    THREE: TEST_THREE,
    Vector3: TestVector3,
    track: createTrack(),
    config: CONFIG,
    palette: { ochreRed: 0, plaster: 0, dunhuangGold: 0, stoneBlue: 0, ink: 0 },
  });

  runner.handleAction('JUMP');
  runner.update(0.2);
  const elapsedBeforeAirborneInput = runner.jumpElapsed;
  runner.handleAction('JUMP');
  runner.update(0.02);
  assert.ok(runner.jumpElapsed > elapsedBeforeAirborneInput);
  runner.update(CONFIG.runner.jumpAirTime);
  assert.equal(runner.state, module.RUNNER_STATES.RUN);
});
