# 敦煌逃亡可行性研究与实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不依赖构建工具和外部美术资源的前提下，交付一个可直接由静态服务器运行的 Three.js r169 敦煌主题 3D 无限跑酷原型，并逐步达到规格中的完整验收清单。

**Architecture:** 采用世界静止、玩家沿参数化轨道推进的方案。核心层提供固定步长循环、状态机和输入；世界层提供轨道、路面和对象池；实体层处理玩家、追兵和相机；系统与表现层处理碰撞、道具、计分、UI、程序化美术和 Web Audio。所有跨层通信通过小型数据接口完成，避免模块互相直接改写内部状态。

**Tech Stack:** 原生 JavaScript ES Modules、Three.js 0.169.0 CDN importmap、CanvasTexture、Web Audio API、DOM/CSS HUD、浏览器 localStorage；无 npm、无打包器、无外部图片/模型/音频/字体。

**Spec:** `敦煌逃亡_AI开发提示词.md` 与 `敦煌逃亡_代码架构分层图.html`

## 可行性结论

### 总体结论

项目技术上可行，适合先做“可玩 MVP”再做视觉和性能打磨。浏览器能力足以支持三条跑道、参数化弯道、程序化几何、Canvas 纹理、Web Audio 和 DOM HUD。规格中最有风险的不是单个 API，而是同时满足无限生成、对象池、移动端帧率、无资源依赖、无渲染循环临时对象和 16 项验收的组合复杂度。

### 可原样落地的部分

- Three.js r169 + importmap + 原生 ES Modules：可行，静态服务器即可运行。
- 基于 `evalTrack(s)` 的玩家推进：可行，比整体移动世界更适合弯道和坡道。
- 三车道、跳跃、滑铲、换道、追兵距离博弈：可行，碰撞规则可以完全确定性实现。
- Canvas 纹理、程序化几何、Web Audio 合成：可行，且满足零二进制资源约束。
- DOM/CSS HUD、localStorage 最高分、visibilitychange 自动暂停：可行。

### 需要工程化处理的高风险点

1. **轨道弯道与路面网格接缝**：需要先冻结采样点、切线和右向量的定义，再实现网格；否则玩家、障碍和路面会出现坐标不一致。
2. **“无 new”约束**：应解释为禁止在每帧 render 阶段创建临时对象。初始化和对象池预热阶段可以创建对象；更新阶段只复用预分配向量和数组。
3. **无限生成与回收**：必须按 `s` 区间回收轨道采样、障碍、硬币、装饰物和粒子，否则 5 分钟内就可能出现内存增长。
4. **移动端性能**：120 draw call / 120k 三角面 / 30 FPS 目标可以达到，但必须限制动态灯光、阴影质量、装饰密度和粒子数量，并实现降级开关。
5. **“五种障碍都能对应规避”**：火盆、断层需要与跳跃曲线和轨道坡度共同测试，不能只在直道上验证。
6. **自动播放策略**：背景音和音效必须等首次点击/触摸后启动 AudioContext，并允许静音状态持久化。

### 规格中的文档不一致

架构图的描述写着“共 16 个模块”，但提示词目录实际包含 20+ 个文件（例如 `PickupSpawner.js`、`PowerUp.js`、`Sfx.js`、`Hud.js`、`Screens.js` 等）。实施时以提示词的目录与职责为准，架构图只作为层级关系参考；首版可将重复职责拆分为独立文件，避免为了满足“16”而合并模块。

### 推荐的交付策略

- 先交付 P1–P3 的可玩核心，证明循环、轨道推进和操作手感。
- 再加入 P4–P6 的弯道、障碍、碰撞、铜钱、道具、追兵，形成完整玩法闭环。
- 最后加入 P7–P8 的敦煌美术、音效、粒子、性能降级和验收自动化。
- 每一阶段都保留可运行版本，不把所有模块一次性堆到最后才测试。

## 全局约束

- Three.js 固定使用 `0.169.0`，通过 CDN importmap 引入。
- 不使用 npm、Vite、Webpack、React、Vue、TypeScript。
- 不引用任何 png/jpg/glb/gltf/fbx/mp3/外部字体；视觉和音频全部程序化生成。
- 渲染循环不创建临时 Vector3、Matrix4、材质或几何体；对象必须预分配或来自对象池。
- 触摸和鼠标事件使用 `{ passive: false }`，处理器中调用 `preventDefault()`。
- 所有数值集中到 `src/core/Config.js`，所有颜色集中到 `src/art/Palette.js`。
- 使用现代 Three.js API：`BufferGeometry`、`colorSpace`、`THREE.SRGBColorSpace`。

## 文件边界与接口

### 入口与核心层

