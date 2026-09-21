# 敦煌主题化美术系统实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变跑酷玩法、碰撞和对象池协议的前提下，交付一版完整敦煌风格的程序化场景、人物、障碍物和道具，并把视觉实现隔离成可快速替换为上海外滩主题的适配器。

**Architecture:** 以 `ThemeDefinition` 约束主题工厂，以 `ThemeRegistry` 选择当前主题；敦煌主题闭包持有现有颜色令牌并组合共享的几何体、材质和 CanvasTexture。`main.js` 只装配主题工厂，Runner/Spawner/TrackMesh/Environment 继续拥有行为和对象池生命周期，主题不进入游戏状态机或碰撞系统。

**Tech Stack:** 原生 ES Modules、Three.js 0.169.0 CDN importmap、程序化 BufferGeometry/CanvasTexture、DOM/CSS HUD、Node.js 内置测试运行器；不引入构建工具或外部二进制美术资源。

**Spec:** `docs/superpowers/specs/2026-09-20-dunhuang-art-theme-design.md`

## Global Constraints

- Three.js 固定使用 `0.169.0`，通过 CDN importmap 引入。
- 不使用 npm、Vite、Webpack、React、Vue、TypeScript，也不添加 png/jpg/glb/gltf/fbx/mp3/外部字体依赖。
- 渲染循环不创建临时 Vector3、Matrix4、材质或几何体；材质、纹理和对象在初始化/池预热阶段创建并复用。
- 所有主题工厂必须保留现有 `setType(type)`、`userData.heightOffset`、`userData.kind` 和 Runner 双腿节点语义。
- 主题只负责视觉对象与令牌，不决定速度、车道、碰撞、生成概率、得分或游戏状态。
- 纹理缓存键必须包含 `themeId:name`，防止未来上海主题复用敦煌纹理实例。
- 所有产品代码改动先写会失败的测试，验证通过后再实现；每个任务完成后创建对应 Git commit。
- 交付前必须执行完整 `npm test`、`git diff --check` 和浏览器烟测，并记录实际结果。

## Review Focus

1. **主题契约完整性**：缺少工厂或返回错误对象时必须在初始化阶段失败且指出字段；未知主题 ID 必须安全回退默认主题。由 Task 1 的契约/注册表测试覆盖。
2. **行为与视觉解耦**：换主题不能改变 Runner 状态、障碍类型字符串、碰撞高度或对象池上限。由 Task 4 的注入测试和现有 gameplay/long-run 测试覆盖。
3. **低清晰度识别**：窄视口、降级像素比和远景雾化下，Runner、追兵、障碍和拾取物仍能用轮廓与明度区分。由 Task 3 的形状语义测试和 Task 6 的浏览器截图检查覆盖。
4. **缓存与生命周期**：同一主题重复初始化不重复创建纹理；切换主题不会复用错误纹理，运行中不增长材质/几何体数量。由 Task 2 缓存测试和 Task 6 长跑检查覆盖。
5. **主题切换回归**：替换一个主题 ID 后仍能完成 `MENU → PLAYING → PAUSED → DEAD`，而且输入、计分、最高分和重开不变。由 Task 4 集成测试和 Task 6 浏览器流程覆盖。

### Task 1: 建立主题契约、注册表和敦煌适配器

**Files:**
- Create: `src/art/ThemeDefinition.js`
- Create: `src/art/ThemeRegistry.js`
- Create: `src/art/themes/DunhuangTheme.js`
- Modify: `src/art/Props.js`
- Test: `tests/theme.test.mjs`

**Interfaces:**
- Produces `assertThemeDefinition(theme)`, `DEFAULT_THEME_ID`, `getTheme(id)`, `listThemeIds()` 和 `DUNHUANG_THEME`。
- `DUNHUANG_THEME` 提供 `id`、`palette`、`scene`、`createTextures`、`createRunnerVisual`、`createPursuerVisual`、`createObstacleVisual`、`createPickupVisual`、`createEnvironmentVisual`。
- `createRunnerVisual({ THREE, config })` 返回 `{ root, leftLeg, rightLeg }`；其余工厂保持现有对象协议。

- [ ] **Step 1: Write the failing test**

在 `tests/theme.test.mjs` 写入真实模块契约测试：

```js
test('theme registry exposes a validated Dunhuang theme and safe fallback', async () => {
  const { getTheme, listThemeIds } = await import('../src/art/ThemeRegistry.js');
  const theme = getTheme();
  const fallback = getTheme('does-not-exist');

  assert.equal(theme.id, 'dunhuang');
  assert.equal(fallback, theme);
  assert.deepEqual(listThemeIds(), ['dunhuang']);
  for (const name of [
    'createTextures', 'createRunnerVisual', 'createPursuerVisual',
    'createObstacleVisual', 'createPickupVisual', 'createEnvironmentVisual',
  ]) assert.equal(typeof theme[name], 'function', `${name} must be a theme factory`);
});
```

