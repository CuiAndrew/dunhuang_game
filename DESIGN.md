---
version: alpha
name: "Dunhuang Run"
description: "A responsive browser runner whose UI feels like a fragment of a Dunhuang mural: mineral pigment, worn plaster, and a single gold coin seal."
colors:
  muralBlue: "#244B7A"
  turquoise: "#3D9B9B"
  vermilion: "#D84B35"
  apricot: "#F3C77B"
  muralGold: "#E8B23A"
  paper: "#F6E7C8"
  caveNight: "#172536"
  ochreRed: "#A63B29"
  cinnabar: "#C8402F"
  stoneBlue: "#2E5C8A"
  stoneGreen: "#3E7C59"
  earthYellow: "#D9A441"
  dunhuangGold: "#E8B23A"
  bronze: "#6B5A3E"
  sand: "#E3C68B"
  plaster: "#F0E2C8"
  ink: "#2B1F1A"
  nightTeal: "#1A2A33"
typography:
  display:
    fontFamily: '"Songti SC", "STSong", "Noto Serif SC", serif'
    fontSize: "clamp(2.25rem, 8vw, 5.5rem)"
    lineHeight: "1"
  body:
    fontFamily: '"Songti SC", "STSong", "Noto Serif SC", serif'
    fontSize: "1rem"
    lineHeight: "1.5"
  utility:
    fontFamily: 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace'
    fontSize: "0.75rem"
    lineHeight: "1.25"
rounded:
  control: "0.25rem"
  panel: "0.75rem"
  badge: "999px"
spacing:
  hud-gap: "0.75rem"
  panel-padding: "clamp(1.25rem, 4vw, 2.5rem)"
  safe-edge: "max(1rem, env(safe-area-inset-left))"
components:
  hud:
    surface: "mural-blue badges with gold edge and semantic pigment icons"
  button:
    surface: "vermilion seal with mural-gold focus ring"
  overlay:
    surface: "paper-panel with cloud motif, flying ribbon, and ink-to-caveNight vignette"
---

# Dunhuang Run Design System

## Overview

### Creative North Star

The interface should feel like a moving section of a weathered Mogao Cave mural: large Song-style Chinese type sits on plaster, while a square-hole 铜钱印章 acts as the single vivid interactive seal. The 3D world owns spectacle; the UI only frames the chase.

### Product context and register

- **Audience and primary job:** Desktop and mobile-browser players start, pause, understand, and replay a three-lane endless run without losing sight of the 3D action.
- **Target market(s) and evidence:** Chinese-language cultural-action game specified in `敦煌逃亡_AI开发提示词.md`; the build has no region-specific business, payment, or personal-data flow.
- **Locale(s) and language policy:** Simplified Chinese is the shipped interface language. Controls use concise verbs and the system serif fallback stack must render CJK text without downloading a font.
- **Usage scene:** Short, replayable sessions on a phone held in landscape or a desktop browser. HUD information is sparse and must stay legible over a moving, high-contrast scene.
- **Register:** Hybrid. Menus are expressive, mural-like brand surfaces; the in-run HUD is utilitarian and quiet.
- **Memorable signature:** The start/replay control is a copper-coin seal, echoed by the square-hole coin icon in the HUD.
- **Restraint:** Only the runner, coins, pursuer eyes, power-ups and the primary action use saturated red, blue or gold. Environmental overlays, panels and secondary controls remain plaster, bronze and ink.
- **Anti-references:** Do not use neon cyberpunk HUDs, generic glass-dashboard cards, emoji controls, or ornate calligraphy that compromises legibility during play.
- **Token ownership/runtime mapping:** This file defines the approved visual values. `src/art/Palette.js` is the runtime 3D color source; `index.html` CSS custom properties mirror these values for DOM UI. Tests check the shared named values so the two layers cannot silently drift.

## Colors

`paper`, `sand`, `bronze`, `ink`, and `caveNight` create the quiet hierarchy. `vermilion` and `cinnabar` signal clothing, danger, or committed actions; `muralBlue` and `turquoise` carry the mural sky, fabric, and cloud ornaments; `muralGold` is the reward and focus color. Error flashes are vermilion with text or icon support, never color alone. The game uses a cave-night scene with an apricot horizon so the runner remains readable; high-contrast browser preferences retain opaque UI text and outlines rather than switching to a separate palette.

## 敦煌 Q 版纸片 UI

The Q-style pass uses rounded silhouettes, oversized semantic marks, and warm paper panels rather than photorealistic assets. `index.html` mirrors the runtime tokens as CSS custom properties: HUD badges use mural blue/turquoise, screens use a paper grain with gold rules, and primary actions use a vermilion seal. Cloud motifs and flying ribbons are procedural CSS decorations; they remain static and low-contrast under `prefers-reduced-motion`. The DOM keeps native buttons, Chinese labels, live-region HUD updates, and the existing screen IDs so interaction and accessibility do not depend on the art treatment.

## Typography

Use `display` only for the game title and end-of-run score moment. Use `body` for Chinese action labels and instructions; never uppercase Chinese text or substitute decorative web fonts. Use `utility` for distance, scores and short timers because aligned digits improve scanning. HUD labels have sufficient contrast against the vignette and retain at least 1.35 line-height when CJK fallback metrics require it.