- `index.html`：importmap、canvas 容器、HUD 容器、错误提示容器、全局 CSS。
- `src/main.js`：创建 renderer/scene/camera，装配所有系统，启动 Loop，注册全局错误捕获。
- `src/core/Config.js`：复制规格中的全部可调参数，并补充性能、池大小和调试开关。
- `src/core/GameState.js`：定义 `LOADING/MENU/PLAYING/PAUSED/DEAD`，提供 `transition()` 和状态变更回调。
- `src/core/Input.js`：统一键盘、触摸、鼠标、重力输入，输出一次性动作事件。
- `src/core/Loop.js`：固定 `1/60` 更新、最大帧间隔、渲染插值和暂停处理。

### 世界层

- `src/world/TrackGraph.js`：段生成、弧长采样、`evalTrack(s)`、`trackLength()`、`ensureAhead()`、回收窗口。
- `src/world/TrackMesh.js`：根据采样点构造/更新三角带路面、车道线、栏杆，并处理 GAP 缺口。
- `src/world/ChunkPool.js`：装饰物对象池和按弧长回收。
- `src/world/ObstacleSpawner.js`：按难度生成障碍；物理障碍强制至少保留一条 lane，GAP 特殊组占满三道并以跳跃作为通路。
- `src/world/PickupSpawner.js`：硬币串、弧形串、磁铁/护盾/加速生成与回收。

### 实体、系统与表现层

- `src/entities/Runner.js`：沿轨道移动、换道、跳跃、滑铲、状态和碰撞盒。
- `src/entities/Pursuer.js`：按 `evalTrack(playerS-distance)` 定位和距离博弈。
- `src/entities/CameraRig.js`：跟随、FOV、预转向和震屏。
- `src/systems/Collision.js`：仅根据 `s/lane/y/碰撞盒` 做确定性判定，并应用 20% 宽容。
- `src/systems/PowerUp.js`：磁铁、护盾、加速状态与倒计时。
- `src/systems/Score.js`：距离、硬币、总分、localStorage 最高分。
- `src/art/Palette.js`、`Textures.js`、`Props.js`、`Fx.js`：色板、缓存纹理、场景构件和粒子池。
- `src/audio/Sfx.js`：AudioContext、事件音效、五声音阶背景音、静音偏好。
- `src/ui/Hud.js`、`Screens.js`：HUD、菜单、暂停、结算与错误提示。

## 分阶段技术计划

### Task 1：P1 骨架与错误可见性

**Files:** 创建 `index.html`、`src/main.js`、`src/core/Config.js`、`src/core/GameState.js`、`src/core/Loop.js`。

- [ ] 建立 importmap、canvas、HUD 和错误容器。
- [ ] 创建 renderer、scene、PerspectiveCamera、雾、基础灯光与一条静态直道。
- [ ] 实现固定步长循环和 `LOADING → MENU → PLAYING` 状态转换。
- [ ] 添加 `window.onerror` 与 `unhandledrejection`，把错误渲染到页面而不是白屏。
- [ ] 验收：本地静态服务器打开后无控制台错误，画面显示直道和方块角色。

### Task 2：轨道骨架、推进和相机

**Files:** 创建 `src/world/TrackGraph.js`、`src/world/TrackMesh.js`、`src/entities/Runner.js`、`src/entities/CameraRig.js`。

- [ ] 先写 `evalTrack(s)` 的直道、坡道和左右弯单元测试/调试页面。
- [ ] 实现 `ensureAhead(playerS, 220)`、采样点回收和连续弯道间插入直道。
- [ ] 用采样点的 `position/forward/right` 生成路面三角带，验证弯道无接缝。
- [ ] 让 Runner 按 `speed=min(maxSpeed, baseSpeed+s*accelPerMeter)` 沿轨道推进。
- [ ] 实现相机位置平滑、横向跟随 35%、速度 FOV 和预转向。
- [ ] 验收：角色连续跑过直道、左右 90° 弯道和坡道，摄像机不穿模。

### Task 3：统一输入与玩家动作

**Files:** 创建 `src/core/Input.js`，修改 `src/entities/Runner.js`、`src/core/GameState.js`。

- [ ] 实现键盘 A/D/W/S、箭头、Space、Esc/P。
- [ ] 实现一次性触摸/鼠标滑动识别，阈值 30px，所有监听器被动标记为 false。
- [ ] 实现 0.14 秒 smoothstep 换道、边界过冲回弹、0.78 秒跳跃、0.72 秒滑铲。
- [ ] 实现输入缓冲和 coyote time，禁止二段跳和长按重复触发。
- [ ] 验收：桌面和 DevTools 触摸模拟均可四向操作。

### Task 4：障碍、碰撞与完整跑局

**Files:** 创建 `src/world/ObstacleSpawner.js`、`src/systems/Collision.js`、`src/systems/Score.js`。

- [ ] 生成低栏、悬梁、立柱、火盆、GAP 五类障碍，按难度权重生成。
- [ ] 物理障碍每个横截面随机占 1–2 lane，若占满三 lane 则重抽；GAP 特殊组占满三道但必须可由一次跳跃通过；验证连续 5 分钟不存在必死组。
- [ ] 按规格实现跳/滑/换道容差与 20% 判定收窄。
- [ ] 撞击时扣追兵距离、降低速度、触发短暂恢复；记录距离和分数。
- [ ] 验收：五种障碍实际出现且规避动作有效，撞击能进入死亡条件准备状态。

