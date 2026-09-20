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

test('feasibility research and delivery plan are checked in', () => {
  const planPath = new URL('../docs/敦煌逃亡_可行性研究与技术计划.md', import.meta.url);
  assert.equal(existsSync(planPath), true);
  const plan = readFileSync(planPath, 'utf8');
  assert.match(plan, /技术可行性/);
  assert.match(plan, /交付路线/);
  assert.match(plan, /npm test/);
});

test('sixteen-point acceptance record is checked in', () => {
  const acceptancePath = new URL('../docs/验收记录.md', import.meta.url);
  assert.equal(existsSync(acceptancePath), true);
  const acceptance = readFileSync(acceptancePath, 'utf8');
  assert.equal((acceptance.match(/^\|\s*\d+\s*\|/gm) ?? []).length, 16);
  assert.match(acceptance, /5 分钟/);
  assert.match(acceptance, /真实设备 FPS/);
});
