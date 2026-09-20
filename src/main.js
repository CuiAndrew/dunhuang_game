// Boots the Three.js scene, connects lifecycle state to the opening screen, and renders the P1 playable preview.
import * as THREE from 'three';
import { PALETTE } from './art/Palette.js';
import { CONFIG } from './core/Config.js';
import { GAME_STATES, GameState } from './core/GameState.js';
import { FixedStepLoop } from './core/Loop.js';

const canvas = document.querySelector('#game-canvas');
const errorPanel = document.querySelector('#error-panel');
const errorMessage = document.querySelector('#error-message');
const screenLayer = document.querySelector('#screen-layer');
const startButton = document.querySelector('#start-button');

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

  const roadMaterial = new THREE.MeshStandardMaterial({ color: PALETTE.plaster, roughness: 0.85 });
  const road = new THREE.Mesh(
    new THREE.BoxGeometry(CONFIG.track.roadWidth, CONFIG.track.roadThickness, CONFIG.track.staticRoadLength),
    roadMaterial,
  );
  road.position.set(0, -CONFIG.track.roadThickness / 2, CONFIG.scene.roadStart);
  road.receiveShadow = true;
  road.matrixAutoUpdate = false;
  road.updateMatrix();
  scene.add(road);

  const markMaterial = new THREE.MeshStandardMaterial({ color: PALETTE.bronze, roughness: 0.8 });
  const markGeometry = new THREE.BoxGeometry(
    CONFIG.track.laneMarkWidth,
    CONFIG.track.laneMarkHeight,
    CONFIG.track.laneMarkLength,
  );
  for (let index = 0; index < CONFIG.track.laneMarkCount; index += 1) {
    const markZ = index * CONFIG.track.laneMarkSpacing;
    for (const laneBoundary of CONFIG.laneOffsets.slice(1)) {
      const mark = new THREE.Mesh(markGeometry, markMaterial);
      mark.position.set(laneBoundary - CONFIG.laneOffsets[1], 0, markZ);
      mark.matrixAutoUpdate = false;
      mark.updateMatrix();
      scene.add(mark);
    }
  }

  const runner = new THREE.Mesh(
    new THREE.BoxGeometry(CONFIG.runner.bodyWidth, CONFIG.runner.bodyHeight, CONFIG.runner.bodyDepth),
    new THREE.MeshStandardMaterial({ color: PALETTE.ochreRed, roughness: 0.65 }),
  );
  runner.position.set(0, CONFIG.scene.runnerBaseHeight, 0);
  runner.castShadow = true;
  scene.add(runner);

  const gameState = new GameState();
  let elapsed = 0;

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function update(dt) {
    elapsed += dt;
    if (gameState.current === GAME_STATES.PLAYING) {
      runner.position.z += CONFIG.runner.baseSpeed * dt;
    } else {
      runner.position.y = CONFIG.scene.runnerBaseHeight
        + Math.sin(elapsed * CONFIG.runner.previewSpeed) * CONFIG.runner.previewBobHeight;
    }

    camera.position.set(0, CONFIG.camera.offsetUp, runner.position.z - CONFIG.camera.offsetBack);
    camera.lookAt(0, CONFIG.camera.lookHeight, runner.position.z + CONFIG.camera.lookAhead);
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
      screenLayer.hidden = true;
      loop.paused = false;
      return;
    }
    screenLayer.hidden = false;
    loop.paused = true;
  });

  startButton.addEventListener('click', () => {
    gameState.transition(GAME_STATES.PLAYING);
  });

  window.addEventListener('resize', resize);
  resize();
  gameState.transition(GAME_STATES.MENU);
  loop.start();
} catch (error) {
  showRuntimeError(error);
}