### Task 5：硬币、道具与追兵

**Files:** 创建 `src/world/PickupSpawner.js`、`src/systems/PowerUp.js`、`src/entities/Pursuer.js`。

- [ ] 生成 5–9 枚硬币串和 20% 弧形串，按最小间距回收。
- [ ] 实现磁铁半径 6、护盾一次免伤、加速 4.5 秒无敌与时间重置。
- [ ] 实现追兵起始距离 18、恢复速率 1.6、撞击 -4.5、距离 ≤0 死亡。
- [ ] 为硬币、道具、障碍和粒子统一建立池化接口，禁止无限 push。
- [ ] 验收：硬币 HUD 增长、三种道具倒计时正确、撞 3–5 次可被追上。

### Task 6：敦煌程序化美术与环境

**Files:** 创建 `src/art/Palette.js`、`Textures.js`、`Props.js`、`src/world/ChunkPool.js`，修改 `TrackMesh.js` 和 `main.js`。

- [ ] 固化规格色板和四类 256×256 缓存纹理，设置 `SRGBColorSpace` 与 RepeatWrapping。
- [ ] 构建飞檐楼阁、石窟、灯笼、经幡、沙丘、石兽和角色细节。
- [ ] 添加天空球、雾、主光/补光、移动阴影目标；活动 PointLight ≤6、灯笼 ≤24。
- [ ] 装饰物按弧长从池中取用，超出回收窗口归还。
- [ ] 验收：无外部资源，画面具备敦煌色彩层次，静态物体关闭 matrixAutoUpdate。

### Task 7：粒子、音频与 UI

**Files:** 创建 `src/art/Fx.js`、`src/audio/Sfx.js`、`src/ui/Hud.js`、`src/ui/Screens.js`。

- [ ] 实现铜钱爆散、撞击闪屏、落地沙尘、加速速度线、磁铁飞行、暗角和震屏。
- [ ] 首次用户交互后 resume AudioContext；实现拾币、跳跃、滑铲、撞击、咆哮和背景五声音阶。
- [ ] 实现开始、暂停、死亡、结算面板和最高分存档；HUD 使用 DOM、内联 SVG 和 conic-gradient。
- [ ] 实现 visibilitychange 自动暂停与静音开关持久化。
- [ ] 验收：结算数值正确，再来一次无残留，切换标签页不瞬移。

### Task 8：性能、自适应降级与验收

**Files:** 修改 `Config.js`、`Loop.js`、`main.js`、各对象池与 UI；新增 `docs/` 验收记录。

- [ ] 添加帧时间采样：平均帧率低于 45 持续 3 秒时，将阴影 1024→512→关闭，并降低装饰密度。
- [ ] 在 Chrome DevTools 设备模拟与桌面 1080p 下测量 FPS、draw call、三角面、内存趋势。
- [ ] 连续运行 5 分钟检查池大小稳定、对象回收和控制台零错误。
- [ ] 按提示词第 9 节逐条记录 16 项验收结果；未通过项保留复现步骤和修复任务。
- [ ] 验收：桌面稳定 60 FPS、移动端 ≥30 FPS（目标值），无明显内存持续增长。

## Review Focus（高风险验收点）

1. **轨道采样连续性**：弯道入口/出口的 `forward/right` 是否连续，路面是否出现裂缝；由 Task 2 的调试轨迹和几何断言覆盖。
2. **必留通路**：任何障碍组是否至少保留一条可通行 lane；由 Task 4 的生成器测试和 5 分钟模拟覆盖。
3. **动作容差**：边缘跳跃、悬梁滑铲、换道擦边是否按“宁可放过”处理；由 Task 3/4 的边界用例覆盖。
4. **回收稳定性**：连续跑局后对象池、采样点和材质数量是否稳定；由 Task 5/8 的长跑内存检查覆盖。
5. **浏览器生命周期**：首次交互、静音、标签页失焦、移动触摸滚动是否正确；由 Task 3/7/8 的手工验收覆盖。

## 自评与缺口

- 规格中的所有核心模块均已映射到任务；架构图的“16 模块”数量说明按目录实际文件数修正。
- 轨道、输入、碰撞、生成、回收、UI、音频、性能和 16 项验收均有对应阶段。
- 需要在实现阶段补充浏览器兼容性矩阵（Chrome/Edge/Safari 版本）和无网络时 CDN 失败提示；这不改变当前架构，但应作为 Task 1 的错误提示增强项。

## 执行建议

计划完成并保存于 `docs/superpowers/plans/2026-09-20-dunhuang-run.md`。建议采用 Native 方式按 Task 1→8 顺序实现，因为轨道接口和对象池接口是后续所有系统的共同依赖，连续集成比并行拆分更容易保持坐标与生命周期一致。实现前请先确认这份计划，确认后再进入编码阶段。
