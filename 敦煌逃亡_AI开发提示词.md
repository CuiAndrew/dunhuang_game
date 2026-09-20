# 《敦煌逃亡》Three.js 开发提示词

> **使用方法**：把本文件从「第 0 节」开始的内容**整份粘贴**给 Claude Code / Cursor / Codex 等编码 AI，作为一次性交付需求。
> 如果对方上下文有限，按「第 2 节 → 第 4 节 → 第 9 节」的优先级分段投喂，但**第 4 节的数值参数必须完整给到**，那是它最容易写崩的部分。

---

## 0. 角色设定与工作方式

你是一名资深 Web 游戏工程师兼技术美术，做过完整上线的 HTML5 3D 游戏。

本次任务：**从零实现一个可直接运行的中国古风 3D 无限跑酷游戏《敦煌逃亡》**，玩法对标《神庙逃亡》（Temple Run），主题从"丛林神庙"替换为"敦煌洞窟与沙海"。

工作方式要求：

1. **先输出实现计划**（文件清单 + 每个文件的职责 + 关键算法选型），等我确认后再开始写代码。
2. 然后**按文件逐个输出完整可运行代码**，不要省略、不要写 `// ... 其余同理`、不要留 TODO。
3. 全部文件写完后，输出**运行方式**和**自测清单的逐条验证结果**。
4. 如果规格中有你认为技术上不可行的点，**先指出来并给替代方案**，不要静默改需求。

---

## 1. 项目概览

| 项 | 内容 |
|---|---|
| 游戏名 | 《敦煌逃亡》（Dunhuang Run） |
| 类型 | 3D 无限跑酷 / Endless Runner |
| 平台 | 桌面浏览器（Chrome / Edge / Safari） + 移动浏览器 |
| 视角 | 第三人称背后跟随视角 |
| 单局时长 | 目标 60~180 秒，难度递增直到死亡 |
| 核心体验 | 玩家扮演从壁画中走出的行者，在敦煌洞窟与沙海间**不停向前跑**，躲避障碍、收集铜钱，逃离身后苏醒的石兽 |
| 情绪关键词 | 苍茫、厚重、流畅、有压迫感 |

**一句话玩法**：自动向前跑 → 左右换道 / 跳 / 滑铲躲障碍 → 吃铜钱分 → 撞多了被石兽追上 → 重开。

---

## 2. 硬性技术约束（不可协商）

1. **Three.js r169**，通过 CDN + importmap 引入，**不使用任何打包工具**（不用 Vite / Webpack / npm）：

```html
<script type="importmap">
{
  "imports": {
    "three": "https://unpkg.com/three@0.169.0/build/three.module.js",
    "three/addons/": "https://unpkg.com/three@0.169.0/examples/jsm/"
  }
}
</script>
<script type="module" src="./src/main.js"></script>
```

2. **原生 JavaScript + ES Modules**，不引入 React / Vue / TypeScript。
3. **【最关键的一条】零外部美术资源依赖。**
   不允许引用任何 `.png` / `.jpg` / `.glb` / `.gltf` / `.fbx` / `.mp3` / 外部字体文件。
   所有视觉元素必须用 **Three.js 内置几何体 + 程序化材质 + Canvas 生成的纹理** 现场构建。
   理由：AI 无法生成二进制资源，一旦引用不存在的文件，整个项目直接跑不起来。
4. **音频使用 Web Audio API 程序化合成**（振荡器 + 包络），或用静默桩函数，禁止引用音频文件。
5. **不得使用已废弃 API**：不要用 `THREE.Geometry`、`outputEncoding`、`sRGBEncoding`、`physicallyCorrectLights` 等旧写法，统一用 `BufferGeometry`、`colorSpace`、`THREE.SRGBColorSpace`。
6. **渲染循环内禁止 `new` 任何对象**（Vector3 / Matrix4 / 材质等），全部预分配复用，避免 GC 抖动。
7. 触摸与鼠标事件必须加 `{ passive: false }` 并在处理器里 `preventDefault()`，防止移动端页面跟着滚动。

---

## 3. 目录结构

严格按此结构产出，路径不可改：

