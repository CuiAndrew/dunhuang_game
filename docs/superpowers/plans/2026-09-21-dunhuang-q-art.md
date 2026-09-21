# 敦煌 Q 版美术重塑 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变玩法和主题替换边界的前提下，把现有低模敦煌主题升级为圆润、分层、可辨识的敦煌 Q 版人物、场景、道具和 UI。

**Architecture:** 保留 `ThemeRegistry` 作为唯一视觉组合入口，扩展 Dunhuang adapter 的颜色、场景和 CanvasTexture 令牌；视觉工厂继续返回现有对象池 API，新增的纹样、轮廓和动画只存在于 adapter 内。UI 继续使用原生 DOM 按钮和现有 `Screens`/`Hud` 类，通过共享 CSS 令牌与 3D 画面统一风格。

**Tech Stack:** Three.js r169、原生 ES modules、CanvasTexture、原生 CSS/HTML、Node `node:test`、Python 静态服务器和 in-app Browser 验收。

**Spec:** `docs/superpowers/specs/2026-09-21-dunhuang-q-art-design.md`

## Global Constraints

- 继续使用 Three.js r169、程序化几何和 CanvasTexture，不新增运行时网络依赖。
- 不改变 Runner、碰撞、道具类型、轨道、对象池或状态机。
- 视觉工厂必须保留 Runner、障碍、道具和环境的现有语义 API 与 `userData` 元数据。
- 预建并缓存同主题的 geometry/material/texture 原型；每帧不得创建 geometry、material 或 canvas。
- UI 保持原生按钮、中文可访问名称和 `prefers-reduced-motion` 行为。
- 所有变更完成后运行 `npm test`、`git diff --check` 和浏览器冒烟，并为每个任务创建 Git commit。

## Review Focus

- 主题令牌缺失或类型错误时，注册阶段必须报出具体字段；由 Task 1 的 `ThemeDefinition` 测试覆盖。
- 同一主题的池化实例必须共享 geometry/material/texture，不能因 Q 版装饰导致每个实例重新分配；由 Task 2 的资源身份测试覆盖。
- GAP、低栏和梁柱的视觉增加细节后仍必须保留碰撞高度与类型字符串；由 Task 2 的语义变体测试覆盖。
- UI 在 640×480 和 `prefers-reduced-motion` 下仍要保持按钮可达、文字可读；由 Task 4 的静态测试和 Task 5 的浏览器验收覆盖。
- 缓存版本必须覆盖所有被修改的运行时模块，避免旧主题模块和新 CSS 混用；由 Task 5 的入口/依赖版本断言覆盖。

### Task 1: Q 版颜色、场景令牌与 CanvasTexture 基础

**Files:**
- Modify: `src/art/Palette.js`
- Modify: `src/art/ThemeDefinition.js`
- Modify: `src/art/themes/DunhuangTheme.js`
- Modify: `src/art/Textures.js`
- Modify: `tests/theme.test.mjs`
- Modify: `tests/art-audio.test.mjs`

**Interfaces:**
- Consumes: 当前 `PALETTE`、`createTextureSet(THREE, document, palette, themeId)` 和主题契约。
- Produces: `PALETTE` 的 Q 版令牌、`DUNHUANG_THEME.scene` 的光照令牌，以及缓存的 `sky`、`paper`、`mural`、`clouds`、`caisson`、`sand`、`stone` 纹理。

- [ ] **Step 1: Write the failing test**

在 `tests/theme.test.mjs` 增加场景令牌断言：

```js
assert.equal(theme.scene.skyTextureName, 'sky');
assert.equal(typeof theme.scene.ambientColor, 'number');
assert.equal(typeof theme.scene.keyLightColor, 'number');
assert.equal(typeof theme.scene.fillLightColor, 'number');
```

在 `tests/art-audio.test.mjs` 扩展纹理缓存测试：

```js
assert.ok(dunhuangA.paper);
assert.ok(dunhuangA.clouds);
assert.ok(dunhuangA.mural);
assert.equal(dunhuangA.paper, dunhuangB.paper);
```

先运行：`node --test tests/theme.test.mjs tests/art-audio.test.mjs`。预期因新场景字段和纹理不存在而失败。

- [ ] **Step 2: Write minimal implementation**

在 `Palette.js` 增加 `muralBlue`、`turquoise`、`vermilion`、`apricot`、`muralGold`、`paper`、`caveNight`，并保留原 gameplay 令牌作为兼容别名。

