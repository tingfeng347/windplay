---
name: 字间飞行
description: 黑色天空中的第一视角彩色 ASCII 城市飞行。
colors:
  ink: "#e6e5d8"
  muted: "#acb4b5"
  accent: "#f5bb55"
  line: "#30383b"
  sky: "#000000"
  button-bg: "#12191b"
  button-border: "#647071"
  panel-bg: "#071012f5"
  panel-border: "#5e6b6c"
  field-bg: "#111c20"
  primary-ink: "#151617"
  primary-hover: "#ffd185"
  building-cyan: "#6b9ca5"
  building-lilac: "#a3a9b8"
  building-sand: "#c5aa7c"
  leaf: "#6eaa6e"
  window: "#f0cb89"
  road: "#7c8396"
  grass: "#426949"
  future-gate: "#9a7041"
  industrial-brick: "#aa7864"
  roof-steel: "#82929c"
  crane-yellow: "#dab05d"
  river: "#437e9c"
  pavement: "#99958a"
typography:
  title:
    fontFamily: '"Courier New", "Noto Sans Mono", monospace'
    fontSize: "20px"
    fontWeight: 500
    letterSpacing: ".04em"
  headline:
    fontFamily: '"Courier New", monospace'
    fontSize: "25px"
    fontWeight: 500
    lineHeight: 1.4
  body:
    fontFamily: '"Courier New", "Noto Sans Mono", monospace'
    fontSize: "13px"
    lineHeight: 1.9
  instrument:
    fontFamily: '"Courier New", "Noto Sans Mono", monospace'
    fontSize: "28px"
    fontWeight: 500
    lineHeight: 1
  label:
    fontFamily: '"Courier New", "Noto Sans Mono", monospace'
    fontSize: "11px"
rounded:
  instrument: "4px"
  control: "5px"
  help: "8px"
  panel: "10px"
spacing:
  controls: "8px"
  compact: "12px"
  mobile-edge: "16px"
  help: "24px"
  desktop-edge: "30px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.primary-ink}"
    rounded: "{rounded.control}"
    padding: "13px"
    width: "100%"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.primary-ink}"
  button-secondary:
    backgroundColor: "{colors.button-bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "9px 15px"
  route-field:
    backgroundColor: "{colors.field-bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px"
    width: "100%"
  state-panel:
    backgroundColor: "{colors.panel-bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "30px"
    width: "min(470px, calc(100% - 32px))"
  telemetry:
    backgroundColor: "{colors.sky}"
    rounded: "{rounded.instrument}"
    padding: "12px 15px"
    textColor: "{colors.ink}"
    typography: "{typography.instrument}"
  attitude:
    backgroundColor: "{colors.sky}"
    textColor: "{colors.muted}"
    rounded: "{rounded.instrument}"
    padding: "12px 15px"
  navigation:
    textColor: "{colors.muted}"
---

# Design System: 字间飞行

## Overview

**Creative North Star: "字符构成的可操纵空间"**

以可操纵的字符空间为核心：天空保持纯黑，楼房、树木、道路和航门都由固定字格上的彩色 ASCII 字符绘制。界面沿用等宽字体，让仪表和画面属于同一种视觉语言。

画面持续占据主要操作区；起飞和结果面板只在相应状态覆盖中央。青灰城市与绿色树木提供空间参照，金色同时标记当前航门和开始动作。此文记录现有源码，不把字符渲染描述为像素贴图或照片。

**Key Characteristics:**
- 纯黑天空与彩色字符组成的第一视角空间。
- 固定字格、等宽字体和表格数字仪表。
- 金色当前航门与主操作按钮。
- 上方仪表、下方航线状态，中央状态面板。

## Colors

### Primary
航门金连接当前目标、起飞按钮、焦点轮廓与短状态提示。后续航门使用褐金；主按钮悬停切换浅金。

### Secondary
商业楼群采用青灰、灰紫，住宅与钟楼偏沙色，工业区采用砖红、钢灰和吊架黄；窗格暖黄，树冠绿。蓝色波纹字符标记河道，灰色点阵与浅色条纹标记街道及桥梁，冒号标记人行道。距离通过字符透明度衰减，而不是改写天空色。

