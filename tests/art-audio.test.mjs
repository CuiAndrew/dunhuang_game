import assert from 'node:assert/strict';
import test from 'node:test';

test('art and audio modules expose procedural-only factories', async () => {
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
