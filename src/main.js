// Boots the Three.js scene, connects its state to the procedural track, and renders the playable preview.
import * as THREE from 'three';
import { PALETTE } from './art/Palette.js';
import { createObstacleVisual } from './art/Props.js';
import { CONFIG } from './core/Config.js';
import { GAME_STATES, GameState } from './core/GameState.js';
import { Input } from './core/Input.js';
import { FixedStepLoop } from './core/Loop.js';
import { CameraRig } from './entities/CameraRig.js';
import { Runner } from './entities/Runner.js';
import { Pursuer } from './entities/Pursuer.js';
import { Hud } from './ui/Hud.js';
import { Screens } from './ui/Screens.js';
import { CollisionSystem } from './systems/Collision.js';
import { PowerUp } from './systems/PowerUp.js';
import { Score } from './systems/Score.js';
import { PickupSpawner } from './world/PickupSpawner.js';
import { ObstacleSpawner } from './world/ObstacleSpawner.js';
import { TrackGraph } from './world/TrackGraph.js';
import { TrackMesh } from './world/TrackMesh.js';

const canvas = document.querySelector('#game-canvas');
const errorPanel = document.querySelector('#error-panel');
const errorMessage = document.querySelector('#error-message');
const screenLayer = document.querySelector('#screen-layer');

function showRuntimeError(error) {
  const message = error instanceof Error ? error.message : String(error);
  errorMessage.textContent = `游戏无法继续运行：${message}`;
  errorPanel.hidden = false;
}