再增加缺失字段测试，调用 `assertThemeDefinition({ id: 'broken' })` 并断言错误消息包含 `palette` 和第一个缺失工厂名。

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/theme.test.mjs`

Expected: FAIL because the contract, registry and built-in theme modules do not exist yet.

- [ ] **Step 3: Write minimal implementation**

实现 `assertThemeDefinition` 的字段列表和 `ThemeRegistry` 的默认注册/未知 ID 回退；在 `DunhuangTheme.js` 中闭包绑定 `PALETTE`，把现有纹理与 Props 工厂包装成契约函数。

从 `Runner._buildMesh` 提取 `createRunnerVisual(THREE, palette, config)` 到 `Props.js`，返回可动画的 `root/leftLeg/rightLeg`，不改变几何尺寸和运行时状态。

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/theme.test.mjs`

Expected: all theme tests PASS，且 `listThemeIds()` 只有 `dunhuang`。

- [ ] **Step 5: Commit**

```bash
git add src/art/ThemeDefinition.js src/art/ThemeRegistry.js src/art/themes/DunhuangTheme.js src/art/Props.js tests/theme.test.mjs
git commit -m "feat: add theme contract and dunhuang adapter"
```

### Task 2: 隔离主题纹理缓存并补齐场景令牌

**Files:**
- Modify: `src/art/Textures.js`
- Modify: `src/art/themes/DunhuangTheme.js`
- Test: `tests/art-audio.test.mjs`
- Test: `tests/theme.test.mjs`

**Interfaces:**
- `createTextureSet(THREE, document, palette, themeId = 'dunhuang')` 保持旧参数兼容，返回 `stone/sand/mural/caisson/sky`。
- 同一 `themeId:name` 返回同一 CanvasTexture；不同主题 ID 即使使用相同名字也必须返回不同纹理实例。
- `theme.scene.backgroundColor` 和 `theme.scene.fogColor` 由主题令牌提供，默认与敦煌 `PALETTE.nightTeal` 一致。

- [ ] **Step 1: Write the failing test**

在现有 Canvas/Three 测试替身上增加：

```js
test('texture cache is isolated by theme id but reuses same-theme textures', async () => {
  const { createTextureSet } = await import('../src/art/Textures.js');
  const dunhuangA = createTextureSet(TEST_THREE, TEST_DOCUMENT, PALETTE, 'dunhuang');
  const dunhuangB = createTextureSet(TEST_THREE, TEST_DOCUMENT, PALETTE, 'dunhuang');
  const shanghai = createTextureSet(TEST_THREE, TEST_DOCUMENT, PALETTE, 'shanghai-bund');

  assert.equal(dunhuangA.sky, dunhuangB.sky);
  assert.notEqual(dunhuangA.sky, shanghai.sky);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/art-audio.test.mjs`

Expected: FAIL because the current cache key only包含纹理名称，跨主题会复用同一个实例。

- [ ] **Step 3: Write minimal implementation**

将 `textureCache` 键改为 `` `${themeId}:${name}` ``，并让 `DUNHUANG_THEME.createTextures` 传入固定主题 ID；CanvasTexture 仍设置 `SRGBColorSpace` 和 `RepeatWrapping`。为主题增加 `scene` 令牌并由断言测试其颜色与 palette 一致。

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/art-audio.test.mjs tests/theme.test.mjs`

Expected: PASS，且原有程序化纹理测试不回归。

- [ ] **Step 5: Commit**

```bash
git add src/art/Textures.js src/art/themes/DunhuangTheme.js tests/art-audio.test.mjs tests/theme.test.mjs
git commit -m "fix: isolate procedural textures by theme"
```

### Task 3: 完成敦煌场景、人物、障碍和道具视觉原语

**Files:**
- Modify: `src/art/Props.js`
- Modify: `src/art/Textures.js`
- Test: `tests/art-audio.test.mjs`

**Interfaces:**
- 保持 `createObstacleVisual(THREE, palette, config)`、`createPickupVisual(THREE, palette, type)`、`createEnvironmentVisual(THREE, palette)` 的现有调用兼容。
- 每个视觉工厂只在初始化阶段创建几何体/材质；`setType`/`setKind` 只切换已创建节点、颜色、比例和可见性。

- [ ] **Step 1: Write the failing test**

扩展 `tests/art-audio.test.mjs`：

```js
test('Dunhuang visual factories expose recognizable semantic variants', async () => {
  const props = await import('../src/art/Props.js');
  const beam = props.createObstacleVisual(TEST_THREE, PALETTE, CONFIG);
  beam.setType('BEAM');
  assert.equal(beam.userData.obstacleType, 'BEAM');
  assert.ok(beam.userData.heightOffset > 0);

  const coin = props.createPickupVisual(TEST_THREE, PALETTE, 'COIN');
  assert.equal(coin.userData.kind, 'COIN');
  const environment = props.createEnvironmentVisual(TEST_THREE, PALETTE);
  environment.setKind('TEMPLE');
  assert.equal(environment.userData.activeKind, 'TEMPLE');
});
```

另外断言 Runner 视觉返回双腿节点，且双腿属于 root 的 children/后代。

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/art-audio.test.mjs`