```
dunhuang-run/
├── index.html                  # 入口，含 importmap、canvas 容器、HUD 容器、CSS
├── src/
│   ├── main.js                 # 引导：创建渲染器、装配系统、启动主循环
│   ├── core/
│   │   ├── Config.js           # 【所有可调数值集中于此】见第 4.8 节
│   │   ├── GameState.js        # 状态机：LOADING/MENU/PLAYING/PAUSED/DEAD
│   │   ├── Input.js            # 统一输入层：键盘 / 触摸滑动 / 鼠标拖拽 / 重力感应
│   │   └── Loop.js             # 固定步长 + 插值的游戏循环
│   ├── world/
│   │   ├── TrackGraph.js       # 轨道骨架：段序列生成、弧长参数化、evalTrack(s)
│   │   ├── TrackMesh.js        # 依据骨架铺设路面 / 边栏 / 车道线
│   │   ├── ChunkPool.js        # 装饰物对象池（楼阁、灯笼、石窟等）
│   │   ├── ObstacleSpawner.js  # 障碍生成 + 可通行性校验
│   │   └── PickupSpawner.js    # 铜钱 / 道具生成
│   ├── entities/
│   │   ├── Runner.js           # 玩家角色（换道 / 跳 / 滑铲 / 动画）
│   │   ├── Pursuer.js          # 追兵石兽（距离博弈 + 逼近动画）
│   │   └── CameraRig.js        # 摄像机跟随、速度感 FOV、撞墙抖动
│   ├── systems/
│   │   ├── Collision.js        # 参数空间碰撞判定
│   │   ├── PowerUp.js          # 磁铁 / 护盾 / 加速 的计时与效果
│   │   └── Score.js            # 距离、铜钱、总分、localStorage 最高分
│   ├── art/
│   │   ├── Palette.js          # 敦煌色板常量
│   │   ├── Textures.js         # Canvas 程序化纹理（壁画、砖石、沙地、藻井）
│   │   ├── Props.js            # 楼阁/飞檐/灯笼/经幡/石狮 的构建函数
│   │   └── Fx.js               # 粒子（沙尘、碎石、金币闪光）
│   ├── audio/
│   │   └── Sfx.js              # Web Audio 程序化音效
│   └── ui/
│       ├── Hud.js              # 距离 / 铜钱 / 道具计时
│       └── Screens.js          # 开始 / 暂停 / 结算 / 死亡 界面
```

---

## 4. 核心玩法规格

### 4.1 坐标系与基本尺度

- 采用右手系，**玩家恒定朝世界 +Z 方向前进**（靠旋转轨道根节点来制造转弯错觉，见 4.3）。
- 单位：1 世界单位 ≈ 1 米。
- 三条跑道（lane），lane 索引 0 / 1 / 2，横向偏移分别为 `-2.6 / 0 / +2.6`。
- 路面总宽 `9`，单条道宽 `3`，道与道之间留 `0.4` 的视觉缝。

### 4.2 摄像机（CameraRig）

| 参数 | 值 |
|---|---|
| 相对玩家位置 | 后方 `7.0`，上方 `4.6`，横向 `0` |
| 注视点 | 玩家前方 `12.0`，高度 `1.6` |
| 基础 FOV | `62` |
| 极速 FOV | `76`（随速度线性映射，制造速度感） |
| 跟随平滑 | 位置 lerp 系数 `1 - exp(-8 * dt)`（帧率无关） |
| 震屏 | 撞击时 0.25 秒内随机偏移 ±0.18，衰减到 0 |

摄像机**永远不跟随 lane 横向偏移满值**，只跟当前横向偏移的 `35%`，保留玩家在画面中的位移感。

### 4.3 轨道系统（这是全项目最难的部分，务必按此实现）

**骨架表示**：轨道是一连串 `Segment`，每段记录：

```js
{
  type: 'STRAIGHT' | 'TURN_L' | 'TURN_R' | 'SLOPE_UP' | 'SLOPE_DOWN' | 'GAP',
  length: number,      // 沿中心线的弧长
  entryYaw: number,    // 入口朝向角（弧度，绕 Y 轴）
  curvature: number,   // 弯道曲率，直道为 0
  slope: number        // 坡度，正为上升
}
```

**段衔接递推**：

```js
// 每段结束时
nextYaw = yaw + (type === 'TURN_L' ? +Math.PI / 2 : type === 'TURN_R' ? -Math.PI / 2 : 0);
```

**采样与参数化**（关键，所有其他系统都依赖它）：

把整条轨道离散成等弧长采样点数组 `samples[]`，每个点存 `{ position: Vector3, forward: Vector3, right: Vector3 }`：

- 直道 / 坡道：按 `length / 1.0` 的步长线性采样。
- 弯道：按 `length / 0.75` 的步长沿圆弧采样，`right` 由圆弧法线给出，保证路面法线连续。
- 坡道：`position.y` 按 `slope` 累加，`forward` 需要做 Y 轴倾斜归一化。

对外只暴露三个函数：

```js
evalTrack(s)        // 返回 { position, forward, right }，s 为累计弧长
trackLength()       // 已生成的轨道总弧长
ensureAhead(s, N)   // 确保轨道已生成到 s + N 处，不足则继续生成
```

**轨道生成规则**（`TrackGraph.ensureAhead`）：

- 始终保证已生成弧长 ≥ 玩家弧长 + `220`。
- 段类型权重随难度变化：
  - 距离 0~300 m：`STRAIGHT` 85% / `SLOPE_UP` 8% / `SLOPE_DOWN` 7%
  - 距离 300~800 m：`STRAIGHT` 65% / `TURN_L` 10% / `TURN_R` 10% / 坡道 15%
  - 距离 800 m+：`STRAIGHT` 50% / `TURN_L` 15% / `TURN_R` 15% / 坡道 12% / `GAP` 8%