在 `ThemeDefinition.js` 的 `REQUIRED_SCENE_KEYS` 中加入 `ambientColor`、`keyLightColor`、`fillLightColor`；继续允许颜色使用 Three.js 支持的数字或字符串表示，但 `skyTextureName` 必须是非空字符串。

在 `Textures.js` 增加小型绘制辅助函数，所有绘制仍通过 `make(name, draw)` 缓存：

```js
const clouds = make('clouds', (ctx) => {
  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = css(colors.turquoise ?? colors.stoneGreen);
  ctx.lineWidth = 10;
  for (let index = 0; index < 5; index += 1) {
    ctx.beginPath();
    ctx.arc(36 + index * 48, 92 + (index % 2) * 22, 24, Math.PI, Math.PI * 2);
    ctx.stroke();
  }
});
```

`sky` 绘制月轮、蓝紫渐变、云带和低对比星点；`paper` 绘制暖纸底色、颗粒和边饰；`mural` 保留朱砂/青绿底并增加云头、莲瓣和圆形壁画构图。`DunhuangTheme.scene` 设置 `ambientColor: stoneBlue`、`keyLightColor: muralGold`、`fillLightColor: turquoise`。

将 `DunhuangTheme.createTextures` 继续返回完整纹理集，工厂 context 允许后续任务接收 `textures`。

- [ ] **Step 3: Run tests to verify they pass**

运行：`node --test tests/theme.test.mjs tests/art-audio.test.mjs`。预期全部通过，并确认同主题纹理对象身份相同。

- [ ] **Step 4: Commit**

```bash
git add src/art/Palette.js src/art/ThemeDefinition.js src/art/themes/DunhuangTheme.js src/art/Textures.js tests/theme.test.mjs tests/art-audio.test.mjs
git commit -m "feat: add dunhuang q art tokens and textures"
```

### Task 2: Q 版 Runner、追兵、障碍和道具

**Files:**
- Modify: `src/art/Props.js`
- Modify: `src/art/themes/DunhuangTheme.js`
- Modify: `src/main.js`
- Modify: `tests/art-audio.test.mjs`
- Modify: `tests/entities.test.mjs`

**Interfaces:**
- Consumes: Task 1 的 `PALETTE`、纹理集、当前六类主题工厂和对象池语义 API。
- Produces: `createRunnerVisual(THREE, palette, config, textures)`、`createPursuerVisual(THREE, palette, textures)`、`createObstacleVisual(THREE, palette, config, textures)`、`createPickupVisual(THREE, palette, type, textures)`；返回值继续满足现有 `root`、`setType`、`setKind` 和 `userData` 契约。

- [ ] **Step 1: Write the failing test**

扩展 `tests/art-audio.test.mjs`，验证 Q 版工厂返回纹样节点而不破坏语义：

```js
const runner = props.createRunnerVisual(THREE, DUNHUANG_PALETTE, CONFIG);
assert.ok(runner.root.getObjectByName('flying-ribbon'));
assert.ok(runner.root.getObjectByName('mural-halo'));
assert.ok(runner.root.getObjectByName('face-mark'));
const coin = props.createPickupVisual(THREE, DUNHUANG_PALETTE, 'COIN');
assert.ok(coin.getObjectByName('coin-hole'));
```

增加所有障碍/道具变体的资源身份断言，保证同主题实例仍共享每个变体的 geometry、material 和可用纹理引用。先运行 `node --test tests/art-audio.test.mjs`，预期新节点断言失败。

- [ ] **Step 2: Write minimal implementation**

在 `Props.js` 提取复用辅助函数：`makeStandardMaterial`、`makeOutlineMaterial`、`addMuralBand`、`makeRibbon` 和 `makeSealIcon`。缓存仍以 `THREE + palette` 为键；新纹样使用同一主题纹理集，不在工厂调用中重复创建 CanvasTexture。

Runner 改为圆润三层结构：纸白圆脸、朱砂短袍、青绿色腰封、金色光环、两条蓝灰短腿和两段飞天飘带。命名 `flying-ribbon`、`mural-halo`、`face-mark`，保留 `leftLeg`/`rightLeg` 引用。

追兵改为蓝灰圆润石兽，增加 `beast-face`、`beast-brow`、`beast-eye-left`、`beast-eye-right` 命名节点；朱砂眼和金色眉饰使用发光但低强度的材质。

五类障碍继续使用原类型和 `heightOffset`，但增加云头端饰、朱砂/青绿识别色、暖色火盆晕光和 GAP 的金色沙缘。四类道具继续使用原类型，给铜钱增加方孔边框与内圈纹样，给护盾/加速/磁铁增加徽章外圈和对应纹样节点。

