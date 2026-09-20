import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const designPath = new URL('../DESIGN.md', import.meta.url);

test('design context defines the Dunhuang game identity and runtime token mapping', () => {
  assert.equal(existsSync(designPath), true, 'DESIGN.md must exist at the project root');

  const design = readFileSync(designPath, 'utf8');
  const requiredTokens = [
    'ochreRed: "#A63B29"',
    'cinnabar: "#C8402F"',
    'stoneBlue: "#2E5C8A"',
    'dunhuangGold: "#E8B23A"',
    'sand: "#E3C68B"',
    'ink: "#2B1F1A"',
  ];

  for (const token of requiredTokens) {
    assert.ok(design.includes(token), `DESIGN.md must define ${token}`);
  }

  assert.match(design, /index\.html.*CSS custom properties/s);
  assert.match(design, /铜钱印章/);
  assert.match(design, /reduced-motion/);
});