Expected: FAIL on missing semantic metadata or insufficient environment/Runner visual structure.

- [ ] **Step 3: Write minimal implementation**

实现第一版敦煌原语：

- Runner 使用赭红长袍、石膏色头部、金色光环/飘带和青蓝腰饰；保留可动画双腿。
- 追兵增加砂岩镇墓兽的面部层次、金色角饰、朱砂眼睛和石质鬃毛。
- `BEAM/PILLAR/FIRE/GAP` 和默认低栏使用不同几何组合与材质明度，而不是只改变缩放。
- 铜钱改为具有方孔语义的金色环体；护盾使用石青藻井/莲花几何；加速使用朱砂飘带符印。
- 环境的五类变体使用沙丘、洞窟/寺门、石灯、经幡和壁画色带的组合，并通过 `setKind` 只显示一个变体。

共享材质和几何体引用，不在 `setType` 或 `setKind` 中调用 `new`。

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/art-audio.test.mjs`

Expected: PASS，且现有音频模块测试仍通过。

- [ ] **Step 5: Commit**

```bash
git add src/art/Props.js src/art/Textures.js tests/art-audio.test.mjs
git commit -m "feat: build dunhuang visual primitives"
```

### Task 4: 将主题工厂接入 Runner、场景和所有对象池

**Files:**
- Modify: `src/entities/Runner.js`
- Modify: `src/main.js`
- Modify: `src/world/TrackMesh.js`
- Modify: `src/world/Environment.js`
- Modify: `tests/entities.test.mjs`
- Modify: `tests/core.test.mjs`
- Modify: `tests/presentation.test.mjs`

**Interfaces:**
- `Runner` 构造函数接受可选 `createVisual({ THREE, config })`；未传入时保留当前默认构建路径。
- `main.js` 从 `getTheme(DEFAULT_THEME_ID)` 获取主题，统一使用 `theme.palette` 和主题工厂。
- ObstacleSpawner、PickupSpawner、EnvironmentSystem 仍收到无参数 `createVisual` 回调，但回调内部调用当前主题工厂。

- [ ] **Step 1: Write the failing test**

在 `tests/entities.test.mjs` 增加主题工厂注入测试：

```js
test('Runner consumes a theme visual factory without changing movement state', async () => {
  const { Runner } = await import('../src/entities/Runner.js');
  const calls = [];
  const visual = { root: new TestNode(), leftLeg: new TestNode(), rightLeg: new TestNode() };
  visual.root.add(visual.leftLeg, visual.rightLeg);
  const runner = new Runner({
    THREE: TEST_THREE, Vector3: TestVector3, track: createTrack(), config: CONFIG,
    palette: { ochreRed: 0, plaster: 0, dunhuangGold: 0, stoneBlue: 0, ink: 0 },
    createVisual: (context) => { calls.push(context.config); return visual; },
  });
  runner.handleAction('LEFT');
  runner.update(CONFIG.runner.laneChangeTime);
  assert.equal(calls.length, 1);
  assert.equal(runner.root, visual.root);
  assert.equal(runner.laneIndex, 0);
});
```

在 `tests/core.test.mjs`/`tests/presentation.test.mjs` 断言 `main.js` 导入主题注册表并把当前主题工厂传入装配点。

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/entities.test.mjs tests/core.test.mjs tests/presentation.test.mjs`

Expected: FAIL because Runner ignores `createVisual` and main still imports/constructs art directly.

- [ ] **Step 3: Write minimal implementation**

在 Runner 构造函数中优先消费 `createVisual` 返回的 root/双腿，否则走旧 `_buildMesh`；`reset`、动画、碰撞盒和状态机不改变。

在 `main.js`：

```js
const theme = getTheme(DEFAULT_THEME_ID);
const textures = theme.createTextures({ THREE, document });
const runner = new Runner({ ..., palette: theme.palette, createVisual: theme.createRunnerVisual });
```