- **硬约束**：两个连续弯道之间必须至少插入 1 个直道段；同一弯道段长度 = 弧长 `22`（对应 90° 转弯，半径约 14）；`GAP` 段宽 = 采样路面的完整宽度，长度 `4`。
- **已消耗的段与采样点必须回收**（当 `s < playerS - 40` 时释放），否则内存无限增长。

**世界移动的实现方式（重要决策）**：

> 采用「**世界静止、玩家与摄像机沿轨道推进**」方案，而不是「玩家静止、世界后移」。
> 因为轨道是弯曲的，滚动世界会导致弯道坐标变换极其混乱。
> 玩家沿 `evalTrack(s)` 推进天然支持任意弯曲轨道，且精度稳定。

装饰物（楼阁 / 石窟 / 灯笼）挂载在采样点上，只有当 `s` 超出回收窗口时才销毁 → 视觉上等效于「世界在向后滚」。

### 4.4 玩家角色（Runner）

**输入动作**：

| 动作 | 键盘 | 触摸 | 鼠标 |
|---|---|---|---|
| 左移一道 | `A` / `←` | 左滑 > 30px | 左拖 > 30px |
| 右移一道 | `D` / `→` | 右滑 > 30px | 右拖 > 30px |
| 跳跃 | `W` / `↑` / `Space` | 上滑 > 30px | 上拖 > 30px |
| 滑铲 | `S` / `↓` | 下滑 > 30px | 下拖 > 30px |
| 暂停 | `Esc` / `P` | 右上角按钮 | 右上角按钮 |

触摸识别：`touchstart` 记录起点，`touchend` 计算主方向（取 |dx| 与 |dy| 较大者），超过阈值判定，**单次触摸只触发一次动作**。

**角色状态**：`RUN | JUMP | SLIDE | STUMBLE | DEAD`

**数值**：

| 参数 | 值 |
|---|---|
| 换道耗时 | `0.14` 秒（用 smoothstep 缓动，不能线性，要有"甩"的感觉） |
| 换道期间的横向插值 | 从当前 x 到目标 lane 的 x，缓动曲线 `t*t*(3-2t)` |
| 跳跃高度 | `2.4` |
| 滞空总时长 | `0.78` 秒（上升 0.34，下降 0.44，下降略长更沉重） |
| 跳跃期间重力 | 由 `h = v0*t - 0.5*g*t²` 反推，禁止直接写死 y 值 |
| 滑铲时长 | `0.72` 秒 |
| 滑铲期间碰撞盒高度 | 从 `1.8` 降到 `0.7` |
| 输入缓冲 | 落地前 `0.12` 秒内的跳跃输入会被缓存并在地面帧执行 |
| Coyote time | 离开地面后 `0.10` 秒内仍可起跳 |

**换道边界**：在最左道继续左滑 → 播放「撞边」小动画（横向过冲 0.3 后回弹），不扣血、不减速。同理最右道。

**角色外观**（程序化构建，参考敦煌壁画中的行者/飞天）：

- 身体：`CapsuleGeometry(0.32, 0.9, 6, 12)`，材质色 `PALETTE.ochreRed`。
- 披帛：两条 `PlaneGeometry(0.18, 1.6)` 从肩部向后飘，用顶点着色器或每帧顶点位移做飘动（`sin(时间*3 + 相位) * 0.25`），这是"飞天感"的关键。
- 头部：`SphereGeometry(0.26)` + 一枚圆盘背光 `CircleGeometry(0.5)`，背光材质用 `MeshBasicMaterial` + 敦煌金，`transparent`，`side: DoubleSide`。
- 跑步动画：腿用两根 `CylinderGeometry(0.09, 0.09, 0.7)` 绕髋关节摆动，相位差 `π`，摆幅随速度从 `0.5` 增到 `1.1`。
- 影子：脚下放一个 `CircleGeometry` + 径向渐变 CanvasTexture，随跳跃高度缩放与淡出。

### 4.5 障碍物规格

**生成原则（铁律）**：任意一个横截面（同一 `s` 区间）上，**必须至少留一条 lane 可通行**。生成器每次生成障碍组时：
1. 随机选 `1~2` 条 lane 放障碍（难度 > 0.6 时才允许占 2 条）。
2. 记录本组占用的 lane 集合。
3. 若占用 3 条 lane 则强制回退，重新生成。
4. 组与组之间的最小弧长间隔 = `max(14, 26 - distance * 0.006)`，即距离越远间隔越密。

**障碍类型表**：

