import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('presentation layer exposes themed art slots and keeps assets theme-controlled', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /id="distance-display"/);
  assert.match(html, /id="coin-display"/);
  assert.match(html, /id="high-score-display"/);
  assert.match(html, /id="score-display"/);
  assert.match(html, /id="power-up-display"/);
  assert.match(html, /id="portrait-art"/);
  assert.match(html, /id="score-art"/);
  assert.match(html, /id="distance-art"/);
  assert.match(html, /id="coin-art"/);
  assert.match(html, /id="pause-art"/);
  assert.match(html, /id="swipe-art"/);
  assert.match(html, /id="pause-button"/);
  assert.match(html, /id="mute-button"/);
  assert.match(html, /hud-art-panel/);
  assert.match(html, /aspect-ratio:\s*9\s*\/\s*16/);
  assert.match(html, /id="profile-panel"/);
  assert.match(html, /id="coin-panel"/);
  assert.match(html, /id="power-up-label"/);
  assert.match(html, /id="swipe-hint"/);
  assert.match(html, /aria-live="off"/);
  assert.match(html, /danger-breathe/);
  assert.match(html, /--mural-blue/);
  assert.match(html, /--mural-gold/);
  assert.match(html, /paper-panel/);
  assert.match(html, /seal-button/);
  assert.match(html, /prefers-reduced-motion/);
  assert.match(html, /height:\s*100%/);
  assert.doesNotMatch(html, /https?:\/\/[^'"\s]+\.(png|jpe?g|glb|gltf|fbx|mp3|woff2?)\b/i);
});

test('HUD renders live values over the active theme artwork and degrades per missing image', async () => {
  const { Hud } = await import('../src/ui/Hud.js');
  const ids = [
    'distance-display', 'coin-display', 'score-display', 'high-score-display',
    'power-up-display', 'power-up-label', 'danger-vignette', 'portrait-art',
    'score-art', 'distance-art', 'coin-art', 'pause-art', 'skill-art', 'swipe-art',
    'profile-panel', 'score-panel', 'distance-panel', 'coin-panel', 'power-up-display', 'swipe-hint', 'pause-button',
  ];
  const elements = new Map(ids.map((id) => [id, {
    id,
    dataset: {},
    style: { values: {}, setProperty(key, value) { this.values[key] = value; } },
    classList: {
      values: new Set(),
      add(name) { this.values.add(name); },
      toggle(name, force) {
        if (force) this.values.add(name);
        else this.values.delete(name);
      },
    },
    textContent: '',
    src: '',
    hidden: false,
  }]));
  const imageParents = {
    'portrait-art': 'profile-panel', 'score-art': 'score-panel', 'distance-art': 'distance-panel',
    'coin-art': 'coin-panel', 'pause-art': 'pause-button', 'skill-art': 'power-up-display', 'swipe-art': 'swipe-hint',
  };
  for (const [imageId, parentId] of Object.entries(imageParents)) {
    elements.get(imageId).parentElement = elements.get(parentId);
    elements.get(imageId).closest = () => elements.get(parentId);
  }
  const root = { querySelector: (selector) => elements.get(selector.slice(1)) ?? null };
  const assets = {
    portrait: 'file:///portrait.png', score: 'file:///score.png',
    distance: 'file:///distance.png', coins: 'file:///coins.png',
    pause: 'file:///pause.png', skill: 'file:///skill.png', swipeHint: 'file:///swipe.png',
  };
  const hud = new Hud({ root, assets });

  hud.update({ score: 12345, distance: 2317, coins: 76, highScore: 328960,
    powerUp: { label: '磁铁', remainingRatio: 0.7 }, pursuerDistance: 14 });

  assert.equal(elements.get('score-display').textContent, '12,345');
  assert.equal(elements.get('distance-display').textContent, '2,317 米');
  assert.equal(elements.get('coin-display').textContent, '76');
  assert.equal(elements.get('high-score-display').textContent, '历史最高分 328,960');
  assert.equal(elements.get('power-up-label').textContent, '磁铁');
  assert.equal(elements.get('power-up-display').dataset.active, 'true');
  assert.equal(elements.get('power-up-display').style.values['--power-progress'], '70%');
  assert.equal(elements.get('score-art').src, assets.score);
  assert.equal(elements.get('pause-art').src, assets.pause);
  assert.equal(elements.get('swipe-art').src, assets.swipeHint);
  elements.get('skill-art').onerror();
  assert.equal(elements.get('skill-art').hidden, true, 'missing decorative art must not hide HUD values');
  assert.equal(elements.get('power-up-display').dataset.artFallback, 'true');
  hud.update({ score: 12345, distance: 2317, coins: 76, highScore: 328960, powerUp: null });
  assert.equal(elements.get('power-up-display').hidden, true, 'inactive power-up art should not cover the playfield');
});

test('presentation modules keep procedural effects and native accessibility hooks', async () => {
  const hud = await import('../src/ui/Hud.js');
  const screens = await import('../src/ui/Screens.js');
  const props = await import('../src/art/Props.js');
  assert.equal(typeof hud.Hud, 'function');
  assert.equal(typeof screens.Screens, 'function');
  assert.equal(typeof props.createObstacleVisual, 'function');
  assert.match(await import('../src/ui/Screens.js').then(() => readFileSync(new URL('../src/ui/Screens.js', import.meta.url), 'utf8')), /\.onclick/);
  assert.match(readFileSync(new URL('../src/ui/Screens.js', import.meta.url), 'utf8'), /flying-ribbon|cloud-motif/);
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
  assert.match(main, /ui\/Hud\.js\?v=20260923-1/);
  assert.match(main, /art\/ThemeRegistry\.js\?v=20260923-1/);
  assert.match(main, /art\/AssetLoader\.js\?v=20260923-1/);
  assert.match(main, /entities\/Runner\.js\?v=20260923-1/);
  assert.match(main, /entities\/Pursuer\.js\?v=20260920-2/);
  assert.match(main, /ui\/Screens\.js\?v=20260921-13/);
  assert.match(main, /systems\/Score\.js\?v=20260920-2/);
  assert.match(main, /world\/TrackGraph\.js\?v=20260920-3/);
  assert.match(main, /sfx\.muted \? '♫̸' : '♫'/);
  assert.match(main, /action === 'JUMP'.*sfx\.play\('jump'\)/s);
  assert.match(main, /action === 'SLIDE'.*sfx\.play\('slide'\)/s);
  assert.match(main, /pursuer\.consumeRoarCue\(\).*sfx\.play\('roar'\)/s);
  assert.match(main, /next !== GAME_STATES\.PLAYING\) sfx\.setDanger\(false\)/);
});

test('main passes the active theme factories to every pooled visual system', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /theme\.createPursuerVisual/);
  assert.match(main, /theme\.createObstacleVisual/);
  assert.match(main, /theme\.createPickupVisual/);
  assert.match(main, /theme\.createEnvironmentVisual/);
  assert.match(main, /palette:\s*theme\.palette/);
});
