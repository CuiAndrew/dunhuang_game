# 敦煌逃亡主题化美术系统设计规格

**状态：** 待实现

**目标：** 在不改动核心跑酷玩法的前提下，把当前程序化原型升级为一版完整的敦煌风格场景、人物与道具，并建立可在第二版快速切换为上海外滩风格的主题适配边界。

## 1. 已确认的产品意图

- 第一版视觉主题是敦煌：矿物颜料、砂岩、壁画、洞窟、经幡、石兽和方孔铜钱。
- 场景、Runner、追兵、障碍物、拾取物和环境装饰都需要有主题辨识度，而不是只换一组颜色。
- 当前游戏逻辑、三车道控制、碰撞规则、对象池、固定步长和性能降级策略保持不变。
- 第二版切换上海外滩时，应新增/替换主题模块即可；不重写 `Runner`、`TrackGraph`、`CollisionSystem`、`Score` 或对象池协议。
- 继续使用程序化 Three.js 几何体和 CanvasTexture，不引入外部 GLTF、图片、字体或音频资源作为本计划的前置条件。

## 2. 方案与边界

### 2.1 选定方案

采用“主题适配器 + 可复用程序化原语”：游戏运行时只消费主题契约；敦煌主题负责把契约映射到一组共享材质、CanvasTexture、几何体组合和场景令牌。

主题不拥有游戏状态，也不决定碰撞尺寸、车道索引、速度、生成概率或得分。主题只负责视觉对象和视觉令牌，避免为了换皮肤而复制玩法逻辑。

### 2.2 明确不做

- 本版本不提供运行时主题选择器；主题通过注册表默认 ID 选择，第二版只需改一个配置入口或增加发布构建配置。
- 本版本不实现上海外滩成品主题；只保证主题接口、注册表和测试替身足以承载该主题。
- 本版本不引入后处理管线、粒子大规模 GPU 模拟或网络资源加载。
- 不为了美术重构 `TrackGraph` 的路径生成、`CollisionSystem` 的判定和任何输入语义。

## 3. 主题契约

新增 `src/art/ThemeDefinition.js`，以 JSDoc 和运行时断言定义以下对象形状：

```js
{
  id: 'dunhuang',
  palette: PALETTE,
  scene: {
    backgroundColor: 0x1A2A33,
    fogColor: 0x1A2A33,
    skyTextureName: 'sky',
  },
  createTextures({ THREE, document }): {
    stone, sand, mural, caisson, sky
  },
  createRunnerVisual({ THREE, config }): {
    root: THREE.Group,
    leftLeg: THREE.Object3D,
    rightLeg: THREE.Object3D,
  },
  createPursuerVisual({ THREE }): THREE.Object3D,
  createObstacleVisual({ THREE, config }): THREE.Object3D,
  createPickupVisual({ THREE, type }): THREE.Object3D,
  createEnvironmentVisual({ THREE }): THREE.Object3D,
}
```

契约约束：

- 所有工厂必须返回可复用的 Three.js 对象；创建阶段允许预热，游戏循环内禁止按帧创建材质或纹理。
- `createRunnerVisual` 返回的 `leftLeg` 与 `rightLeg` 必须是 `root` 的后代，供 `Runner` 的既有跑步动画驱动。
- 障碍物必须保留现有 `setType(type)` 协议和 `userData.heightOffset` 语义；拾取物必须保留 `setType(type)` 与 `userData.kind` 语义。
- 主题工厂可以共享材质，但不得修改传入的全局 `PALETTE` 对象。
- `assertThemeDefinition(theme)` 发现缺失字段时立即抛出带主题 ID/字段名的错误；未知主题 ID 回退到默认敦煌主题，并由 `listThemeIds()` 提供可诊断的注册表结果，不让游戏启动失败。

## 4. 模块边界与数据流

### 4.1 新增模块

#### `src/art/ThemeDefinition.js`

职责：主题契约、所需字段列表、`assertThemeDefinition(theme)`。不创建 Three.js 对象，不持有注册表状态。

#### `src/art/ThemeRegistry.js`

职责：注册和获取主题。

公开接口：

```js
export const DEFAULT_THEME_ID = 'dunhuang';
export function getTheme(id = DEFAULT_THEME_ID) { /* returns validated theme */ }
export function listThemeIds() { /* returns stable sorted IDs */ }
```

第一版注册 `dunhuang`。未来上海外滩主题只需实现同一契约并加入注册表，不修改 `main.js` 的装配协议。

#### `src/art/themes/DunhuangTheme.js`

职责：敦煌主题的唯一装配入口。它闭包持有现有 `PALETTE`，把纹理、人物、追兵、障碍、拾取物和环境工厂组合成主题对象。

### 4.2 现有模块调整

#### `src/art/Props.js`

保留现有障碍物、追兵、拾取物和环境的导出函数，新增 `createRunnerVisual(THREE, palette, config)`。几何体和材质仍在这里实现，主题模块只负责选择/绑定它们。

敦煌第一版的具体视觉要求：

- Runner：赭红长袍、石膏色头部、金色光环/飘带、青蓝腰饰，腿部仍提供独立节点。
- 追兵：砂岩镇墓兽轮廓、金色角饰、朱砂眼睛和可见的面部层次。
- 障碍：低栏、横梁、砂岩立柱、青铜火盆、断层裂口必须有区分明显的轮廓和材质色阶。
- 拾取物：方孔铜钱；青蓝藻井/莲花护盾；朱砂飞天飘带加速符印。
- 环境：沙丘、洞窟/寺门、石灯、经幡和壁画色带五类对象继续使用固定对象池。