| 类型 | 规避动作 | 程序化外观 | 尺寸（宽×高×深） |
|---|---|---|---|
| 低栏（石阶） | 跳 | 三级 `BoxGeometry` 堆叠的石阶 | `2.2 × 0.8 × 0.7` |
| 悬梁（经幡横梁） | 滑铲 | 横向 `CylinderGeometry` + 悬挂的经幡 `PlaneGeometry`（Canvas 纹理画经文线条） | `2.6 × 0.5 × 0.4`，离地高度 `1.25` |
| 立柱（断柱/石狮） | 换道 | `CylinderGeometry` 柱身 + 顶部 `IcosahedronGeometry` 雕刻感 | `1.4 × 3.2 × 1.4` |
| 火盆 | 跳 | 半透明锥形火舌（`ConeGeometry` + 顶点动画）叠 `SphereGeometry` 底座 | `1.6 × 1.1 × 1.6` |
| 断层（GAP） | 跳 | 路面几何体直接缺失，边缘加碎裂石块 | 横跨全部 3 lane，深 `4.0` |

**判定容差（手感的关键）**：
- 跳跃判定：玩家的 `y` 中心高于障碍顶部 `- 0.15` 即视为通过。
- 滑铲判定：玩家碰撞盒高度 ≤ `0.9` 即视为通过悬梁。
- 换道判定：以玩家当前实际横向偏移 `x` 落在障碍 lane 的 ±`1.35` 区间内为命中。
- 上述所有判定都要**非线性宽容**：命中窗口实际收窄 20%，即"看起来差一点"算通过。跑酷游戏宁可放过，不可误杀。

### 4.6 铜钱与道具

**铜钱（主要计分物）**：

- 外观：`TorusGeometry(0.22, 0.075, 8, 20)`，敦煌金材质，`metalness 0.9 / roughness 0.3`，中间叠一个方形孔洞视觉（用 `BoxGeometry` 挖色，不必真做布尔运算）。
- 生成：沿着轨道在随机 lane 上成串出现，每串 `5~9` 枚，间距弧长 `1.6`；相邻串之间至少隔 `18` 弧长。
- 20% 概率生成「弧形串」，用于引导玩家跳跃或换道 —— 即弧形串的最高点正好位于一个跳跃障碍之上，形成"跳起来顺手吃一串"的爽感。
- 自转：`rotation.z += 3 * dt`；同时上下浮动 `sin(t*2 + phase) * 0.12`。
- 收集半径 `1.2`，收集时播放粒子闪光 + 音效 + HUD 数字跳动。

**道具（稀有，每局预期出现 3~6 个）**：

| 道具 | 外观 | 效果 | 时长 |
|---|---|---|---|
| 磁铁 | `TorusGeometry` 红蓝双色（敦煌石青 + 赭石红） | 半径 `6` 内铜钱自动飞向玩家 | `8` 秒 |
| 护盾 | 半透明球壳罩住角色（`SphereGeometry` + 加法混合） | 免疫一次撞击，撞击后立即破碎 | 一次 |
| 加速 | 金色旋风环绕双脚 | 速度 ×`1.45`，期间无敌，撞碎障碍 | `4.5` 秒 |

**道具效果叠加规则**：护盾与加速可共存；加速期间再次拾取加速 → 时间重置而非叠加。

### 4.7 追兵系统（Pursuer）

这是给玩家**容错空间**的核心机制，不是装饰。

| 参数 | 值 |
|---|---|
| 初始距离（玩家背后） | `18.0` |
| 距离上限 | `22.0` |
| 自然恢复速度 | `+1.6 / 秒`（玩家正常跑时） |
| 撞到障碍 | 距离 `-4.5`，同时玩家速度降至 `40%`，`1.2` 秒内线性恢复到当前档位速度 |
| 撞到障碍时的镜头 | 震屏 + 红屏闪一下（`0.15` 秒） |
| 距离 ≤ `0` | 进入 `DEAD`，播放石兽扑倒动画（`0.9` 秒）后弹结算 |
| 距离 < `6` 时 | 追兵咆哮音效 + 画面边缘暗角加剧 + 心跳声加**快** |

**追兵外观**：一只程序化构建的**青铜石兽**（敦煌镇墓兽风格）。

- 躯干：`IcosahedronGeometry(0.9, 1)` 压扁成 `1.4 : 0.9 : 1.8`，材质 `metalness 0.7 / roughness 0.5`，色 `PALETTE.bronze`。
- 头部：`BoxGeometry(0.7, 0.6, 0.9)` + 两只发光角（`ConeGeometry`，`emissive` 橙红）。
- 眼睛：两个 `SphereGeometry(0.09)` 用 `MeshBasicMaterial` 亮黄，`emissiveIntensity` 随距离缩短而脉动（越近越亮，压迫感来源）。
- 奔跑动画：躯干上下颠簸 `sin(t * 9) * 0.12`，前后腿以 `sin(t * 9)` 反相摆动。
- 追兵**永远位于玩家所在轨道的正后方**，Y 位置贴合路面（用 `evalTrack(playerS - distance)` 定位）。

### 4.8 难度与数值（全部写入 `Config.js`）

