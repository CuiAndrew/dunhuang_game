import assert from 'node:assert/strict';
import test from 'node:test';

test('theme registry exposes a validated Dunhuang theme and safe fallback', async () => {
  const { getTheme, listThemeIds } = await import('../src/art/ThemeRegistry.js');
  const { PALETTE } = await import('../src/art/Palette.js');
  const theme = getTheme();
  const fallback = getTheme('does-not-exist');

  assert.equal(theme.id, 'dunhuang');
  assert.equal(fallback, theme);
  assert.deepEqual(listThemeIds(), ['dunhuang']);
  assert.equal(theme.scene.backgroundColor, PALETTE.caveNight);
  assert.equal(theme.scene.fogColor, PALETTE.caveNight);
  assert.equal(theme.scene.skyTextureName, 'sky');
  assert.equal(typeof theme.scene.ambientColor, 'number');
  assert.equal(typeof theme.scene.keyLightColor, 'number');
  assert.equal(typeof theme.scene.fillLightColor, 'number');
  assert.equal(theme.palette.muralBlue, 0x244B7A);
  assert.equal(theme.palette.turquoise, 0x3D9B9B);
  assert.equal(theme.palette.paper, 0xF6E7C8);
  for (const name of [
    'createTextures', 'createRunnerVisual', 'createPursuerVisual',
    'createObstacleVisual', 'createPickupVisual', 'createEnvironmentVisual',
  ]) assert.equal(typeof theme[name], 'function', `${name} must be a theme factory`);
});

test('theme contract reports the first missing visual field', async () => {
  const { assertThemeDefinition } = await import('../src/art/ThemeDefinition.js');

  assert.throws(
    () => assertThemeDefinition({ id: 'broken' }),
    (error) => error instanceof Error
      && error.message.includes('palette')
      && error.message.includes('createTextures'),
  );
});

test('theme contract validates palette and scene token fields', async () => {
  const { assertThemeDefinition } = await import('../src/art/ThemeDefinition.js');
  const factory = () => {};
  const incomplete = {
    id: 'incomplete',
    palette: {},
    scene: {},
    createTextures: factory,
    createRunnerVisual: factory,
    createPursuerVisual: factory,
    createObstacleVisual: factory,
    createPickupVisual: factory,
    createEnvironmentVisual: factory,
  };

  assert.throws(
    () => assertThemeDefinition(incomplete),
    (error) => error instanceof Error
      && error.message.includes('palette.ochreRed')
      && error.message.includes('scene.backgroundColor')
      && error.message.includes('scene.skyTextureName'),
  );

  const { getTheme } = await import('../src/art/ThemeRegistry.js');
  const invalidSceneType = {
    ...getTheme(),
    scene: { ...getTheme().scene, skyTextureName: 42 },
  };
  assert.throws(
    () => assertThemeDefinition(invalidSceneType),
    (error) => error instanceof Error && error.message.includes('scene.skyTextureName'),
  );
});
