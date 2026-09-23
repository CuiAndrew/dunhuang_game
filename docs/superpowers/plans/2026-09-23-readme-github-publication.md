# README 整理与 GitHub 发布计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为仓库根目录补齐准确、可操作的中文 README，验证其中的启动说明和本地链接，并在确认完整 GitHub 仓库地址与写入授权后发布。

**Architecture:** README 只描述当前仓库根目录的原生 ES Modules 游戏，不把 `dunhuang_runner_vite_v10/` 参考项目的 Vite 能力误写为根项目功能。通过 Node 内置测试校验 README 中的真实启动命令、控制方式、运行要求和本地 Markdown 链接；最终由 Git commit 记录文档与测试。

**Tech Stack:** 原生 JavaScript ES Modules、Three.js 0.169 CDN import map、Node.js `node:test`、Python 标准库静态 HTTP 服务器。

**Spec:** `docs/敦煌逃亡_可行性研究与技术计划.md`；现有实现边界以 `package.json`、`index.html`、`src/` 和 `tests/` 为准。

## Global Constraints

- 用户要求每次改动完成后创建对应 Git commit，便于追踪与回滚。
- 用户要求每次改动后编写或更新相关测试，并在交付前确保所有测试和验证通过。
- 只整理仓库根目录 README；不改动或暂存工作区中已有的未跟踪副本及参考素材。
- 不推送到未经确认的仓库；发布前需要精确的 `owner/repo` 和可用的 GitHub 写入授权。

## Review Focus

- 启动命令必须对应根目录真实脚本；测试将断言 `npm test` 和 Python 静态服务器命令。
- 根项目不是 Vite 应用；README 必须将根项目与嵌套参考目录区分，测试会拒绝把 `npm run dev` 或 `npm run build` 当作根项目命令。
- 非 ASCII 路径与 Markdown 相对链接必须可解析；测试会逐条确认 README 本地链接目标存在。
- 键盘与触控指引必须对应真实输入行为；测试会检查方向键、跳跃、下滑、暂停和滑动触控说明。
- Three.js CDN、WebGL 及浏览器音频交互属于运行要求；README 与测试需说明加载/音频权限边界，不承诺离线或无 WebGL 运行。

---

### Task 1: 编写并验证根目录 README

**Files:**
- Create: `tests/readme.test.mjs`
- Create: `README.md`

**Interfaces:**
- Consumes: 根目录 `package.json` 中现有的 `test` 脚本，以及当前 `index.html`、`src/` 和 `docs/`。
- Produces: 面向开发者的中文项目说明、可复制的安装/测试/本地运行命令、真实操作说明、架构与设计文档链接；README 契约测试由 `node --test tests/*.test.mjs` 执行。

- [x] **Step 1: 编写 README 契约测试**

在 `tests/readme.test.mjs` 写入以下测试：

```js
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
  ];

  for (const text of requiredContent) {
    assert.ok(readme.includes(text), `README must include ${text}`);
  }

  assert.doesNotMatch(readme, /npm run (?:dev|build)/);
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
```

- [x] **Step 2: 运行契约测试，确认在 README 创建前失败**

Run: `rtk node --test tests/readme.test.mjs`
Expected: FAIL，提示仓库根目录缺少 `README.md`。

- [x] **Step 3: 编写准确的中文 README**

写明项目定位与当前原型范围、功能概览、Node 测试依赖安装、Python 静态服务器启动、浏览器 WebGL/CDN/音频要求、桌面与触控操作、核心模块说明、敦煌主题扩展边界、已知限制和相关文档链接。所有描述以仓库根目录现有实现为准。

- [x] **Step 4: 运行 README 契约测试与全量测试**

Run: `rtk node --test tests/readme.test.mjs`
Expected: PASS，所有 README 启动说明、控制说明、运行要求及本地链接断言通过。

Run: `rtk npm test`
Expected: PASS，所有项目测试通过。

- [x] **Step 5: 检查差异并提交**

Run: `rtk git diff --check`
Expected: 成功且无空白错误。

Stage only `README.md`, `tests/readme.test.mjs`, and this plan file for this deliverable; keep existing unrelated untracked files out of the commit. After the tests pass, run `rtk git add README.md tests/readme.test.mjs docs/superpowers/plans/2026-09-23-readme-github-publication.md`, then run `rtk git commit -m "docs: add project README"`.

### GitHub 发布门槛

用户已要求暂不推送到 GitHub，因此本次只创建本地 Git commit，不配置 remote、不触发 push。若之后恢复发布，需要用户明确指示，并在发布前确认准确的 `owner/dunhuang_game` 与 GitHub 写入授权；当前提交不会离开本机。