```js
export const CONFIG = {
  laneOffsets: [-2.6, 0, 2.6],
  track: {
    roadWidth: 9,
    segmentLength: 30,
    turnArcLength: 22,
    gapLength: 4,
    keepAhead: 220,
    recycleBehind: 40,
  },
  runner: {
    baseSpeed: 12.5,          // 起始速度 (单位/秒)
    maxSpeed: 30.0,           // 速度上限
    accelPerMeter: 0.0045,    // 每跑 1 米增加的速度
    laneChangeTime: 0.14,
    jumpHeight: 2.4,
    jumpAirTime: 0.78,
    slideTime: 0.72,
    inputBuffer: 0.12,
    coyoteTime: 0.10,
    hitSpeedPenalty: 0.40,    // 撞击后速度乘数
    hitRecoverTime: 1.2,
  },
  pursuer: {
    startDistance: 18.0,
    maxDistance: 22.0,
    recoverRate: 1.6,
    hitPushBack: 4.5,
    killDistance: 0.0,
  },
  spawn: {
    coinGroupGapMin: 18,
    coinPerGroup: [5, 9],
    coinSpacing: 1.6,
    obstacleGapBase: 26,
    obstacleGapMin: 14,
    obstacleGapShrinkPerMeter: 0.006,
    powerUpGapMin: 120,
    powerUpGapMax: 260,
  },
  camera: {
    offsetBack: 7.0,
    offsetUp: 4.6,
    lookAhead: 12.0,
    lookHeight: 1.6,
    fovBase: 62,
    fovMax: 76,
    lateralFollow: 0.35,
  },
  score: {
    coinValue: 10,
    distanceValue: 1,         // 每米 1 分
  },
};
```

**速度曲线**：`speed = min(maxSpeed, baseSpeed + distance * accelPerMeter)`。
按此公式，跑完 1000 米时速度约 `17`，3000 米时约 `26`，4000 米后触顶。
**难度系数** `difficulty = (speed - baseSpeed) / (maxSpeed - baseSpeed)`，范围 `0~1`，供生成器查表使用。

### 4.9 状态机（GameState）

```
LOADING → MENU → PLAYING ⇄ PAUSED
                    ↓
                  DEAD → (重新开始) → PLAYING
```

| 状态 | 行为 |
|---|---|
| `MENU` | 摄像机缓慢环绕展示场景（`yaw += 0.08 * dt`），角色原地跑。显示标题、「开始」按钮、「最高分」 |
| `PLAYING` | 主循环推进。`Esc` 切 `PAUSED` |
| `PAUSED` | 全部计时冻结，仅渲染。显示「继续 / 重新开始」 |
| `DEAD` | 冻结输入，播放石兽扑倒动画 + 慢镜头（`timeScale` 从 1 降到 0.25），0.9 秒后弹结算面板 |
| 切回 `PLAYING` | 完整重置：轨道清空重建、对象池归还、追兵距离复位、道具清空 |

**页面失焦**（`visibilitychange`）自动切 `PAUSED`。

### 4.10 UI（Hud.js / Screens.js）

**HUD 布局**（纯 DOM，`position: fixed`，不用 Canvas 画）：

- 左上：`距离 1234 m`，字号随距离增长有 0.1 秒的放大回弹。
- 右上：铜钱图标 + 数量（图标用内联 SVG 画一个方孔圆钱，不要用图片）。
- 顶部居中：`最高分 5678`。
- 左下：当前生效的道具图标 + 倒计时圆环（`conic-gradient` 实现）。
- 追兵距离 < 6 时：屏幕四周出现呼吸式暗角（`radial-gradient` + `opacity` 动画）。

**字体**：使用系统字体栈 `"Songti SC", "STSong", "Noto Serif SC", serif`（衬线体贴合古风，且无需加载外部字体）。

**结算面板**：本次距离、本次铜钱、本次总分、历史最高分（新纪录时加金色高亮与轻微抖动）、「再来一次」按钮。

**开始面板**：游戏名、一句话玩法说明、操作图示（用 CSS 画的四向箭头，不用图片）、「开始」按钮。

---

## 5. 美术规格

### 5.1 色板（`Palette.js`，严格使用，不得自创颜色）

```js
export const PALETTE = {
  // 敦煌壁画主色
  ochreRed:   0xA63B29,  // 赭石红 —— 洞窟壁面、角色衣袍
  cinnabar:   0xC8402F,  // 朱砂 —— 飞檐、柱子
  stoneBlue:  0x2E5C8A,  // 石青 —— 天空、披帛、磁铁
  stoneGreen: 0x3E7C59,  // 石绿 —— 藤蔓、青苔
  earthYellow:0xD9A441,  // 土黄 —— 沙地高光
  dunhuangGold:0xE8B23A, // 敦煌金 —— 铜钱、背光、强调色
  bronze:     0x6B5A3E,  // 青铜 —— 石兽、香炉
  sand:       0xE3C68B,  // 沙色 —— 地面主色
  plaster:    0xF0E2C8,  // 壁画米 —— 石壁、石阶
  ink:        0x2B1F1A,  // 墨 —— 阴影、UI 文字
  nightTeal:  0x1A2A33,  // 暗夜青 —— 远景雾气
};
```