#### `src/art/Textures.js`

保留 `createTextureSet(THREE, document, palette, themeId = 'dunhuang')` 的纯函数边界，但补充主题安全的缓存键：同名纹理必须按主题 ID 隔离，避免未来上海主题复用敦煌纹理缓存。

#### `src/entities/Runner.js`

构造函数新增可选 `createVisual` 参数。传入时调用主题工厂并绑定 `root/leftLeg/rightLeg`；不传入时保留当前默认构建路径，避免测试替身和旧调用方被一次性破坏。运动、碰撞高度、换道和状态机代码不迁移到美术层。

#### `src/main.js`

从 `ThemeRegistry` 获取默认主题，并把主题工厂传给 `Textures`、`Runner`、`Pursuer`、`ObstacleSpawner`、`PickupSpawner` 和 `EnvironmentSystem`。背景色、雾色和 `TrackMesh` 的材质均从当前主题读取，不再直接散落引用敦煌专用色值。

#### `DESIGN.md`

新增“主题运行时契约”章节，明确 `PALETTE` 仍是敦煌主题令牌、主题工厂是场景/角色/道具的所有权边界，并记录上海外滩主题可以替换的字段。

## 5. 第一版敦煌视觉构成

### 场景层

- 天空：石青/夜青到砂金的渐变 CanvasTexture，增加低对比太阳/月轮和壁画颗粒，不压过 HUD。
- 地面：砂岩/夯土路面使用共享材质与重复纹理；断层显示暗色裂口、砂金边缘和少量暖色尘雾。
- 远景：固定池中的沙丘、洞窟、寺门和壁画色带用比例差异制造景深；不增加无限数量的独立材质。
- 近景：经幡、石灯和旗杆提供节奏性剪影，主题色只在金、朱砂、石青处形成视觉锚点。

### 角色层

- Runner 的轮廓在窄视口和低清晰度下仍能区分头部、身体、双腿和金色主题标识。
- 追兵从背后可识别为石兽，而不是普通多面体；眼睛颜色是危险反馈的一部分，但不改变追兵逻辑。

### 道具与障碍层

- 道具与障碍通过形状、明度和主题色区分，不能只依赖颜色。
- `BEAM`/`PILLAR`/`FIRE`/`GAP`/默认低栏继续使用现有类型字符串，避免碰撞和生成协议改变。
- 金币和能力道具继续使用可见的 emissive 小幅发光，但必须共享材质并受对象池数量限制。

## 6. 扩展上海外滩的约束

第二版新增 `src/art/themes/ShanghaiBundTheme.js` 时，必须只实现/组合主题契约：

- palette：夜蓝、雾灰、暖金、砖红等令牌；
- textures：石库门/滨江路面、雾面天空、霓虹反射的低成本 CanvasTexture；
- runner/pursuer/obstacle/pickup/environment 工厂：同样返回契约对象并保留 `setType`、`heightOffset`、腿节点等语义；
- 不修改 `Runner` 状态机、`TrackGraph`、碰撞判定、生成概率和 HUD 数据协议。

主题切换的验收标准是：替换 `getTheme` 的主题 ID 后，应用仍能进入 `MENU → PLAYING → PAUSED → DEAD`，且对象池计数和碰撞测试保持原有结果。

## 7. 性能与错误处理

- 所有主题材质、几何体和纹理在初始化/预热阶段创建；运行过程中只改变位置、可见性、颜色或用户数据。
- `TextureCache` 使用 `themeId:name` 作为键；重复加载同一主题不得重复创建 CanvasTexture。
- 主题工厂错误通过现有 `window.error` / `unhandledrejection` 面板暴露；未知主题 ID回退默认主题，不显示空白场景。
- 主题视觉不改变 `PerformanceBudget` 的降级顺序；低帧率时仍先降低像素比、再关闭阴影、再降低环境装饰密度。
- 减少透明大平面和高分段几何体；新增几何体必须使用配置中的固定分段上限。

## 8. 测试与验收

### 自动化测试

新增/更新以下测试：

- `tests/theme.test.mjs`：默认主题可获取、未知 ID 回退、主题契约字段完整、注册 ID 稳定。
- `tests/art-audio.test.mjs`：Runner 工厂返回 root/双腿；五类障碍、三类拾取物和五类环境对象均能设置类型且保持语义字段。
- `tests/entities.test.mjs`：Runner 使用主题视觉工厂后仍能跑步摆腿、重置和换道，不改变状态机结果。
- `tests/core.test.mjs` / `tests/presentation.test.mjs`：入口的主题装配和版本化模块导入保持可验证。
- 现有 `tests/long-run.test.mjs`：确定性长跑继续保持对象池上限和无异常增长。

### 浏览器验收

使用本地静态服务器验证：

1. 菜单画面显示敦煌天空与主题色；
2. 开始后可看到 Runner、石兽、道路、环境装饰、障碍和道具；
3. 暂停/重开/死亡流程不丢失主题对象；
4. 窄视口下 Runner 和 HUD 仍可识别；
5. 控制台无模块、纹理、WebGL 或主题工厂错误；
6. 主题工厂的对象数量受池容量限制。

### 交付门槛

- `npm test` 全部通过；
- `git diff --check` 通过；
- 浏览器烟测通过且日志为空；
- 主题设计、实现、测试和验收记录分别有可追踪 Git commit；
- 未引入外部二进制美术依赖。
