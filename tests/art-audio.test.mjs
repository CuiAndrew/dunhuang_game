import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';

import { CONFIG } from '../src/core/Config.js';
import { PALETTE as DUNHUANG_PALETTE } from '../src/art/Palette.js';

const PALETTE = Object.freeze({
  plaster: 0xF0E2C8,
  sand: 0xE3C68B,
  ochreRed: 0xA63B29,
  stoneGreen: 0x3E7C59,
  stoneBlue: 0x2E5C8A,
  dunhuangGold: 0xE8B23A,
  cinnabar: 0xC8402F,
});

function createCanvasContext() {
  return {
    createLinearGradient: () => ({ addColorStop() {} }),
    fillRect() {}, strokeRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
    arc() {}, ellipse() {}, fill() {}, clearRect() {},
  };
}

const TEST_DOCUMENT = {
  createElement: () => ({ getContext: () => createCanvasContext() }),
};

const TEST_THREE = {
  CanvasTexture: class CanvasTexture { constructor(canvas) { this.canvas = canvas; } },
  SRGBColorSpace: 'srgb',
  RepeatWrapping: 'repeat',
};

test('art adapters retain procedural fallbacks beside optional local textures', async () => {
  const textures = await import('../src/art/Textures.js');
  const fx = await import('../src/art/Fx.js');
  const sfx = await import('../src/audio/Sfx.js');
  const props = await import('../src/art/Props.js');
  assert.equal(typeof textures.createTextureSet, 'function');
  assert.equal(typeof fx.FxSystem, 'function');
  assert.equal(typeof fx.FxSystem.prototype.triggerImpact, 'function');
  assert.equal(typeof fx.FxSystem.prototype.setSpeedIntensity, 'function');
  assert.equal(typeof sfx.Sfx, 'function');
  assert.equal(typeof sfx.Sfx.prototype.startAmbient, 'function');
  assert.equal(typeof sfx.Sfx.prototype.stopAmbient, 'function');
  assert.equal(typeof sfx.Sfx.prototype.setDanger, 'function');
  assert.equal(typeof props.createPursuerVisual, 'function');
  assert.equal(typeof props.createPickupVisual, 'function');
  assert.equal(typeof props.createEnvironmentVisual, 'function');
});

test('texture cache is isolated by theme id but reuses same-theme textures', async () => {
  const { createTextureSet } = await import('../src/art/Textures.js');
  const dunhuangA = createTextureSet(TEST_THREE, TEST_DOCUMENT, PALETTE, 'dunhuang');
  const dunhuangB = createTextureSet(TEST_THREE, TEST_DOCUMENT, PALETTE, 'dunhuang');
  const shanghai = createTextureSet(TEST_THREE, TEST_DOCUMENT, PALETTE, 'shanghai-bund');

  assert.equal(dunhuangA.sky, dunhuangB.sky);
  assert.ok(dunhuangA.paper);
  assert.ok(dunhuangA.clouds);
  assert.ok(dunhuangA.mural);
  assert.equal(dunhuangA.paper, dunhuangB.paper);
  assert.equal(dunhuangA.clouds, dunhuangB.clouds);
  assert.notEqual(dunhuangA.sky, shanghai.sky);
});

test('theme image loader preserves nested assets and falls back per failed image', async () => {
  const { loadImageTextures } = await import('../src/art/AssetLoader.js');
  const loaded = [];
  const loader = {
    async loadAsync(url) {
      if (url === 'missing.png') throw new Error('missing local art');
      const texture = { url, colorSpace: null };
      loaded.push(texture);
      return texture;
    },
  };
  const result = await loadImageTextures(TEST_THREE, {
    background: 'scene.png',
    runner: { runFrames: ['run-0.png', 'missing.png'], jump: 'jump.png' },
  }, loader);

  assert.equal(result.background.url, 'scene.png');
  assert.equal(result.runner.runFrames[0].url, 'run-0.png');
  assert.equal(result.runner.runFrames[1], null);
  assert.equal(result.runner.jump.url, 'jump.png');
  assert.equal(loaded.every((texture) => texture.colorSpace === TEST_THREE.SRGBColorSpace), true);
});

