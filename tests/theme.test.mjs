import assert from 'node:assert/strict';
import test from 'node:test';

test('theme registry exposes a validated Dunhuang theme and safe fallback', async () => {
  const { getTheme, listThemeIds } = await import('../src/art/ThemeRegistry.js');
  const theme = getTheme();
  const fallback = getTheme('does-not-exist');

  assert.equal(theme.id, 'dunhuang');
  assert.equal(fallback, theme);
  assert.deepEqual(listThemeIds(), ['dunhuang']);
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
