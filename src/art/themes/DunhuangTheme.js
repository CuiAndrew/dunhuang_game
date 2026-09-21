// Composes the first production visual theme from the shared Dunhuang palette and procedural factories.
import { PALETTE } from '../Palette.js?v=20260921-13';
import { createTextureSet } from '../Textures.js?v=20260921-13';
import {
  createEnvironmentVisual as buildEnvironmentVisual,
  createObstacleVisual as buildObstacleVisual,
  createPickupVisual as buildPickupVisual,
  createPursuerVisual as buildPursuerVisual,
  createRunnerVisual as buildRunnerVisual,
} from '../Props.js?v=20260921-13';

export const DUNHUANG_THEME = Object.freeze({
  id: 'dunhuang',
  palette: PALETTE,
  scene: Object.freeze({
    backgroundColor: PALETTE.caveNight,
    fogColor: PALETTE.caveNight,
    skyTextureName: 'sky',
    ambientColor: PALETTE.muralBlue,
    keyLightColor: PALETTE.muralGold,
    fillLightColor: PALETTE.turquoise,
  }),
  createTextures: ({ THREE, document }) => createTextureSet(THREE, document, PALETTE, 'dunhuang'),
  createRunnerVisual: ({ THREE, config, textures }) => buildRunnerVisual(THREE, PALETTE, config, textures),
  createPursuerVisual: ({ THREE, textures }) => buildPursuerVisual(THREE, PALETTE, textures),
  createObstacleVisual: ({ THREE, config, textures }) => buildObstacleVisual(THREE, PALETTE, config, textures),
  createPickupVisual: ({ THREE, type, textures }) => buildPickupVisual(THREE, PALETTE, type, textures),
  createEnvironmentVisual: ({ THREE, textures }) => buildEnvironmentVisual(THREE, PALETTE, textures),
});
