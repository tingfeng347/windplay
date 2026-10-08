---
name: 超级马里奥 · WindPlay
description: 可游玩的像素画面优先，深色控制台承托八个世界的冒险。
colors:
  paper: "#fcf3d9"
  muted: "#bcb6aa"
  ink: "#181b1b"
  panel: "#252929"
  red: "#ef594b"
  gold: "#ffd76d"
  line: "#444946"
  button-hover: "#3d4240"
  primary-hover: "#ff7769"
  primary-ink: "#171717"
  jump-ink: "#141817"
  sky: "#5c94fc"
  overlay-scrim: "#09121b80"
  overlay-panel: "#161e23f2"
  overlay-border: "#faf0d2"
  completed-line: "#8d773d"
  fullscreen-bg: "#111"
typography:
  display:
    fontFamily: "ui-monospace, monospace"
    fontSize: "clamp(26px, 4.2vw, 52px)"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-.025em"
  title:
    fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "22px"
    fontWeight: 700
    letterSpacing: ".03em"
  section:
    fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "29px"
    fontWeight: 700
  body:
    fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "14px"
    lineHeight: 1.9
  label:
    fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "12px"
  metadata:
    fontFamily: "ui-monospace, monospace"
    fontSize: "12px"
    letterSpacing: ".08em"
  stage:
    fontFamily: "ui-monospace, monospace"
    fontSize: "13px"
  game-hud:
    fontFamily: "monospace"
    fontSize: "16px"
    fontWeight: 700
rounded:
  button: "4px"
  console: "12px"
  console-mobile: "8px"
  square: "0"
spacing:
  control-gap: "7px"
  stage-gap: "8px"
  touch-gap: "10px"
  console-inset: "12px"
  page-gutter: "24px"
  below-top: "44px"
  below-bottom: "48px"
  column-gap: "80px"
components:
  button-primary:
    backgroundColor: "{colors.red}"
    textColor: "{colors.primary-ink}"
    rounded: "{rounded.button}"
    padding: "12px 30px"
  button-primary-mobile:
    backgroundColor: "{colors.red}"
    textColor: "{colors.primary-ink}"
    rounded: "{rounded.button}"
    padding: "7px 12px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.paper}"
    rounded: "{rounded.button}"
    padding: "9px 15px"
  console:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.console}"
    padding: "{spacing.console-inset}"
  stage-button:
    textColor: "{colors.paper}"
    typography: "{typography.stage}"
    rounded: "{rounded.button}"
    padding: "6px"
    height: "44px"
  stage-button-current:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
  stage-button-completed:
    textColor: "{colors.gold}"
  touch-button:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.button}"
    height: "55px"
  touch-button-jump:
    backgroundColor: "{colors.red}"
    textColor: "{colors.jump-ink}"
    height: "55px"
---

# Design System: 超级马里奥 · WindPlay

## Overview

**Creative North Star: 可直接游玩的 FC 控制台。** 用户指定 FC/NES 初代《Super Mario Bros.》的画面、玩法与八个世界、32 关的内容方向，尽实际条件接近原作。首屏以可游玩的像素 Canvas 为主体，深炭色控制台让游戏成为视觉中心。蓝天、棕砖、绿管道与红帽角色是画面的识别锚点。

这是当前源码的设计记录。关卡布局、画面与音效由代码重建；方向约定不等同于逐像素、逐关卡完全复刻的验收结论。作品独立运行并生成离线成品。启动台沿用现有 WindPlay 风格；听风 Reel 从启动台隐藏但保留代码，这是仓库范围约束，不扩展本作品的视觉系统。

**Key Characteristics:**

- 像素画面先于说明文字，界面保持克制。
- 中文系统字体与等宽游戏标签搭配，离线可用。
- 键盘、触屏手柄与八行四列关卡选择都可直接使用。
- HTML 辅助文字至少 12px，操作按钮至少 44px 高。

## Colors

暖白与灰褐文字置于深炭色表面；珊瑚红指向开始和跳跃，金黄指向标题、进度与焦点。

### Primary

- **珊瑚红 / red**：开始游戏、触屏跳跃、文本选区；悬停使用 `primary-hover`。
- **金币金 / gold**：游戏标题、通关进度、通关关卡标记、按住状态与焦点轮廓。

### Neutral

- **暖纸白 / paper**：主要文字、当前关背景。
- **灰褐 / muted**：辅助说明、操作名称、世界标签与页脚。
- **深炭 / ink**：页面底色与当前关文字。
- **控制台灰 / panel**：控制台及触屏手柄底色。
- **边界灰 / line**：按钮和页脚边界；`button-hover` 提供悬停反馈。
- **暂停罩层 / overlay-scrim**、**暂停面板 / overlay-panel**、**暖亮边界 / overlay-border**：居中开始、暂停、失败或结算面板。

游戏画面由 `src/render.js` 管理独立像素调色板。日间天空使用 `sky`，水下、地下、城堡与夜间有各自场景颜色；不要将控制台语义色扩展为游戏场景的统一配色。

## Typography

**Body Font:** `"PingFang SC", "Microsoft YaHei", sans-serif`。**Label/Mono Font:** `ui-monospace, monospace`；Canvas HUD 为 `bold 16px monospace`。没有网络字体依赖。