test('Dunhuang visual factories expose recognizable semantic variants', async () => {
  const props = await import('../src/art/Props.js');
  const beam = props.createObstacleVisual(THREE, DUNHUANG_PALETTE, CONFIG);
  beam.setType('BEAM');
  assert.equal(beam.userData.obstacleType, 'BEAM');
  assert.ok(beam.userData.heightOffset > 0);
  for (const type of ['PILLAR', 'FIRE', 'GAP', 'LOW_BARRIER']) {
    beam.setType(type);
    assert.equal(beam.userData.obstacleType, type);
    assert.ok(beam.userData.heightOffset > 0);
  }

  const coin = props.createPickupVisual(THREE, DUNHUANG_PALETTE, 'COIN');
  assert.equal(coin.userData.kind, 'COIN');
  for (const type of ['SHIELD', 'BOOST', 'MAGNET']) {
    coin.setType(type);
    assert.equal(coin.userData.kind, type);
  }
  const environment = props.createEnvironmentVisual(THREE, DUNHUANG_PALETTE);
  environment.setKind('TEMPLE');
  assert.equal(environment.userData.activeKind, 'TEMPLE');
  for (const kind of ['DUNE', 'CAVE', 'LANTERN', 'FLAG']) {
    environment.setKind(kind);
    assert.equal(environment.userData.activeKind, kind);
  }

  const runner = props.createRunnerVisual(THREE, DUNHUANG_PALETTE, CONFIG);
  assert.ok(runner.root.children.includes(runner.leftLeg));
  assert.ok(runner.root.children.includes(runner.rightLeg));
  assert.ok(runner.root.getObjectByName('flying-ribbon'));
  assert.ok(runner.root.getObjectByName('mural-halo'));
  assert.ok(runner.root.getObjectByName('face-mark'));
  const coinHole = coin.getObjectByName('coin-hole');
  assert.ok(coinHole);
});

test('Dunhuang runner art switches between local run, jump and slide sprites', async () => {
  const { createRunnerVisual } = await import('../src/art/Props.js');
  const runFrames = Array.from({ length: 8 }, () => new THREE.Texture());
  const jump = new THREE.Texture();
  const slide = new THREE.Texture();
  const visual = createRunnerVisual(THREE, DUNHUANG_PALETTE, CONFIG, {
    runner: { runFrames, jump, slide },
  });
  const sprite = visual.root.getObjectByName('dunhuang-runner-sprite');

  assert.ok(sprite?.isSprite, 'the art-backed runner should remain a billboard sprite');
  assert.ok(visual.root.children.includes(visual.leftLeg));
  assert.ok(visual.root.children.includes(visual.rightLeg));
  visual.update(0, 'RUN');
  assert.equal(sprite.material.map, runFrames[0]);
  visual.update(0.15, 'RUN');
  assert.notEqual(sprite.material.map, runFrames[0], 'running advances the sprite sequence');
  visual.update(0.01, 'JUMP');
  assert.equal(sprite.material.map, jump);
  visual.update(0.01, 'SLIDE');
  assert.equal(sprite.material.map, slide);
});

test('obstacle and pickup art remains inside existing visual variant APIs', async () => {
  const { createObstacleVisual, createPickupVisual } = await import('../src/art/Props.js');
  const images = {
    obstacles: {
      BEAM: new THREE.Texture(),
      PILLAR: new THREE.Texture(),
      FIRE: new THREE.Texture(),
      LOW_BARRIER: new THREE.Texture(),
    },
    coin: new THREE.Texture(),
    powerUps: {
      SHIELD: new THREE.Texture(),
      BOOST: new THREE.Texture(),
      MAGNET: new THREE.Texture(),
    },
  };
  const palette = Object.freeze({ ...DUNHUANG_PALETTE });
  const obstacle = createObstacleVisual(THREE, palette, CONFIG, { props: images });
  const pickup = createPickupVisual(THREE, palette, 'COIN', { props: images });

  obstacle.setType('BEAM');
  pickup.setType('MAGNET');
  assert.equal(obstacle.getObjectByName('beam-art').material.map, images.obstacles.BEAM);
  assert.equal(obstacle.userData.obstacleType, 'BEAM');
  assert.equal(obstacle.userData.heightOffset, obstacle.getObjectByName('beam').userData.heightOffset);
  assert.equal(pickup.getObjectByName('MAGNET-art').material.map, images.powerUps.MAGNET);
  assert.equal(pickup.userData.kind, 'MAGNET');
});