## Layout

The WebGL canvas owns the viewport. HUD zones attach to safe edges: distance at upper left, coin/mute/pause controls at upper right, high score at top center, and power-ups at lower left. Modal screens center in a max-width 32rem panel with `panel-padding`; controls remain reachable on 320px-wide portrait screens and landscape phones. UI geometry is fixed during score changes so digit updates do not move nearby controls.

## Elevation & Depth

The canvas provides depth. DOM panels use a dark translucent ink vignette, a 1px bronze rule, and soft internal contrast instead of floating card shadows. The dangerous pursuit vignette expands at low pursuer distance; it must not obscure controls or status text.

## Shapes

Panels use `panel` radius sparingly as cut plaster corners; buttons use the tighter `control` radius. Coin counters, timers and tags use `badge` radius. Hairline rules and square-hole coin motifs are preferred over generic rounded cards.

## Components

### Foundational visual states

Every action uses a native button with a visible `:focus-visible` dunhuang-gold ring, cursor feedback, pressed state, disabled opacity, and a fixed-size busy state. The default loading state is the static title panel with an accessible text status; no layout shift or browser dialog is permitted. `prefers-reduced-motion: reduce` disables decorative HUD pulses and screen transitions while preserving state changes.

### Buttons and actions

The primary “开始逃亡” and “再来一次” actions use cinnabar with pale plaster text and a dunhuang-gold focus/active accent. Pause, mute and resume actions use quiet bronze/plaster treatment. Icon-only controls include Chinese `aria-label` values and retain text tooltips where an icon is not obvious.

### Navigation and data display

There is no navigational chrome or persistent table. HUD values use stable tabular digits, always pair an icon with text when meaning could be ambiguous, and update through an `aria-live` status region at a restrained cadence.

### Forms and overlays

No text-entry forms are required. Start, pause and result surfaces are app-owned overlays rather than `alert()` or `confirm()` dialogs; they receive focus when opened, return it to the previous control when closed, and preserve a keyboard path to every action.

### Iconography

Use inline SVG and procedural geometry only. Icons use 1.5px-equivalent strokes, square-hole coin forms, arrow/key symbols, and clearly labelled mute/pause controls; no icon font or image asset is allowed.

### Motion

Motion is wind and momentum, not decoration: menu title settles slowly, score changes rebound once, and danger vignettes breathe. Gameplay feedback uses the specifications in `Config.js`; decorative UI motion is disabled under `prefers-reduced-motion: reduce`.

### Content and data visualization

The voice is concise, active, and in Simplified Chinese: “开始逃亡”, “继续”, “再来一次”, “已暂停”. Scores are whole numbers with `m` for distance and a labelled coin count; an inline SVG square-hole coin supplies the only repeated pictogram.

## Do's and Don'ts

- **Do:** Let the procedural 3D route be the hero and use UI only to make action, score, danger and replay clear.
- **Do:** Trace `DESIGN.md` colors into `Palette.js` and `index.html` CSS custom properties by their semantic names.
- **Don't:** Add external fonts, images, icon libraries, post-processing, or generic dashboard cards.
- **Don't:** Let a decorative transition delay pause, restart, keyboard focus, or reduced-motion users.

## Runtime theme contract

The 3D art layer is selected through `ThemeRegistry` rather than imported by gameplay systems. A theme definition owns `id`, `palette`, `scene`, and six factories: `createTextures`, `createRunnerVisual`, `createPursuerVisual`, `createObstacleVisual`, `createPickupVisual`, and `createEnvironmentVisual`. The runner factory must return `root`, `leftLeg`, and `rightLeg`; pooled obstacle and pickup visuals retain `setType()` plus their existing `userData` collision metadata.

The shipped `dunhuang` token set maps to mineral-pigment colors in `src/art/Palette.js`: vermilion/cinnabar for the robe and danger, mural blue/turquoise for sky, fabric, and cloud marks, bronze/paper/sand for masonry, mural gold for rewards and focus, ink for silhouettes, and cave night for the sky/fog. Canvas textures (`sky`, `clouds`, `paper`, `mural`, `sand`, `stone`) are cached by `themeId:name`, so a future adapter can reuse texture names without sharing the wrong texture instance.

## 上海外滩替换边界

The second visual version can register `shanghai-bund` with its own palette, scene light tokens, CanvasTexture drawings, and the same procedural factory signatures. Its geometry may become art-deco towers, river lights, and a different runner costume, but it must keep the visual semantic API (`setType`, `setKind`, runner leg nodes) and never modify lane state, obstacle type strings, collision height metadata, pool sizes, or gameplay probabilities. Switching `DEFAULT_THEME_ID` remains a composition-boundary change.

To add a Shanghai Bund version, register a second definition (for example `shanghai-bund`) with its own palette, scene colors, CanvasTexture draw functions, and the same factory signatures. The adapter may replace geometry and materials, but it must not change lane state, obstacle type strings, collision height metadata, pool sizes, or gameplay probabilities. Switching `DEFAULT_THEME_ID` is therefore a visual change at the composition boundary, not a gameplay fork.