更新 `DunhuangTheme` 的六个视觉工厂，将 `textures` 从 context 传给 Props；更新 `main.js` 创建 Runner、追兵、障碍、拾取物时传入同一份 `textures`。

- [ ] **Step 3: Run tests to verify they pass**

运行：`node --test tests/art-audio.test.mjs tests/entities.test.mjs tests/core.test.mjs`。预期 Q 版节点、对象池资源复用、Runner 动画和主题接线全部通过。

- [ ] **Step 4: Commit**

```bash
git add src/art/Props.js src/art/themes/DunhuangTheme.js src/main.js tests/art-audio.test.mjs tests/entities.test.mjs
git commit -m "feat: build dunhuang q visual primitives"
```

### Task 3: 分层沙海、光照与道路构图

**Files:**
- Modify: `src/main.js`
- Modify: `src/world/TrackMesh.js`
- Modify: `src/art/themes/DunhuangTheme.js`
- Modify: `tests/core.test.mjs`
- Modify: `tests/environment.test.mjs`

**Interfaces:**
- Consumes: Task 1 的 scene light tokens 和 sky/cloud texture，Task 2 的视觉工厂。
- Produces: 使用主题 scene tokens 的灯光、天空、道路材质，以及更有层次的环境摆放，玩法接口保持不变。

- [ ] **Step 1: Write the failing test**

在 `tests/core.test.mjs` 增加静态接线断言：

```js
assert.match(main, /theme\.scene\.ambientColor/);
assert.match(main, /theme\.scene\.keyLightColor/);
assert.match(main, /theme\.scene\.fillLightColor/);
assert.match(main, /textures\.clouds/);
```

在 `tests/environment.test.mjs` 增加环境视觉仍按 `DUNE/TEMPLE/CAVE/LANTERN/FLAG` 循环复用的断言。先运行对应测试，预期因 main 仍使用固定光照和单层天空而失败。

- [ ] **Step 2: Write minimal implementation**

`main.js` 从 `theme.scene` 读取背景、雾、环境光、主光和补光颜色；为天空材质保留 `textures.sky`，并增加一个贴近天空球的半透明 `textures.clouds` 叠层。云层不参与碰撞，仅随场景固定旋转。

将天空、沙地、道路和环境的材质强度调整为“蓝紫远景 + apricot 沙丘 + muralGold 交互物”的对比关系；道路使用更浅的沙色纹理和低亮度金线，避免 Runner 被夜景吞掉。继续复用 `TrackMesh` 材质，不改变轨道采样和碰撞。

为 `EnvironmentSystem` 的环境实例保留池容量和 arc-length 位置，只通过 `setKind` 选择大色块剪影；近景密度由现有 `PerformanceBudget` 控制。

- [ ] **Step 3: Run tests to verify they pass**

运行：`node --test tests/core.test.mjs tests/environment.test.mjs tests/long-run.test.mjs`。预期主题灯光接线、环境复用和五分钟稳定性全部通过。

- [ ] **Step 4: Commit**

```bash
git add src/main.js src/world/TrackMesh.js src/art/themes/DunhuangTheme.js tests/core.test.mjs tests/environment.test.mjs
git commit -m "feat: stage dunhuang q scene lighting"
```

### Task 4: 壁画纸片 UI 与交互状态

**Files:**
- Modify: `index.html`
- Modify: `src/ui/Screens.js`
- Modify: `src/ui/Hud.js`
- Modify: `tests/presentation.test.mjs`
- Modify: `tests/design-context.test.mjs`

**Interfaces:**
- Consumes: Task 1 的 CSS/3D 令牌映射和当前原生按钮结构。
- Produces: 菜单、暂停、结果、HUD、主按钮和状态标签的统一 Q 版敦煌 DOM 视觉，保留现有 aria-label、按钮 ID 和回调行为。

- [ ] **Step 1: Write the failing test**

在 `tests/presentation.test.mjs` 增加静态断言：

```js
assert.match(html, /--mural-blue/);
assert.match(html, /--mural-gold/);
assert.match(html, /paper-panel/);
assert.match(html, /seal-button/);
assert.match(html, /prefers-reduced-motion/);
assert.match(screens, /flying-ribbon|cloud-motif/);
```

先运行 `node --test tests/presentation.test.mjs`，预期因新 CSS 类名和装饰节点不存在而失败。

- [ ] **Step 2: Write minimal implementation**