将追兵、障碍、拾取物、环境和 `TrackMesh` 全部改为消费同一个 `theme`，背景/雾色来自 `theme.scene`；不在循环中创建主题对象。

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/entities.test.mjs tests/core.test.mjs tests/presentation.test.mjs tests/long-run.test.mjs`

Expected: PASS，且 5 分钟确定性运行的对象池上限不变。

- [ ] **Step 5: Commit**

```bash
git add src/entities/Runner.js src/main.js src/world/TrackMesh.js src/world/Environment.js tests/entities.test.mjs tests/core.test.mjs tests/presentation.test.mjs
git commit -m "feat: wire theme factories through runtime"
```

### Task 5: 固化设计令牌、缓存版本与验收记录

**Files:**
- Modify: `DESIGN.md`
- Modify: `docs/验收记录.md`
- Modify: `index.html`
- Modify: `src/main.js`
- Modify: `tests/core.test.mjs`
- Modify: `tests/presentation.test.mjs`

**Interfaces:**
- `DESIGN.md` 记录 ThemeDefinition 的运行时契约、敦煌令牌和上海外滩替换边界。
- 入口和运行时模块版本递增，确保浏览器不继续命中旧的 `main.js`/theme 依赖缓存。

- [ ] **Step 1: Write the failing test**

更新静态契约测试，先把期望版本改为确定的下一版本 `main.js?v=20260920-11`，执行测试确认当前入口仍是旧版本而失败。

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/core.test.mjs tests/presentation.test.mjs`

Expected: FAIL on the old entry/module version.

- [ ] **Step 3: Write minimal implementation**

同步更新 `DESIGN.md`、验收记录、入口 query string、主题依赖 query string 和静态测试；在验收记录中增加场景、人物、障碍、道具和无外部资源的检查项。

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/core.test.mjs tests/presentation.test.mjs`

Expected: PASS，且 `git diff --check` 无输出。

- [ ] **Step 5: Commit**

```bash
git add DESIGN.md docs/验收记录.md index.html src/main.js tests/core.test.mjs tests/presentation.test.mjs
git commit -m "docs: record theme art tokens and acceptance evidence"
```

### Task 6: 完整验证与浏览器美术烟测

**Files:**
- Modify: `docs/验收记录.md` only if actual evidence changes
- Test: all `tests/*.test.mjs`

**Interfaces:**
- 不新增运行时接口；本任务只验证交付物和记录真实证据。

- [ ] **Step 1: Run the full automated suite**

Run: `npm test`

Expected: all tests pass with zero failures, skips, or unhandled warnings.

- [ ] **Step 2: Run static checks**

Run: `git diff --check`

Expected: no whitespace errors.

- [ ] **Step 3: Exercise the local browser**

Start `python3 -m http.server 4173 --bind 127.0.0.1`, load `http://127.0.0.1:4173/?accept=audio-v5`, and verify:

1. menu has the Dunhuang sky/palette;
2. start shows the red-robed Runner, stone beast, road, environment props, obstacles and pickups;
3. pause, resume, restart and death overlays keep their themed scene objects;
4. `←/→` still move in the corrected screen direction;
5. a narrow viewport keeps Runner/HUD recognizable;
6. browser error/warn logs remain empty.

- [ ] **Step 4: Record only observed evidence**

Update `docs/验收记录.md` with the observed entry version, browser flow and any unresolved visual/performance risk; do not claim a check that was not run.

- [ ] **Step 5: Commit any evidence-only change**

```bash
git add docs/验收记录.md
git commit -m "test: record dunhuang art browser verification"
```

## Plan Self-Review

- Spec coverage: ThemeDefinition/Registry, Dunhuang factories, texture isolation, Runner injection, runtime wiring, Shanghai extension boundary, performance and acceptance are each assigned to a task.
- Placeholder scan: no TODO/TBD or deferred implementation step appears in the task instructions; Shanghai art itself is explicitly out of this version's scope in the spec.
- Interface consistency: `createRunnerVisual` always returns `root/leftLeg/rightLeg`; all other factories use the context signatures defined in the spec; legacy direct Props signatures remain compatible until main wiring is complete.
- Review focus coverage: all five high-risk inputs map to Task 1, 2, 3, 4 or 6 tests/verification steps.

## Execution Handoff

计划已保存至 `docs/superpowers/plans/2026-09-20-dunhuang-art-theme.md`。建议采用 Native 方式：任务之间共享 `ThemeDefinition`、Runner 视觉节点和对象池生命周期，连续实现与浏览器截图迭代比并行拆分更容易保持接口一致。请审阅这份计划，并选择 Native 或 Subagent-driven 执行方式。