test('pooled visual factories share geometry and material resources by theme', async () => {
  const props = await import('../src/art/Props.js');
  const firstMesh = (root) => {
    let mesh = null;
    root.traverse((node) => {
      if (!mesh && node.isMesh) mesh = node;
    });
    return mesh;
  };
  const firstVariantMesh = (root, name) => firstMesh(root.getObjectByName(name.toLowerCase()));

  const obstacleA = props.createObstacleVisual(THREE, DUNHUANG_PALETTE, CONFIG);
  const obstacleB = props.createObstacleVisual(THREE, DUNHUANG_PALETTE, CONFIG);
  const pickupA = props.createPickupVisual(THREE, DUNHUANG_PALETTE, 'COIN');
  const pickupB = props.createPickupVisual(THREE, DUNHUANG_PALETTE, 'COIN');
  const environmentA = props.createEnvironmentVisual(THREE, DUNHUANG_PALETTE);
  const environmentB = props.createEnvironmentVisual(THREE, DUNHUANG_PALETTE);

  for (const name of ['BEAM', 'PILLAR', 'FIRE', 'GAP', 'LOW_BARRIER']) {
    assert.equal(firstVariantMesh(obstacleA, name).geometry, firstVariantMesh(obstacleB, name).geometry);
    assert.equal(firstVariantMesh(obstacleA, name).material, firstVariantMesh(obstacleB, name).material);
  }
  for (const name of ['COIN', 'SHIELD', 'BOOST', 'MAGNET']) {
    assert.equal(firstVariantMesh(pickupA, name).geometry, firstVariantMesh(pickupB, name).geometry);
    assert.equal(firstVariantMesh(pickupA, name).material, firstVariantMesh(pickupB, name).material);
  }
  for (const name of ['DUNE', 'TEMPLE', 'CAVE', 'LANTERN', 'FLAG']) {
    assert.equal(firstVariantMesh(environmentA, name).geometry, firstVariantMesh(environmentB, name).geometry);
    assert.equal(firstVariantMesh(environmentA, name).material, firstVariantMesh(environmentB, name).material);
  }
});

test('Sfx gracefully degrades when Web Audio is unavailable', async () => {
  const { Sfx } = await import('../src/audio/Sfx.js');
  const sfx = new Sfx({ config: { audio: {} }, storage: { getItem: () => null, setItem: () => {} } });
  assert.equal(await sfx.resume(), false);
});

test('Sfx keeps startup alive when mute preference storage is blocked', async () => {
  const { Sfx } = await import('../src/audio/Sfx.js');
  const blockedStorage = {
    getItem: () => { throw new Error('storage blocked'); },
    setItem: () => { throw new Error('storage blocked'); },
  };
  const sfx = new Sfx({ config: { audio: {} }, storage: blockedStorage });
  assert.equal(sfx.muted, false);
  assert.equal(sfx.toggleMute(), true);
});

test('Sfx keeps the game start path alive when AudioContext construction fails', async () => {
  const { Sfx } = await import('../src/audio/Sfx.js');
  const previousWindow = globalThis.window;
  globalThis.window = { AudioContext: class { constructor() { throw new Error('blocked'); } } };
  const sfx = new Sfx({ config: { audio: {} }, storage: { getItem: () => null, setItem: () => {} } });
  assert.equal(await sfx.resume(), false);
  globalThis.window = previousWindow;
});

test('Sfx maps runner and pursuer events to distinct procedural sound profiles', async () => {
  const { Sfx } = await import('../src/audio/Sfx.js');
  const calls = [];
  const context = {
    currentTime: 10,
    destination: {},
    createOscillator() {
      const oscillator = {
        type: null,
        frequency: {
          setValueAtTime: (value) => { oscillator.startFrequency = value; },
          linearRampToValueAtTime: (value) => { oscillator.endFrequency = value; },
        },
        connect: () => oscillator,
        start: () => { calls.push(oscillator); },
        stop: () => {},
      };
      return oscillator;
    },
    createGain() {
      const gain = {
        gain: {
          setValueAtTime: () => {},
          exponentialRampToValueAtTime: () => {},
        },
        connect: () => gain,
      };
      return gain;
    },
  };
  const sfx = new Sfx({
    config: { audio: { coinFrequency: 880, coinEndFrequency: 1320, masterVolume: 0.08 } },
    storage: { getItem: () => null, setItem: () => {} },
  });
  sfx.context = context;

  sfx.play('jump');
  sfx.play('slide');
  sfx.play('roar');

  assert.deepEqual(calls.map(({ type, startFrequency, endFrequency }) => ({ type, startFrequency, endFrequency })), [
    { type: 'sine', startFrequency: 320, endFrequency: 560 },
    { type: 'sawtooth', startFrequency: 180, endFrequency: 90 },
    { type: 'sawtooth', startFrequency: 90, endFrequency: 42 },
  ]);
});

test('Sfx tracks danger heartbeat state without requiring Web Audio', async () => {
  const { Sfx } = await import('../src/audio/Sfx.js');
  const sfx = new Sfx({ config: { audio: {} }, storage: { getItem: () => null, setItem: () => {} } });
  sfx.setDanger(true);
  assert.equal(sfx.dangerActive, true);
  sfx.setDanger(false);
  assert.equal(sfx.dangerActive, false);
});

test('Sfx clears danger heartbeat when the game is paused', async () => {
  const { Sfx } = await import('../src/audio/Sfx.js');
  const sfx = new Sfx({ config: { audio: {} }, storage: { getItem: () => null, setItem: () => {} } });
  sfx.setDanger(true);
  sfx.setDanger(false);
  assert.equal(sfx.dangerTimer, null);
});
