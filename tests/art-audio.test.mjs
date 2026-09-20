import assert from 'node:assert/strict';
import test from 'node:test';

test('art and audio modules expose procedural-only factories', async () => {
  const textures = await import('../src/art/Textures.js');
  const fx = await import('../src/art/Fx.js');
  const sfx = await import('../src/audio/Sfx.js');
  const props = await import('../src/art/Props.js');
  assert.equal(typeof textures.createTextureSet, 'function');
  assert.equal(typeof fx.FxSystem, 'function');
  assert.equal(typeof sfx.Sfx, 'function');
  assert.equal(typeof props.createPursuerVisual, 'function');
  assert.equal(typeof props.createPickupVisual, 'function');
});

test('Sfx gracefully degrades when Web Audio is unavailable', async () => {
  const { Sfx } = await import('../src/audio/Sfx.js');
  const sfx = new Sfx({ config: { audio: {} }, storage: { getItem: () => null, setItem: () => {} } });
  assert.equal(await sfx.resume(), false);
});

test('Sfx keeps the game start path alive when AudioContext construction fails', async () => {
  const { Sfx } = await import('../src/audio/Sfx.js');
  const previousWindow = globalThis.window;
  globalThis.window = { AudioContext: class { constructor() { throw new Error('blocked'); } } };
  const sfx = new Sfx({ config: { audio: {} }, storage: { getItem: () => null, setItem: () => {} } });
  assert.equal(await sfx.resume(), false);
  globalThis.window = previousWindow;
});