**配色纪律**：画面中同一时刻，饱和色（赭石红/朱砂/敦煌金）只用于**焦点元素**（角色、铜钱、追兵眼睛、道具）；环境大面积使用低饱和的 `sand` / `plaster` / `bronze`。这样才能让焦点"跳"出来。

### 5.2 场景元素（全部程序化）

**路面**：由 `TrackMesh.js` 沿采样点生成三角形条带（Triangle Strip），材质用 `plaster` 底 + Canvas 程序化砖石纹理（见 5.3），`roughness 0.85`。车道分隔线用小 `BoxGeometry` 沿采样点铺设，颜色 `bronze` 偏暗，每隔 `4` 弧长放一段 `0.15 × 0.02 × 2.0` 的短条，形成虚线。

**两侧栏杆**：沿路面边缘每隔 `6` 弧长放一对短柱 `CylinderGeometry(0.12, 0.14, 0.9)`，颜色 `bronze`，柱间用 `BoxGeometry` 连成横栏。

**远景建筑**（对象池管理，两侧交替）：

- **飞檐楼阁**：三层递缩的 `BoxGeometry`（底层 `8×6×8` → 中层 `6.5×5×6.5` → 顶层 `5×4×5`），每层顶盖用 `ConeGeometry(4.5, 1.2, 4)` 四棱锥（`rotation.y = Math.PI/4`）做出飞檐轮廓，檐角可加 4 根向外上翘的小 `CylinderGeometry`。主体色 `cinnabar` 配 `ochreRed`，屋顶色 `stoneBlue`。
- **石窟窟龛**：一个半嵌入地面的 `BoxGeometry(6, 10, 8)` 石壁，正面用 `BoxGeometry` 挖出一排"洞"，洞内放 `PointLight`（暖黄，`intensity 0.6`，`distance 12`），制造洞窟透光的层次感。**注意：每帧活动的 PointLight 不超过 6 个**，超出的关掉或改成 `MeshBasicMaterial` 自发光面片。
- **灯笼**：`SphereGeometry(0.3)` 压成椭球（`scale.y = 1.25`），材质 `MeshBasicMaterial` + `cinnabar`（自发光感），下挂一条 `CylinderGeometry(0.02, 0.02, 0.4)` 流苏。挂在楼阁檐下与栏杆柱头，**严格限量**：同屏不超过 24 个。
- **经幡**：`PlaneGeometry(0.5, 1.8)` 竖直面片，`doubleSide`，Canvas 纹理画横排经文线条（`stoneBlue` / `cinnabar` / `earthYellow` 三色循环），每帧用顶点位移做飘动。
- **远景沙丘**：`PlaneGeometry` 组成的低多边形山脉，`sand` 色，`fog` 影响，不需要交互。

**天空**：用 `SphereGeometry(500)` 反面渲染（`side: THREE.BackSide`）+ 竖向渐变 CanvasTexture：顶部 `stoneBlue` → 中部 `earthYellow` → 地平线 `sand`。这是敦煌壁画的经典"三段式"天空。

**雾**：`THREE.Fog(nightTeal, 60, 320)`，用于藏住轨道生成边界，这比任何"淡出"处理都有效。

### 5.3 程序化纹理（`Textures.js`）

全部用 `document.createElement('canvas')` 绘制后 `new THREE.CanvasTexture(canvas)`，并设置：

```js
tex.colorSpace = THREE.SRGBColorSpace;
tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
```

需要实现 4 种：

1. **砖石纹理**（`makeStoneTexture(size=256)`）：底色 `plaster`，随机撒 400 个噪点（`±8` 明度扰动），再画若干条随机方向的细裂纹（`ink` 色，`alpha 0.15`，线宽 1）。
2. **沙地纹理**（`makeSandTexture()`）：底色 `sand`，叠加 3000 个 1px 点，明暗各半，制造颗粒感。
3. **壁画纹理**（`makeMuralTexture()`）：底色 `ochreRed`，绘制几何化的忍冬纹 —— 用 `arc()` 画连续的螺旋波曲线，颜色 `stoneGreen` / `stoneBlue` / `dunhuangGold` 交替，再用 `globalAlpha = 0.25` 叠一层"剥落斑块"（随机椭圆，`plaster` 色）。
4. **藻井纹理**（`makeCaissonTexture()`）：正方形画布，以中心为原点画同心方形 + 放射状莲瓣（用 `lineTo` 画 8 或 12 瓣循环），颜色 `cinnabar` / `dunhuangGold` / `stoneBlue`。用于装饰楼阁的天花与地面标记。

