// Composes the first production visual theme from the shared Dunhuang palette and procedural factories.
import { PALETTE } from '../Palette.js?v=20260921-13';
import { createTextureSet } from '../Textures.js?v=20260923-1';
import {
  createEnvironmentVisual as buildEnvironmentVisual,
  createObstacleVisual as buildObstacleVisual,
  createPickupVisual as buildPickupVisual,
  createPursuerVisual as buildPursuerVisual,
  createRunnerVisual as buildRunnerVisual,
} from '../Props.js?v=20260923-1';

const assetUrl = (path) => new URL(path, import.meta.url).href;
const runnerFrames = Object.freeze(Array.from({ length: 8 }, (_, index) => (
  assetUrl(`../assets/character/run/run_${String(index).padStart(2, '0')}.png`)
)));

const assets = Object.freeze({
  background: assetUrl('../assets/background/dunhuang_nightscape_v2.png'),
  runner: Object.freeze({
    runFrames: runnerFrames,
    jump: assetUrl('../assets/character/jump.png'),
    slide: assetUrl('../assets/character/slide.png'),
  }),
  props: Object.freeze({
    coin: assetUrl('../assets/props/coin.png'),
    obstacles: Object.freeze({
      BEAM: assetUrl('../assets/props/obstacles/gate.png'),
      PILLAR: assetUrl('../assets/props/obstacles/rubble.png'),
      FIRE: assetUrl('../assets/props/obstacles/brazier.png'),
      LOW_BARRIER: assetUrl('../assets/props/obstacles/crate.png'),
    }),
    powerUps: Object.freeze({
      SHIELD: assetUrl('../assets/props/powerups/shield.png'),
      BOOST: assetUrl('../assets/props/powerups/lotus_orb.png'),
      MAGNET: assetUrl('../assets/props/powerups/magnet.png'),
    }),
  }),
  hud: Object.freeze({
    portrait: assetUrl('../assets/hud/portrait.png'),
    score: assetUrl('../assets/hud/score.png'),
    distance: assetUrl('../assets/hud/distance.png'),
    coins: assetUrl('../assets/hud/coin_bar.png'),
    pause: assetUrl('../assets/hud/pause.png'),
    skill: assetUrl('../assets/hud/skill.png'),
    swipeHint: assetUrl('../assets/hud/swipe_hint.png'),
  }),
  ui: Object.freeze({
    titlePlaque: assetUrl('../assets/ui/title_plaque.png'),
    startButton: assetUrl('../assets/ui/start_button.png'),
    pausePanel: assetUrl('../assets/ui/pause_panel.png'),
    resultPanel: assetUrl('../assets/ui/result_panel.png'),
  }),
});

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
  assets,
  createTextures: ({ THREE, document }) => createTextureSet(THREE, document, PALETTE, 'dunhuang'),
  createRunnerVisual: ({ THREE, config, textures }) => buildRunnerVisual(THREE, PALETTE, config, textures),
  createPursuerVisual: ({ THREE, textures }) => buildPursuerVisual(THREE, PALETTE, textures),
  createObstacleVisual: ({ THREE, config, textures }) => buildObstacleVisual(THREE, PALETTE, config, textures),
  createPickupVisual: ({ THREE, type, textures }) => buildPickupVisual(THREE, PALETTE, type, textures),
  createEnvironmentVisual: ({ THREE, textures }) => buildEnvironmentVisual(THREE, PALETTE, textures),
});
