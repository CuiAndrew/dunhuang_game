import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('presentation layer exposes the HUD and screen contracts without external assets', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /id="distance-display"/);
  assert.match(html, /id="coin-display"/);
  assert.match(html, /id="high-score-display"/);
  assert.match(html, /id="power-up-display"/);
  assert.match(html, /id="pause-button"/);
  assert.match(html, /id="mute-button"/);
  assert.match(html, /conic-gradient/);
  assert.match(html, /danger-breathe/);
  assert.match(html, /height:\s*100%/);
  assert.doesNotMatch(html, /\.(png|jpe?g|glb|gltf|fbx|mp3|woff2?)\b/i);
});

test('presentation modules keep procedural effects and native accessibility hooks', async () => {
  const hud = await import('../src/ui/Hud.js');
  const screens = await import('../src/ui/Screens.js');
  const props = await import('../src/art/Props.js');
  assert.equal(typeof hud.Hud, 'function');
  assert.equal(typeof screens.Screens, 'function');
  assert.equal(typeof props.createObstacleVisual, 'function');
  assert.match(await import('../src/ui/Screens.js').then(() => readFileSync(new URL('../src/ui/Screens.js', import.meta.url), 'utf8')), /\.onclick/);
  assert.match(readFileSync(new URL('../src/ui/Hud.js', import.meta.url), 'utf8'), /danger-active/);
});

test('result screen exposes historical high score and new-record feedback', () => {
  const screens = readFileSync(new URL('../src/ui/Screens.js', import.meta.url), 'utf8');
  assert.match(screens, /score\.highScore/);
  assert.match(screens, /score\.newRecord/);
  assert.match(screens, /新纪录/);
});

test('main loop routes jump and slide actions through their dedicated sound cues', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /audio\/Sfx\.js\?v=20260920-2/);
  assert.match(main, /ui\/Hud\.js\?v=20260920-2/);
  assert.match(main, /entities\/Runner\.js\?v=20260920-2/);
  assert.match(main, /entities\/Pursuer\.js\?v=20260920-2/);
  assert.match(main, /ui\/Screens\.js\?v=20260920-2/);
  assert.match(main, /systems\/Score\.js\?v=20260920-2/);
  assert.match(main, /world\/TrackGraph\.js\?v=20260920-2/);
  assert.match(main, /sfx\.muted \? '♫̸' : '♫'/);
  assert.match(main, /action === 'JUMP'.*sfx\.play\('jump'\)/s);
  assert.match(main, /action === 'SLIDE'.*sfx\.play\('slide'\)/s);
  assert.match(main, /pursuer\.consumeRoarCue\(\).*sfx\.play\('roar'\)/s);
  assert.match(main, /next !== GAME_STATES\.PLAYING\) sfx\.setDanger\(false\)/);
});