**性能**：所有 CanvasTexture 必须**创建一次并缓存复用**（用模块级 `Map` 缓存，按名称取），绝不能每个 mesh 生成一张。纹理尺寸统一 `256×256`，`generateMipmaps: true`。

### 5.4 光照与后处理

- **环境光**：`HemisphereLight(skyColor: stoneBlue, groundColor: sand, intensity: 0.9)`。
- **主光**：`DirectionalLight(dunhuangGold, 1.4)`，位置 `(30, 60, -20)`，启用阴影（`mapSize 1024`），阴影相机跟随玩家所在位置移动（每帧更新 `light.target.position`，并相应平移 `light.position`），保证阴影永远覆盖玩家附近。
- **补光**：`DirectionalLight(stoneBlue, 0.4)` 从反方向打，压出立体感。
- **不用后处理**（不用 EffectComposer / bloom），保证移动端性能。需要"发光"效果时，用 `MeshBasicMaterial` + 加法混合的贴片伪造（灯笼、追兵眼睛、铜钱均是此方案）。

### 5.5 动效清单（"有瘾"的来源）

1. 铜钱收集：粒子爆散（8 个小型金色 `PlaneGeometry`，随机速度飞散，0.4 秒内缩放到 0 并回收）。
2. 撞击：屏幕震动 + 红色暗角闪 + 玩家角色短暂"踉跄"（`rotation.x` 前倾 0.3 再回弹）。
3. 加速道具：FOV 快速拉到 76、地面出现放射状速度线（若干条拉长的 `PlaneGeometry` 贴地飞过）、镜头轻微后拉。
4. 磁铁：铜钱以 `0.3` 秒的加速曲线飞向玩家，飞行中自转加速。
5. 跳跃落地：路面扬起一小圈沙尘（`RingGeometry` 扩张并淡出，0.35 秒）。
6. 弯道：摄像机在进入弯道前 0.4 秒开始预转向（`lookAt` 目标点向弯道内侧偏移），让转弯可预期。

---

## 6. 音频（`Sfx.js`）

用 Web Audio API 合成，首次用户交互后 `resume()` AudioContext（浏览器自动播放策略）。

| 事件 | 合成方式 |
|---|---|
| 拾取铜钱 | 三角波 `880Hz → 1320Hz`，时长 `0.08` 秒，快速衰减 |
| 跳跃 | 正弦波 `300Hz → 600Hz`，时长 `0.15` 秒 |
| 滑铲 | 白噪声 + 低通滤波 `800Hz`，时长 `0.25` 秒 |
| 撞击 | 低频方波 `120Hz` + 白噪声爆音，时长 `0.3` 秒 |
| 石兽咆哮 | 低频锯齿波 `80Hz` 加颤音（LFO 调制频率），时长 `0.8` 秒，音量随距离缩短而增大 |
| 背景音 | 简单的五声音阶循环（用 `OscillatorNode` 按固定节奏播放 `D-E-G-A-C` 音高），营造古风底色；音量压到 `0.08` |

必须提供**静音开关**（HUD 右上角），并在 `localStorage` 记录偏好。

---

## 7. 性能要求

| 指标 | 目标 |
|---|---|
| 帧率 | 桌面 1080p 稳定 60 FPS；移动端 ≥ 30 FPS |
| Draw Call | 同屏 ≤ 120 |
| 三角面数 | 同屏 ≤ 120k |
| 对象池 | 障碍 / 装饰物 / 粒子 / 铜钱全部走对象池，运行 10 分钟 `heap` 不持续增长 |
| 标记为静态的物体 | 设置 `matrixAutoUpdate = false`，手动 `updateMatrix()` 一次 |
| 材质共享 | 同色同类物体共享同一个 `Material` 实例 |
| 自适应降级 | 若平均帧率 < 45 持续 3 秒，自动降低阴影质量（`mapSize` 512 → 关闭阴影）、减少装饰物密度 |

---

## 8. 代码质量要求

- 每个文件顶部写一句注释说明职责。
- 关键算法（`evalTrack`、碰撞判定、生成器权重）必须有注释解释**为什么这么做**，而不只是"做了什么"。
- 所有魔法数字必须来自 `Config.js` 或 `Palette.js`，代码里不得出现裸数字（`0`, `1`, `2`, `Math.PI` 等数学常量除外）。
- 主循环用**固定步长累加器**（`fixedDt = 1/60`）+ 渲染插值，保证不同刷新率下手感一致：

```js
let acc = 0;
const FIXED = 1 / 60;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  acc += dt;
  while (acc >= FIXED) {
    update(FIXED);      // 所有物理与逻辑都在这里
    acc -= FIXED;
  }
  render(acc / FIXED);  // 插值渲染
}
```

- 提供全局错误捕获，出错时在页面上显示可读的错误信息，而不是白屏。

---

## 9. 验收清单（AI 必须逐条自测并报告结果）

