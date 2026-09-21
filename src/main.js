// Boots the Three.js scene, connects its state to the procedural track, and renders the playable preview.
import * as THREE from 'three';
import { PALETTE } from './art/Palette.js';
import { createTextureSet } from './art/Textures.js';
import { FxSystem } from './art/Fx.js';
import { createEnvironmentVisual, createObstacleVisual, createPickupVisual, createPursuerVisual } from './art/Props.js';
import { Sfx } from './audio/Sfx.js';
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
import { PerformanceBudget } from './systems/Performance.js';
import { Score } from './systems/Score.js';
import { PickupSpawner } from './world/PickupSpawner.js';
import { ObstacleSpawner } from './world/ObstacleSpawner.js';
import { TrackGraph } from './world/TrackGraph.js';
import { TrackMesh } from './world/TrackMesh.js';
import { EnvironmentSystem } from './world/Environment.js?v=20260920-3';

const canvas = document.querySelector('#game-canvas');
const gameShell = document.querySelector('#game-shell');
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
  const textures = createTextureSet(THREE, document, PALETTE);
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
  trackMesh.material.map = textures.stone;
  trackMesh.material.needsUpdate = true;
  scene.add(trackMesh.root);
  const environment = new EnvironmentSystem({
    config: CONFIG,
    track,
    createVisual: () => createEnvironmentVisual(THREE, PALETTE),
  });
  environment.forEachVisual((visual) => scene.add(visual));
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(CONFIG.art.skyRadius, CONFIG.art.skyWidthSegments, CONFIG.art.skyHeightSegments),
    new THREE.MeshBasicMaterial({ map: textures.sky, side: THREE.BackSide }),
  );
  scene.add(sky);

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
  const performanceBudget = new PerformanceBudget({ config: CONFIG });
  const score = new Score({ config: CONFIG });
  const sfx = new Sfx({ config: CONFIG });
  const fx = new FxSystem({ THREE, scene, config: CONFIG, palette: PALETTE });
  const powerUp = new PowerUp({ config: CONFIG });
  const pursuer = new Pursuer({ config: CONFIG });
  pursuer.visual = createPursuerVisual(THREE, PALETTE);
  scene.add(pursuer.visual);
  const obstacleSpawner = new ObstacleSpawner({
    config: CONFIG,
    createVisual: () => createObstacleVisual(THREE, PALETTE, CONFIG),
  });
  obstacleSpawner.forEachVisual((visual) => scene.add(visual));
  const pickupSpawner = new PickupSpawner({
    config: CONFIG,
    createCoinVisual: () => createPickupVisual(THREE, PALETTE, 'COIN'),
    createPowerUpVisual: (type) => createPickupVisual(THREE, PALETTE, type),
  });
  const collision = new CollisionSystem({
    config: CONFIG,
    onHit: () => {
      fx.emit(runner.root.position);
      fx.triggerImpact();
      cameraRig.triggerShake();
      sfx.play('hit');
      if (!powerUp.consumeShield()) {
        pursuer.registerHit(runner);
      }
      if (pursuer.dead) {
        gameState.transition(GAME_STATES.DEAD);
      }
    },
    onSmash: () => {
      fx.emit(runner.root.position, 16);
      sfx.play('power-up');
    },
  });
  const hud = new Hud({ root: document.querySelector('#hud') });
  const screens = new Screens({
    layer: screenLayer,
    onStart: () => { sfx.resume(); gameState.transition(GAME_STATES.PLAYING); },
    onResume: () => { sfx.resume(); gameState.transition(GAME_STATES.PLAYING); },
    onRestart: () => {
      track.reset();
      runner.reset();
      score.reset();
      powerUp.reset();
      pursuer.reset();
      obstacleSpawner.reset();
      pickupSpawner.reset();
      environment.reset();
      gameState.transition(GAME_STATES.PLAYING);
    },
  });
  const obstacleFrame = {
    position: new THREE.Vector3(),
    forward: new THREE.Vector3(),
    right: new THREE.Vector3(),
  };
  const pickupFrame = { position: new THREE.Vector3(), forward: new THREE.Vector3(), right: new THREE.Vector3() };
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
        if (action === 'JUMP') sfx.play('jump');
        if (action === 'SLIDE') sfx.play('slide');
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
    powerUp.update(dt);
    runner.setSpeedMultiplier(powerUp.speedMultiplier);
    if (gameState.current === GAME_STATES.PLAYING) {
      runner.update(dt);
    } else if (gameState.current === GAME_STATES.MENU) {
      runner.updatePreview(dt);
    }
    track.ensureAhead(runner.s, CONFIG.track.keepAhead);
    trackMesh.updateFromTrack();
    environment.update(runner.s, CONFIG.track.keepAhead);
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
      collision.update(runner, obstacleSpawner, { invulnerable: powerUp.boostActive });
      pursuer.update(runner, dt);
      track.evalTrack(pursuer.positionS, pickupFrame);
      pursuer.visual.position.copy(pickupFrame.position);
      pursuer.visual.position.y += 0.05;
      pursuer.visual.rotation.y = Math.atan2(-pickupFrame.forward.x, pickupFrame.forward.z);
      pursuer.visual.visible = !pursuer.dead;
      pickupSpawner.ensureAhead(runner.s, CONFIG.track.keepAhead);
      pickupSpawner.recycleBefore(runner.s - CONFIG.track.recycleBehind);
      pickupSpawner.forEachActive((pickup) => {
        if (!pickup.visual) return;
        if (!pickup.visual.parent) scene.add(pickup.visual);
        track.evalTrack(pickup.s, pickupFrame);
        pickup.visual.visible = !pickup.collected;
        pickup.visual.position.set(
          pickupFrame.position.x + pickupFrame.right.x * CONFIG.laneOffsets[pickup.lane],
          pickupFrame.position.y + (pickup.type ? 1.5 : 1.15),
          pickupFrame.position.z + pickupFrame.right.z * CONFIG.laneOffsets[pickup.lane],
        );
        pickup.visual.rotation.y += dt * 3;
      });
      pickupSpawner.collectCoins(runner, () => {
        score.addCoin();
        fx.emit(runner.root.position);
        sfx.play('coin');
      });
      pickupSpawner.collectPowerUps(runner, (pickup) => {
        powerUp.activate(pickup.type);
        fx.emit(runner.root.position, 12);
        sfx.play('power-up');
      });
      score.updateDistance(runner.s);
    }
    fx.update(dt);
    fx.setSpeedIntensity(Math.max(difficulty, powerUp.boostRemaining > 0 ? 1 : 0));
    fx.speedLines.position.copy(runner.root.position);
    fx.speedLines.rotation.y = runner.root.rotation.y;
    hud.update({
      distance: score.distance,
      coins: score.coins,
      highScore: score.highScore,
      powerUp: {
        label: powerUp.boostRemaining > 0 ? '加速' : (powerUp.magnetRemaining > 0 ? '磁铁' : (powerUp.shieldActive ? '护盾' : '')),
        remainingRatio: Math.max(powerUp.boostRemaining / CONFIG.powerUp.boostDuration, powerUp.magnetRemaining / CONFIG.powerUp.magnetDuration),
      },
      pursuerDistance: pursuer.distance,
      impactRatio: fx.impactRemaining / CONFIG.fx.impactDuration,
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

  function render(_, frameDelta) {
    if (performanceBudget.update(frameDelta)) {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, performanceBudget.pixelRatioCap));
      renderer.shadowMap.enabled = performanceBudget.shadowsEnabled;
      keyLight.castShadow = performanceBudget.shadowsEnabled;
      resize();
    }
    renderer.render(scene, camera);
  }

  const loop = new FixedStepLoop({
    fixedDt: CONFIG.loop.fixedDt,
    maxFrameDelta: CONFIG.loop.maxFrameDelta,
    update,
    render,
  });

  gameState.subscribe((next) => {
    gameShell.dataset.gameState = next;
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
  document.querySelector('#pause-button').addEventListener('click', () => {
    if (gameState.current === GAME_STATES.PLAYING) gameState.transition(GAME_STATES.PAUSED);
    else if (gameState.current === GAME_STATES.PAUSED) gameState.transition(GAME_STATES.PLAYING);
  });
  document.querySelector('#mute-button').addEventListener('click', (event) => {
    event.currentTarget.textContent = sfx.toggleMute() ? '♫̸' : '♫';
  });
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
