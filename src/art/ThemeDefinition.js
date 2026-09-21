// Defines and validates the stable visual contract shared by every registered theme.
const REQUIRED_FACTORY_NAMES = Object.freeze([
  'createTextures',
  'createRunnerVisual',
  'createPursuerVisual',
  'createObstacleVisual',
  'createPickupVisual',
  'createEnvironmentVisual',
]);

const REQUIRED_PALETTE_KEYS = Object.freeze([
  'ochreRed', 'cinnabar', 'stoneBlue', 'stoneGreen', 'earthYellow',
  'dunhuangGold', 'bronze', 'sand', 'plaster', 'ink', 'nightTeal',
]);

const REQUIRED_SCENE_KEYS = Object.freeze(['backgroundColor', 'fogColor', 'skyTextureName']);

export function assertThemeDefinition(theme) {
  const missing = [];
  if (!theme || typeof theme !== 'object') {
    throw new Error('Theme definition must be an object.');
  }
  if (typeof theme.id !== 'string' || theme.id.length === 0) missing.push('id');
  if (!theme.palette || typeof theme.palette !== 'object') {
    missing.push('palette');
  } else {
    for (const key of REQUIRED_PALETTE_KEYS) {
      if (theme.palette[key] === undefined || theme.palette[key] === null) {
        missing.push(`palette.${key}`);
      }
    }
  }
  if (!theme.scene || typeof theme.scene !== 'object') {
    missing.push('scene');
  } else {
    for (const key of REQUIRED_SCENE_KEYS) {
      const value = theme.scene[key];
      if (
        value === undefined
        || value === null
        || (key === 'skyTextureName' && (typeof value !== 'string' || value.trim() === ''))
      ) {
        missing.push(`scene.${key}`);
      }
    }
  }
  for (const name of REQUIRED_FACTORY_NAMES) {
    if (typeof theme[name] !== 'function') missing.push(name);
  }
  if (missing.length > 0) {
    throw new Error(`Theme "${theme.id ?? 'unknown'}" is missing: ${missing.join(', ')}`);
  }
  return theme;
}

export { REQUIRED_FACTORY_NAMES, REQUIRED_PALETTE_KEYS, REQUIRED_SCENE_KEYS };