1. [ ] 用本地静态服务器打开 `index.html` 后**无任何控制台报错 / 警告**。
2. [ ] 开始界面能正常显示，点击「开始」进入游戏。
3. [ ] 玩家自动向前跑，摄像机稳定跟随，**不出现抖动或穿模**。
4. [ ] `A`/`D`（或左滑/右滑）换道正常，并受左右边界限制。
5. [ ] 跳跃与滑铲动画正确，**长按不叠加**，空中不能二段跳。
6. [ ] 五种障碍（低栏 / 悬梁 / 立柱 / 火盆 / 断层）都实际出现过，且**对应的规避动作能成功通过**。
7. [ ] 任意横截面**至少留一条可通行 lane**（连续跑 5 分钟不出现必死组合）。
8. [ ] 铜钱可被收集，HUD 数字正确增长，有音效与粒子反馈。
9. [ ] 三种道具（磁铁 / 护盾 / 加速）都能拾取并正确生效、正确倒计时结束。
10. [ ] 撞障碍 3~5 次内被石兽追上并进入结算；期间追兵距离变化符合 4.7 节数值。
11. [ ] 结算面板数值正确，最高分写入 `localStorage` 并在下次启动时显示。
12. [ ] 死亡后「再来一次」**完全重置**，不残留上一局的障碍物、道具状态、追兵位置。
13. [ ] 切换浏览器标签页再回来，游戏自动进入暂停而非"跳帧瞬移"。
14. [ ] 移动端（或 Chrome DevTools 设备模拟）触摸滑动四向操作均可用，页面不跟着滚动。
15. [ ] 连续运行 5 分钟，帧率不衰减，内存不持续增长。
16. [ ] 难度随距离确实提升：1000 米 / 2500 米时的障碍密度与速度肉眼可辨差异。

---

## 10. 禁止事项

1. ❌ 禁止引用任何外部图片、模型、音频、字体文件。
2. ❌ 禁止使用 npm 依赖（Three.js 走 CDN importmap 是唯一例外）。
3. ❌ 禁止输出 TODO / 占位符 / "此处省略" 的代码。
4. ❌ 禁止使用已废弃的 Three.js API（`Geometry`、`outputEncoding`、`sRGBEncoding` 等）。
5. ❌ 禁止在渲染循环中 `new` 对象（Vector3 / Material / Geometry 一律预分配）。
6. ❌ 禁止让装饰物或障碍无限累积 —— 必须回收。
7. ❌ 禁止违反 4.5 节的「必留一条通路」铁律。
8. ❌ 禁止用随机值直接决定碰撞判定结果（判定必须可复现、可预测）。
9. ❌ 禁止为了"效果"引入后处理管线（EffectComposer）。
10. ❌ 禁止把 `Config.js` 的数值硬编码到各处。

---

## 11. 分阶段实施顺序（建议 AI 按此顺序推进，每阶段结束可运行）

| 阶段 | 内容 | 阶段验收 |
|---|---|---|
| **P1 骨架** | `index.html` + `main.js` + `Loop.js` + 渲染器 / 场景 / 相机 / 光照 / 雾 | 页面上出现一条直道和一个方块角色 |
| **P2 推进** | `TrackGraph` 的直道生成 + `evalTrack` + `Runner` 沿轨道跑 + `CameraRig` 跟随 | 角色沿直道无限向前跑，摄像机稳定 |
| **P3 操作** | `Input.js` + 换道 / 跳跃 / 滑铲 + 边界回弹 | 四向操作手感成立 |
| **P4 弯道** | 弯道与坡道段生成 + 路面条带网格 + 采样点回收 | 能连续完成一个 90° 左弯再一个右弯，无接缝 |
| **P5 玩法** | `ObstacleSpawner` + `Collision` + `PickupSpawner` + 铜钱 + 计分 | 能撞、能躲、能吃钱、能死 |
| **P6 追兵** | `Pursuer` + 距离博弈 + 死亡判定 | 撞够次数被追上，结算正确 |
| **P7 美术** | `Palette` / `Textures` / `Props` + 楼阁、灯笼、经幡、石窟、天空、沙丘 | 画面呈现完整敦煌氛围 |
| **P8 打磨** | `Fx` 粒子、`Sfx` 音效、`Hud` / `Screens`、震屏、FOV 速度感、难度调参 | 达到第 9 节全部验收项 |

---

## 12. 最后的话

这份规格的目标是**一次交付、开箱即玩**。

优先级排序（如果必须取舍）：
1. **能跑起来、不报错** —— 最重要
2. **操作手感**（换道/跳跃的容差与缓动）—— 决定游戏是否"好玩"
3. **必须留一条通路** —— 决定游戏是否"讲理"
4. **敦煌氛围的视觉与音效** —— 决定游戏是否"有料"
5. **进度与奖励反馈**（铜钱、最高分、道具）—— 决定游戏是否"有瘾"

先把 1~3 做扎实，再往上堆 4~5。不要为了好看牺牲流程。
