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
  assert.match(html, /src="\.\/src\/art\/assets\/ui\/title_plaque\.png"/);
  assert.match(html, /src="\.\/src\/art\/assets\/ui\/start_button\.png"/);
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

test('score and distance artwork keeps a visible vertical gap at the narrow HUD width', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const scoreTop = Number(html.match(/#score-panel\s*\{\s*top:\s*([\d.]+)%/)[1]);
  const distanceTop = Number(html.match(/#distance-panel\s*\{\s*top:\s*([\d.]+)%/)[1]);
  const narrowWidth = Number(html.match(/#score-panel, #distance-panel\s*\{\s*left:\s*[\d.]+%;\s*width:\s*([\d.]+)%/)[1]);
  const scoreArt = readFileSync(new URL('../src/art/assets/hud/score.png', import.meta.url));
  const artAspect = scoreArt.readUInt32BE(20) / scoreArt.readUInt32BE(16);
  const scoreHeightPercent = narrowWidth / 100 * (9 / 16) * artAspect * 100;
  const gapPercent = distanceTop - scoreTop - scoreHeightPercent;

  assert.ok(gapPercent >= 0.75, `artwork should leave at least 0.75% of the 9:16 stage between frames; got ${gapPercent.toFixed(2)}%`);
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

test('HUD can hide the swipe hint after gameplay starts', async () => {
  const { Hud } = await import('../src/ui/Hud.js');
  const ids = [
    'distance-display', 'coin-display', 'score-display', 'high-score-display',
    'power-up-display', 'power-up-label', 'danger-vignette', 'portrait-art',
    'score-art', 'distance-art', 'coin-art', 'pause-art', 'skill-art', 'swipe-art',
    'swipe-hint',
  ];
  const elements = new Map(ids.map((id) => [id, {
    id,
    dataset: {},
    style: { values: {}, setProperty() {} },
    classList: { add() {}, toggle() {} },
    hidden: false,
    textContent: '',
    src: '',
  }]));
  const hint = elements.get('swipe-hint');
  const imageParents = {
    'portrait-art': 'swipe-hint', 'score-art': 'swipe-hint', 'distance-art': 'swipe-hint',
    'coin-art': 'swipe-hint', 'pause-art': 'swipe-hint', 'skill-art': 'swipe-hint', 'swipe-art': 'swipe-hint',
  };
  for (const [imageId, parentId] of Object.entries(imageParents)) {
    elements.get(imageId).parentElement = elements.get(parentId);
    elements.get(imageId).closest = () => elements.get(parentId);
  }
  const root = {
    querySelector: (selector) => elements.get(selector.slice(1)) ?? null,
    ownerDocument: { createElement: (tagName) => ({ tagName, dataset: {}, style: {}, classList: { add() {} } }) },
    append() {},
  };
  const hud = new Hud({ root, assets: { swipeHint: 'file:///swipe.png' } });

  assert.equal(hint.hidden, true, 'the swipe hint starts hidden until the menu state is active');
  hud.setSwipeHintVisible(false);
  assert.equal(hint.hidden, true);
  hud.setSwipeHintVisible(true);
  assert.equal(hint.hidden, false);
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

test('start and result screens consume theme supplied Dunhuang artwork', () => {
  const screens = readFileSync(new URL('../src/ui/Screens.js', import.meta.url), 'utf8');
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(screens, /titlePlaque/);
  assert.match(screens, /startButton/);
  assert.match(screens, /resultPanel/);
  assert.match(screens, /screen-title-art/);
  assert.match(screens, /screen-result-art/);
  assert.match(main, /assets:\s*theme\.assets\?\.ui/);
});

test('Screens render the supplied art over the start and result actions', async () => {
  const { Screens } = await import('../src/ui/Screens.js');
  const layer = {
    innerHTML: '',
    hidden: true,
    querySelector: () => ({}),
  };
  const screens = new Screens({
    layer,
    assets: {
      titlePlaque: './src/art/assets/ui/title_plaque.png',
      startButton: './src/art/assets/ui/start_button.png',
      resultPanel: './src/art/assets/ui/result_panel.png',
    },
  });

  assert.match(layer.innerHTML, /screen-title-art[^>]+title_plaque\.png/);
  assert.match(layer.innerHTML, /screen-button-art[^>]+start_button\.png/);
  assert.match(layer.innerHTML, /data-art="true"/);
  assert.equal(layer.hidden, false);

  screens.showResult({ distance: 230, coins: 12, total: 890, highScore: 1200, newRecord: false });
  assert.match(layer.innerHTML, /screen-result-art[^>]+result_panel\.png/);
  assert.match(layer.innerHTML, /本次逃亡/);
  assert.match(layer.innerHTML, /230 米/);
  assert.match(layer.innerHTML, /再来一次/);
});

test('art result layout anchors copy and action to the reference panel slots', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const compatibilityHtml = readFileSync(new URL('../index 2.html', import.meta.url), 'utf8');
  assert.match(html, /\.screen-result\[data-art="true"\] \.screen-content\s*\{[^}]*position:\s*absolute/s);
  assert.match(html, /\.screen-result\[data-art="true"\] \.result-stats\s*\{[^}]*position:\s*absolute/s);
  assert.match(html, /\.screen-result\[data-art="true"\] \.result-stats\s*\{[^}]*inset:\s*0;[^}]*width:\s*auto/s);
  for (const entrypoint of [html, compatibilityHtml]) {
    assert.match(entrypoint, /\.screen-result\[data-art="true"\] \.result-stats p\s*\{[^}]*left:\s*calc\(22% \+ 2em\);[^}]*width:\s*37%/s);
  }
  assert.match(html, /\.screen-result\[data-art="true"\] \.result-stats p:nth-child\(1\)\s*\{[^}]*top:\s*37%/s);
  assert.match(html, /\.screen-result\[data-art="true"\] \.result-stats p:nth-child\(2\)\s*\{[^}]*top:\s*48%/s);
  assert.match(html, /\.screen-result\[data-art="true"\] \.result-stats p:nth-child\(3\)\s*\{[^}]*top:\s*59%/s);
  assert.match(html, /\.screen-result\[data-art="true"\] \.screen-result-action\s*\{[^}]*position:\s*absolute/s);
});

test('both local entrypoints refresh overlay modules and hide the swipe artwork when hidden', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const compatibilityHtml = readFileSync(new URL('../index 2.html', import.meta.url), 'utf8');
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

  for (const entrypoint of [html, compatibilityHtml]) {
    assert.match(entrypoint, /src="\.\/src\/main\.js\?v=20260924-1"/);
    assert.match(entrypoint, /#swipe-hint\[hidden\]\s*\{\s*display:\s*none\s*!important;/);
  }
  assert.match(main, /ui\/Hud\.js\?v=20260924-1/);
  assert.match(main, /ui\/Screens\.js\?v=20260924-1/);
});

test('result screen exposes historical high score and new-record feedback', () => {
  const screens = readFileSync(new URL('../src/ui/Screens.js', import.meta.url), 'utf8');
  assert.match(screens, /score\.highScore/);
  assert.match(screens, /score\.newRecord/);
  assert.match(screens, /新纪录/);
});

test('main loop routes jump and slide actions through their dedicated sound cues', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /audio\/Sfx\.js\?v=20260923-2/);
  assert.match(main, /audio\/AudioLifecycle\.js\?v=20260923-2/);
  assert.match(main, /ui\/Hud\.js\?v=20260924-1/);
  assert.match(main, /art\/ThemeRegistry\.js\?v=20260923-1/);
  assert.match(main, /art\/AssetLoader\.js\?v=20260923-1/);
  assert.match(main, /entities\/Runner\.js\?v=20260923-1/);
  assert.match(main, /entities\/Pursuer\.js\?v=20260920-2/);
  assert.match(main, /ui\/Screens\.js\?v=20260924-1/);
  assert.match(main, /hud\.setSwipeHintVisible\(next === GAME_STATES\.MENU\)/);
  assert.match(main, /systems\/Score\.js\?v=20260920-2/);
  assert.match(main, /world\/TrackGraph\.js\?v=20260920-3/);
  assert.match(main, /sfx\.muted \? '♫̸' : '♫'/);
  assert.match(main, /action === 'JUMP'.*sfx\.play\('jump'\)/s);
  assert.match(main, /action === 'SLIDE'.*sfx\.play\('slide'\)/s);
  assert.match(main, /pursuer\.consumeRoarCue\(\).*sfx\.play\('roar'\)/s);
  assert.match(main, /bindAudioLifecycle\(gameState, sfx, GAME_STATES\.PLAYING\)/);
  assert.doesNotMatch(main, /sfx\.resume\(\); gameState\.transition/);
});

test('main passes the active theme factories to every pooled visual system', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /theme\.createPursuerVisual/);
  assert.match(main, /theme\.createObstacleVisual/);
  assert.match(main, /theme\.createPickupVisual/);
  assert.match(main, /theme\.createEnvironmentVisual/);
  assert.match(main, /palette:\s*theme\.palette/);
});
