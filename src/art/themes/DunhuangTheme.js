// Composes the first production visual theme from the shared Dunhuang palette and procedural factories.
import { PALETTE } from '../Palette.js?v=20260920-12';
import { createTextureSet } from '../Textures.js?v=20260920-12';
import {
  createEnvironmentVisual as buildEnvironmentVisual,
  createObstacleVisual as buildObstacleVisual,
  createPickupVisual as buildPickupVisual,
  createPursuerVisual as buildPursuerVisual,
  createRunnerVisual as buildRunnerVisual,
} from '../Props.js?v=20260920-12';

export const DUNHUANG_THEME = Object.freeze({
  id: 'dunhuang',
  palette: PALETTE,
  scene: Object.freeze({
    backgroundColor: PALETTE.nightTeal,
    fogColor: PALETTE.nightTeal,
    skyTextureName: 'sky',
  }),
  createTextures: ({ THREE, document }) => createTextureSet(THREE, document, PALETTE, 'dunhuang'),
  createRunnerVisual: ({ THREE, config }) => buildRunnerVisual(THREE, PALETTE, config),
  createPursuerVisual: ({ THREE }) => buildPursuerVisual(THREE, PALETTE),
  createObstacleVisual: ({ THREE, config }) => buildObstacleVisual(THREE, PALETTE, config),
  createPickupVisual: ({ THREE, type }) => buildPickupVisual(THREE, PALETTE, type),
  createEnvironmentVisual: ({ THREE }) => buildEnvironmentVisual(THREE, PALETTE),
});
