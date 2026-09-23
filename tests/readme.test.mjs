import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const readmeUrl = new URL('../README.md', import.meta.url);

test('README documents real setup, runtime requirements, and controls', () => {
  assert.equal(existsSync(readmeUrl), true, 'root README.md must exist');
  const readme = readFileSync(readmeUrl, 'utf8');
  const requiredContent = [
    'npm install',
    'npm test',
    'python3 -m http.server 4173 --bind 127.0.0.1',
    'http://127.0.0.1:4173/',
    'Three.js',
    'CDN',
    'WebGL',
    'Web Audio',
    '用户交互',
    '静默降级',
    '← / →',
    'A / D',
    '空格 / ↑',
    '↓',
    'P / Esc',
    '触控滑动',
    'index%202.html',
  ];

  for (const text of requiredContent) {
    assert.ok(readme.includes(text), `README must include ${text}`);
  }

  assert.doesNotMatch(readme, /^npm run (?:dev|build)$/m, 'README must not present unavailable npm scripts as launch commands');
});

test('README local Markdown links point to existing files', () => {
  assert.equal(existsSync(readmeUrl), true, 'root README.md must exist');
  const readme = readFileSync(readmeUrl, 'utf8');
  const links = [...readme.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)];

  for (const [, href] of links) {
    if (/^(?:https?:|mailto:|#)/.test(href)) continue;
    const target = href.split('#', 1)[0];
    if (!target) continue;
    assert.equal(existsSync(new URL(target, readmeUrl)), true, `README link target must exist: ${href}`);
  }
});

test('the repository exposes synchronized canonical and compatibility entrypoints', () => {
  const canonicalEntrypointUrl = new URL('../index.html', import.meta.url);
  const duplicateEntrypointUrl = new URL('../index 2.html', import.meta.url);
  assert.equal(existsSync(canonicalEntrypointUrl), true, 'index.html must remain the canonical entrypoint');
  assert.equal(existsSync(duplicateEntrypointUrl), true, 'index 2.html must remain available for existing browser tabs');
  assert.equal(
    readFileSync(duplicateEntrypointUrl, 'utf8'),
    readFileSync(canonicalEntrypointUrl, 'utf8'),
    'index 2.html must stay synchronized with index.html',
  );
});