- **Display**：开始面板两行英文标题，桌面为 `clamp(26px, 4.2vw, 52px)`、1.12 行高，窄屏固定 22px、1.05 行高。
- **Title**：页头 22px，窄屏 17px；副标题 12px，窄屏隐藏。
- **Section**：说明标题 29px，窄屏 26px；关卡标题 20px。
- **Body**：操作说明 14px、1.9 行高、最长 38em；面板说明 14px、1.8 行高，窄屏 12px、1.5 行高。
- **Label / Metadata**：状态、脚注、关卡进度、世界标签与按键说明至少 12px。屏幕顶部等宽标签为 12px、.08em 字距，窄屏取消字距并允许换行。
- **Stage**：关卡按钮 13px 等宽字体；进度使用等宽数字排列。

辅助字号下限针对 HTML 控制区；Canvas HUD 的 16px 是内部绘图单位，随画布缩放。

## Layout

页头和主区域宽度上限 1192px，桌面左右留白 24px；控制台内边距 12px。Canvas 内部尺寸为 768×448，外框保持 12:7 比例并按容器宽度缩放，使用 `image-rendering: pixelated`。游戏画面与覆盖面板占据首屏主要空间。

画面下方是状态行与暂停、重玩、全屏操作。其后以 `1fr 1.25fr` 双列呈现操作说明和关卡选择，列间距 80px、上下留白 44px / 48px。关卡共八行，每行一个 72px 世界标签和四个等宽按钮，间距 8px。

700px 以下：页头左右留白 16px、主区 12px、控制台内边距 7px；下方改为单列、间距 34px。状态行改为纵向，操作按钮靠右；世界标签收窄至 65px。粗指针或宽度不超过 700px 显示触屏手柄。方向组与动作组支持同时按住方向、加速和跳跃。

全屏控制台占满视口，内边距 8px、直角；画面填充剩余高度并保持内容比例。`src/game.js` 初始化时将触屏手柄移入控制台，全屏状态显示手柄。

## Elevation & Depth

界面主要以深色表面和细边界区分层级。控制台阴影为 `0 20px 45px -25px #000`，用于承托画面；按钮不使用抬升阴影。覆盖面板使用半透明深色罩层及 2px 暖白边界。

按钮背景过渡为 `.15s`。`prefers-reduced-motion: reduce` 关闭该过渡；游戏模拟保留玩法必要运动。

## Shapes

按钮圆角 4px，控制台桌面 12px、窄屏 8px，全屏为直角。像素物体与覆盖面板方正，不以额外装饰或复杂裁切抢占画面。控件边界为 1px，焦点为 3px 金黄轮廓、向外偏移 4px。

## Components

### Buttons

开始按钮为珊瑚红底、深色字、700 字重和 `12px 30px` 内边距；窄屏为 `7px 12px`。次级按钮为透明底、暖白字和边界灰描边，默认内边距 `9px 15px`。操作按钮至少 44px 高；禁用按钮保留布局并降至 .45 透明度。可见键盘焦点使用金黄轮廓。

### Navigation

页头提供 14px 灰褐色 WindPlay 返回链接、作品名称和声音开关。窄屏返回链接为 12px。声音开关通过 `aria-pressed` 表达状态，不用颜色单独承担状态信息。

### Pixel Canvas / Overlay

Canvas 可获取键盘焦点，并有玩法描述。开始、继续和游戏状态通过居中面板表达；面板最大宽度为画面的 90%，桌面内边距 `28px 38px`；窄屏最大宽度 96%，内边距 `10px 12px`。窄屏开始和继续操作横向排列、间距 8px，均保持 44px 高。状态消息使用 `role="status"` 和 `aria-live="polite"`。

### Stage Chooser

关卡按钮至少 44px 高、内边距 6px。当前关为暖白底、深色字；通关关卡使用金黄字、`completed-line` 描边和右上 4×4px 金黄标记。当前与通关状态可以共存。所有关卡允许直接选择练习，进度保存在当前浏览器。

### Touch Gamepad

按钮为 55px 高，方向键至少 48px 宽，跳跃键至少 64px 宽。加速 / 火球使用两行 12px 字；跳跃为 14px 粗体。按住时使用金黄底与深炭文字。手柄使用 `touch-action: none` 和禁止文本选择，保证多指持续输入。

键盘映射：`← → / A D` 移动；`Space / Z / W / ↑` 跳跃或游泳；`Shift / X` 加速或火球；`↓ / S` 进入管道；`P / Esc` 暂停。具体状态转换以游戏引擎实现为准。

## Do's and Don'ts

### Do:

- **Do** 让可游玩的像素 Canvas 成为第一视觉中心，使用实际游戏画面。
- **Do** 保留至少 12px 的 HTML 辅助文字和至少 44px 高的操作按钮。
- **Do** 保留键盘焦点、触屏多指输入、状态文字与清晰的关卡状态。
- **Do** 从 `src/` 构建并验证离线成品，保持源码与 demo 一致。

### Don't:

- **Don't** 添加新的视觉隐喻、装饰性营销首屏或与 FC/NES 方向冲突的风格。
- **Don't** 将代码重建表述为已验证的逐像素、逐关卡完全复刻。
- **Don't** 手工改动生成的 `demo/` 或 `dist/`。
- **Don't** 在本作品的视觉文档更新中替换启动台风格或删除听风 Reel 的代码。