### Neutral
暖灰用于主要读数，冷灰用于说明。深灰分界划出页头页脚；近黑面板与航线字段压住画面，灰边保持可辨认的轮廓。

**The 字符空间 Rule.** 场景中的城市与航门使用相同字格和深度缓冲；天空保持纯黑。

## Typography

等宽字体贯穿界面；标题与仪表采用中等字重。主标题桌面为 (20px)，移动为 (17px)；状态面板标题桌面为 (25px)，移动为 (22px)。说明以 (13px / 1.9) 排列，仪表值以 (28px / 1) 和表格数字对齐，移动降至 (21px)。仪表标签和短操纵提示使用 (11px)。

场景独立使用 (12px) Courier New，字格宽 (9px)、行高 (14px)；更改这些值会影响空间采样，不能当作普通正文排版处理。

## Layout

整页为纵向弹性布局，高度 (100dvh)，最小高度 (520px)。桌面页头 (65px)，页脚至少 (60px)，中间画布弹性填满剩余区域。仪表左上、姿态右上，桌面外框分别距左/右 (15px)、距上 (14px)，航线和动作位于页脚；起飞及结果面板居中，宽度封顶 (470px)。

在 (650px) 以下收紧页边到 (16px)，页头降至 (55px)，仪表和字号同步收紧，仪表框距侧边 (6px)、距上 (8px)，内边距降为 (10px)。粗指针设备或窄屏显示六个按住操纵按钮，最小高度 (44px)。作品的 preview 模式仅呈现场景帧，隐藏控制界面；当前启动台封面使用实际浏览器截图。

## Elevation & Depth

界面以边框和深色层次区分区域。中央面板用 (0 18px 70px #000c) 阴影覆盖画面；短状态提示用 (0 2px 5px #000) 文字阴影保持对比。空间深度来自字符透视、遮挡与距离透明度，不依赖界面阴影。

## Shapes

仪表底板圆角 (4px)，按钮与字段使用小圆角 (5px)，说明层 (8px)，状态面板 (10px)。建筑以字符块面表达；当前航门为金色 O，后续航门为 +，准星也是 +。

## Components

- **按钮：** 次级动作使用深底灰边；悬停将边框与文字变金。起飞和重飞主按钮铺满面板，金底深字，粗体。焦点轮廓为金色 (2px)，向外偏移 (4px)；禁用透明度为 (.4)。
- **航线字段：** 原生 select，深色背景、灰边、全宽，保留标签和航线说明。
- **状态面板：** 起飞、暂停/结束状态共享居中层；大标题后跟短说明与操作。
- **仪表与进度：** 仪表和姿态使用不透明黑色底板，内边距 (12px 15px)，确保字符楼房不会穿过读数；仪表不接收指针事件，数字使用表格数字。航程和航门进度留在页脚。
- **导航与说明：** WindPlay 返回链接采用冷灰，悬停变暖灰；操作说明是右上可滚动浮层。
- **触屏操纵：** 六键平排；按住以金底黑字标记。

W/S 以 (60°/s) 改变俯仰，A/D 以 (60°/s) 改变滚转，两者限制为 (±45°)。滚转与偏航角速度线性对应，满滚转达到 (90°/s)；松键保持姿态。Z/X 以 (10 m/s²) 调整空速，范围 (10–50 m/s)。这些是现有交互契约，后续视觉调整应保持。

## Do's and Don'ts

### Do:
- Do 保持天空纯黑，使用字符和深度遮挡表达空间。
- Do 将金色用于当前航门、起飞动作和短状态提示。
- Do 保留俯仰与滚转读数、空速单位和航线进度。
- Do 从 src/ 提取修改，再通过构建生成 demo/index.html。

### Don't:
- Don’t 用照片、渐变天空或像素纹理替代字符场景。
- Don’t 把松键后的姿态改成自动回中；当前操纵会保持姿态。
- Don’t 把未实现的组件、动效或视觉完成度写成既有规范。

提取依据：src/styles.css、src/index.html、src/render.js、src/core.cjs。实现说明见 docs/DEVELOPMENT.md；本文件为当前实现的设计记录。
