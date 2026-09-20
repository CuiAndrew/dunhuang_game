// Boots the Three.js scene, connects its state to the procedural track, and renders the playable preview.
import * as THREE from 'three';
import { PALETTE } from './art/Palette.js';
import { CONFIG } from './core/Config.js';
import { GAME_STATES, GameState } from './core/GameState.js';
import { Input } from './core/Input.js';
import { FixedStepLoop } from './core/Loop.js';
import { CameraRig } from './entities/CameraRig.js';
import { Runner } from './entities/Runner.js';
import { TrackGraph } from './world/TrackGraph.js';
import { TrackMesh } from './world/TrackMesh.js';

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
    } else {
      runner.updatePreview(dt);
    }
    track.ensureAhead(runner.s, CONFIG.track.keepAhead);
    trackMesh.updateFromTrack();
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
      screenLayer.hidden = true;
      loop.paused = false;
      return;
    }
    screenLayer.hidden = false;
    loop.paused = next === GAME_STATES.PAUSED;
  });

  startButton.addEventListener('click', () => {
    gameState.transition(GAME_STATES.PLAYING);
  });

  window.addEventListener('resize', resize);
  input.attach();
  resize();
  gameState.transition(GAME_STATES.MENU);
  loop.start();
} catch (error) {
  showRuntimeError(error);
}