window.addEventListener('error', (event) => {
  showRuntimeError(event.error ?? event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  showRuntimeError(event.reason);
});

try {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.render.maxPixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.nightTeal);
  scene.fog = new THREE.Fog(PALETTE.nightTeal, CONFIG.scene.fogNear, CONFIG.scene.fogFar);

  const camera = new THREE.PerspectiveCamera(CONFIG.camera.fovBase, 1, CONFIG.camera.near, CONFIG.camera.far);
  const hemisphere = new THREE.HemisphereLight(PALETTE.stoneBlue, PALETTE.sand, CONFIG.scene.ambientIntensity);
  scene.add(hemisphere);

  const keyLight = new THREE.DirectionalLight(PALETTE.dunhuangGold, CONFIG.scene.keyLightIntensity);
  keyLight.position.fromArray(CONFIG.scene.keyLightPosition);
  keyLight.castShadow = true;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(PALETTE.stoneBlue, CONFIG.scene.fillLightIntensity);
  fillLight.position.fromArray(CONFIG.scene.fillLightPosition);
  scene.add(fillLight);

  const track = new TrackGraph({ Vector3: THREE.Vector3, config: CONFIG });
  track.ensureAhead(0, CONFIG.track.keepAhead);
  const trackMesh = new TrackMesh({ THREE, track, config: CONFIG, palette: PALETTE });
  scene.add(trackMesh.root);

  const runner = new Runner({
    THREE,
    Vector3: THREE.Vector3,
    track,
    config: CONFIG,
    palette: PALETTE,
  });
  scene.add(runner.root);
  const cameraRig = new CameraRig({ camera, Vector3: THREE.Vector3, track, config: CONFIG });
  cameraRig.snapTo(runner);

  const gameState = new GameState();
  const score = new Score({ config: CONFIG });
  const powerUp = new PowerUp({ config: CONFIG });
  const pursuer = new Pursuer({ config: CONFIG });
  const obstacleSpawner = new ObstacleSpawner({
    config: CONFIG,
    createVisual: () => createObstacleVisual(THREE, PALETTE, CONFIG),
  });
  obstacleSpawner.forEachVisual((visual) => scene.add(visual));
  const pickupSpawner = new PickupSpawner({ config: CONFIG });
  const collision = new CollisionSystem({
    config: CONFIG,
    onHit: () => {
      if (!powerUp.consumeShield()) {
        pursuer.registerHit(runner);
      }
      if (pursuer.dead) {
        gameState.transition(GAME_STATES.DEAD);
      }
    },
  });
  const hud = new Hud({ root: document.querySelector('#hud') });
  const screens = new Screens({
    layer: screenLayer,
    onStart: () => gameState.transition(GAME_STATES.PLAYING),
    onResume: () => gameState.transition(GAME_STATES.PLAYING),
    onRestart: () => {
      runner.reset();
      score.reset();
      powerUp.reset();
      pursuer.reset();
      gameState.transition(GAME_STATES.PLAYING);
    },
  });
  const obstacleFrame = {
    position: new THREE.Vector3(),
    forward: new THREE.Vector3(),
    right: new THREE.Vector3(),
  };
  const input = new Input({
    target: window,
    config: CONFIG,
    onAction: (action) => {
      if (action === 'PAUSE') {
        if (gameState.current === GAME_STATES.PLAYING) {
          gameState.transition(GAME_STATES.PAUSED);
        } else if (gameState.current === GAME_STATES.PAUSED) {
          gameState.transition(GAME_STATES.PLAYING);
        }
        return;
      }
      if (gameState.current === GAME_STATES.PLAYING) {
        runner.handleAction(action);
      }
    },
  });
  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function update(dt) {
    input.update(dt);
    if (gameState.current === GAME_STATES.PLAYING) {
      runner.update(dt);
    } else if (gameState.current === GAME_STATES.MENU) {
      runner.updatePreview(dt);
    }
    track.ensureAhead(runner.s, CONFIG.track.keepAhead);
    trackMesh.updateFromTrack();
    const difficulty = (runner.speed - CONFIG.runner.baseSpeed)
      / (CONFIG.runner.maxSpeed - CONFIG.runner.baseSpeed);
    obstacleSpawner.ensureAhead(runner.s, CONFIG.track.keepAhead, Math.max(0, Math.min(1, difficulty)));
    obstacleSpawner.recycleBefore(runner.s - CONFIG.track.recycleBehind);
    for (let index = 0; index < obstacleSpawner.obstacleCount(); index += 1) {
      const obstacle = obstacleSpawner.getObstacleAt(index);
      track.evalTrack(obstacle.s, obstacleFrame);
      obstacle.visual?.position.set(
        obstacleFrame.position.x + obstacleFrame.right.x * CONFIG.laneOffsets[obstacle.lane],
        obstacleFrame.position.y + (obstacle.visual.userData.heightOffset ?? 0),
        obstacleFrame.position.z + obstacleFrame.right.z * CONFIG.laneOffsets[obstacle.lane],
      );
      obstacle.visual.rotation.y = Math.atan2(-obstacleFrame.forward.x, obstacleFrame.forward.z);
    }
    if (gameState.current === GAME_STATES.PLAYING) {
      collision.update(runner, obstacleSpawner);
      pursuer.update(runner, dt);
      pickupSpawner.ensureAhead(runner.s, CONFIG.track.keepAhead);
      pickupSpawner.collectCoins(runner, () => score.addCoin());
      score.updateDistance(runner.s);
      powerUp.update(dt);
    }
    hud.update({
      distance: score.distance,
      coins: score.coins,
      highScore: score.highScore,
      powerUp: { label: powerUp.boostRemaining > 0 ? '加速' : (powerUp.magnetRemaining > 0 ? '磁铁' : ''), remainingRatio: 0 },
      pursuerDistance: pursuer.distance,
    });
    cameraRig.update(runner, dt);
    keyLight.target.position.copy(runner.root.position);
    keyLight.position.set(
      runner.root.position.x + CONFIG.scene.keyLightPosition[0],
      runner.root.position.y + CONFIG.scene.keyLightPosition[1],
      runner.root.position.z + CONFIG.scene.keyLightPosition[2],
    );
    keyLight.target.updateMatrixWorld();
  }

  function render() {
    renderer.render(scene, camera);
  }

  const loop = new FixedStepLoop({
    fixedDt: CONFIG.loop.fixedDt,
    maxFrameDelta: CONFIG.loop.maxFrameDelta,
    update,
    render,
  });

  gameState.subscribe((next) => {
    if (next === GAME_STATES.PLAYING) {
      screens.hide();
      loop.paused = false;
      return;
    }
    if (next === GAME_STATES.PAUSED) {
      screens.showPause();
    } else if (next === GAME_STATES.DEAD) {
      score.commitHighScore();
      screens.showResult(score);
    } else {
      screens.renderMenu();
    }
    loop.paused = next === GAME_STATES.PAUSED;
  });

  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && gameState.current === GAME_STATES.PLAYING) {
      gameState.transition(GAME_STATES.PAUSED);
    }
  });
  input.attach();
  resize();
  gameState.transition(GAME_STATES.MENU);
  loop.start();
} catch (error) {
  showRuntimeError(error);
}
