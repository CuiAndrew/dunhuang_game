// Owns theme registration and keeps runtime theme selection independent from gameplay systems.
import { DUNHUANG_THEME } from './themes/DunhuangTheme.js?v=20260921-13';
import { assertThemeDefinition } from './ThemeDefinition.js?v=20260921-13';

export const DEFAULT_THEME_ID = 'dunhuang';

const themes = new Map();

export function registerTheme(theme) {
  assertThemeDefinition(theme);
  themes.set(theme.id, theme);
  return theme;
}

export function getTheme(id = DEFAULT_THEME_ID) {
  return themes.get(id) ?? themes.get(DEFAULT_THEME_ID);
}

export function listThemeIds() {
  return [...themes.keys()].sort();
}

registerTheme(DUNHUANG_THEME);
