import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const designPath = new URL('../DESIGN.md', import.meta.url);

test('design context defines the Dunhuang game identity and runtime token mapping', () => {
  assert.equal(existsSync(designPath), true, 'DESIGN.md must exist at the project root');

  const design = readFileSync(designPath, 'utf8');
  const requiredTokens = [
    'muralBlue: "#244B7A"',
    'turquoise: "#3D9B9B"',
    'vermilion: "#D84B35"',
    'apricot: "#F3C77B"',
    'muralGold: "#E8B23A"',
    'paper: "#F6E7C8"',
    'caveNight: "#172536"',
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
  assert.match(design, /纸片 UI/);
  assert.match(design, /上海外滩/);
  assert.match(design, /reduced-motion/);
});

test('feasibility research and delivery plan are checked in', () => {
  const planPath = new URL('../docs/敦煌逃亡_可行性研究与技术计划.md', import.meta.url);
  assert.equal(existsSync(planPath), true);
  const plan = readFileSync(planPath, 'utf8');
  assert.match(plan, /技术可行性/);
  assert.match(plan, /交付路线/);
  assert.match(plan, /npm test/);
  assert.match(plan, /CDN import map/);
  assert.match(plan, /真实桌面\/移动设备 FPS/);
  assert.match(plan, /GAP 组全车道占用/);
});

test('acceptance record includes gameplay and theme-art evidence', () => {
  const acceptancePath = new URL('../docs/验收记录.md', import.meta.url);
  assert.equal(existsSync(acceptancePath), true);
  const acceptance = readFileSync(acceptancePath, 'utf8');
  assert.equal((acceptance.match(/^\|\s*\d+\s*\|/gm) ?? []).length, 21);
  assert.match(acceptance, /5 分钟/);
  assert.match(acceptance, /真实设备 FPS/);
  assert.match(acceptance, /MENU.*PLAYING.*PAUSED.*PLAYING/);
  assert.match(acceptance, /可跳跃路线/);
  assert.match(acceptance, /历史最高分.*新纪录/);
  assert.match(acceptance, /主题替换边界/);
  assert.match(acceptance, /障碍与道具语义形状/);
  assert.match(acceptance, /main\.js\?v=20260921-13/);
  assert.match(acceptance, /Q 版/);
  assert.match(acceptance, /warn\/error 日志均为空/);
});
