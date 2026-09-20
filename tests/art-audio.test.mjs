import assert from 'node:assert/strict';
import test from 'node:test';

test('art and audio modules expose procedural-only factories', async () => {
  const textures = await import('../src/art/Textures.js');
  const fx = await import('../src/art/Fx.js');
  const sfx = await import('../src/audio/Sfx.js');
  assert.equal(typeof textures.createTextureSet, 'function');
  assert.equal(typeof fx.FxSystem, 'function');
  assert.equal(typeof sfx.Sfx, 'function');
});