在 `index.html` 建立 Q 版 CSS 令牌和状态：`--mural-blue`、`--turquoise`、`--vermilion`、`--apricot`、`--mural-gold`、`--paper`、`--ink`、`--cave-night`。标题面板改为 `.paper-panel`，使用拱形上缘、纸张颗粒、金色边线和墨色内衬；主按钮改为 `.seal-button`，保留 `#start-button`、`#restart-button`。

在 `Screens.js` 统一输出带 `cloud-motif` 和 `flying-ribbon` 的装饰节点，菜单、暂停、结果只替换标题/正文/按钮状态，不复制不同的视觉规则。暂停/结果的按钮仍为原生 `<button>`，焦点环使用 muralGold。

在 `Hud.js` 为距离、铜钱、最高分和 power-up 添加语义图标类与 `data-kind`，保留文字内容和 live region。CSS 让 HUD 徽章在宽屏贴边、窄屏自动缩小但不遮挡画面。`prefers-reduced-motion` 下关闭飘带、云层和徽章动画。

- [ ] **Step 3: Run tests to verify they pass**

运行：`node --test tests/presentation.test.mjs tests/design-context.test.mjs tests/input.test.mjs`。预期 UI 静态契约、中文可访问按钮和输入行为全部通过。

- [ ] **Step 4: Commit**

```bash
git add index.html src/ui/Screens.js src/ui/Hud.js tests/presentation.test.mjs tests/design-context.test.mjs
git commit -m "feat: redesign dunhuang q game interface"
```

### Task 5: 缓存版本、验收记录与完整验证

**Files:**
- Modify: `index.html`
- Modify: `src/main.js`
- Modify: `src/art/Palette.js`
- Modify: `src/art/Textures.js`
- Modify: `src/art/Props.js`
- Modify: `src/art/ThemeDefinition.js`
- Modify: `src/art/ThemeRegistry.js`
- Modify: `src/art/themes/DunhuangTheme.js`
- Modify: `src/ui/Screens.js`
- Modify: `src/ui/Hud.js`
- Modify: `tests/core.test.mjs`
- Modify: `tests/presentation.test.mjs`
- Modify: `tests/design-context.test.mjs`
- Modify: `docs/验收记录.md`
- Modify: `DESIGN.md`

**Interfaces:**
- Consumes: Tasks 1–4 的所有主题、场景和 UI 实现。
- Produces: 新版本缓存查询串、设计上下文、浏览器证据和可回滚的最终提交。

- [ ] **Step 1: Write the failing test**

将入口与所有被修改的运行时依赖期望版本提升到 `20260921-13`：

```js
assert.match(html, /main\.js\?v=20260921-13/);
assert.match(main, /ThemeRegistry\.js\?v=20260921-13/);
assert.match(themeRegistry, /ThemeDefinition\.js\?v=20260921-13/);
```

在 `docs/验收记录.md` 增加 Q 版视觉验收行，先运行静态测试确认旧版本断言失败。

- [ ] **Step 2: Write minimal implementation**

统一更新入口、主题依赖、Props/Palette/Textures/DunhuangTheme、Screens/Hud 的查询串，避免旧模块和新 CSS 混用。同步在 `DESIGN.md` 写入 Q 版令牌、轮廓语言、纸片 UI 与上海外滩替换边界。

更新验收记录，记录菜单、开始后三秒、暂停/重开、方向键、窄视口和日志结果；如果死亡覆盖层没有在固定浏览器时间内自然出现，明确记录自动化覆盖而不伪造手动证据。

- [ ] **Step 3: Run the complete verification**

依次运行：

```bash
npm test
git diff --check
python3 /Users/yuleicui/.codex/plugins/cache/openai-curated-remote/frontend-design-premium/1.4.0/skills/frontend-design-premium/scripts/audit_project.py /Users/yuleicui/Documents/ChatGPT/dunhuang_game --mode strict
```

浏览器使用 `http://127.0.0.1:4173/?accept=audio-v5`，确认 v13 入口加载，菜单和开始后画面符合 Q 版验收项，完成暂停/继续/重开、左右方向和 640×480 检查；读取 warn/error 日志。

- [ ] **Step 4: Commit**

```bash
git add index.html src docs DESIGN.md tests docs/验收记录.md
git commit -m "test: record dunhuang q art acceptance"
```

- [ ] **Step 5: Final handoff**

确认 `git status --short --branch` 干净，汇总 `npm test` 通过数、设计审计结果、浏览器截图/状态和所有任务 commit。保留 `main` 分支，供用户直接通过本地服务器体验。
