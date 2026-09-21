// Defines and validates the stable visual contract shared by every registered theme.
const REQUIRED_FACTORY_NAMES = Object.freeze([
  'createTextures',
  'createRunnerVisual',
  'createPursuerVisual',
  'createObstacleVisual',
  'createPickupVisual',
  'createEnvironmentVisual',
]);

export function assertThemeDefinition(theme) {
  const missing = [];
  if (!theme || typeof theme !== 'object') {
    throw new Error('Theme definition must be an object.');
  }
  if (typeof theme.id !== 'string' || theme.id.length === 0) missing.push('id');
  if (!theme.palette || typeof theme.palette !== 'object') missing.push('palette');
  if (!theme.scene || typeof theme.scene !== 'object') missing.push('scene');
  for (const name of REQUIRED_FACTORY_NAMES) {
    if (typeof theme[name] !== 'function') missing.push(name);
  }
  if (missing.length > 0) {
    throw new Error(`Theme "${theme.id ?? 'unknown'}" is missing: ${missing.join(', ')}`);
  }
  return theme;
}

export { REQUIRED_FACTORY_NAMES };
