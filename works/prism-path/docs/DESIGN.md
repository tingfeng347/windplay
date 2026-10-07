---
name: "折光之径 · Prism Path"
description: "浅青天空下、以等距几何实时渲染的十章空间视错觉解谜"
colors:
  sky: "#e7efea"
  ink: "#284a46"
  muted: "#516962"
  line: "#b8ccc1"
  accent: "#b44734"
  paper: "#f7f6eb"
  stone-top: "#faf4df"
  stone-side: "#c6d8ca"
  stone-shade: "#8bb5ac"
  traveler: "#d15e48"
  gold: "#b88a43"
typography:
  display:
    fontFamily: "Prism Display, Songti SC, STSong, serif"
    fontSize: "35px"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "0.08em"
  chapter-numeral:
    fontFamily: "Prism Display, Georgia, serif"
    fontSize: "72px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "normal"
  story:
    fontFamily: "Songti SC, STSong, serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.95
    letterSpacing: "normal"
  body:
    fontFamily: "Avenir Next, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.85
    letterSpacing: "normal"
  label:
    fontFamily: "Avenir Next, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0.12em"
rounded:
  button: "6px"
  card: "12px"
  dot: "50%"
spacing:
  xs: "5px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    padding: "10px 16px"
    height: "44px"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.button}"
    padding: "10px 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "#39675f"
    textColor: "#ffffff"
  button-secondary:
    backgroundColor: "#ffffff50"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    padding: "7px 12px"
    height: "36px"
  level-list-item:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    padding: "9px 10px"
    height: "43px"
  level-list-item-current:
    backgroundColor: "#ffffff70"
    textColor: "{colors.ink}"
  completion-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "28px"
  help-card:
    backgroundColor: "#ffffff80"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "28px"
---

# Design System: 折光之径 · Prism Path

## Overview

**Creative North Star: "一座被光读出的等距石庭"**

第一视觉不是介绍、不是菜单，而是一片可以直接辨识的等距石阵：浅青的天空铺满整个视口，象牙色的石顶、鼠尾草色的石侧在同一个投影里堆出高低，珊瑚色的旅人站在其中最小的一点上。玩家第一眼看到的是可以走的建筑，而不是需要先学会的界面。

界面是这座石庭的注脚，不是它的框架。所有文字退出到浅青底色上，只用一种深墨绿说话；线条是发丝一样的存在，用来分隔而不用来装饰。深度全部交给等距投影本身：投影里靠前的石台自然压住靠后的，石侧的两种明暗交替出体积，地面只留一圈极淡的影子。没有卡片栅格、没有霓虹、没有装饰图；画面里的每一个形状都是可点击、可走的几何。

世界随章节换色，但换的是同一套几何的五条色带（绿、紫、蓝、沙、灰绿），不是为了好看，而是让每一章在视觉上可被记忆。位置决定语义：同一个色槽在不同章节永远是同一个职责。

**Key Characteristics:**
- 浅青天空、象牙石顶、鼠尾草石侧、珊瑚旅人，五色定角色，不随时间漂移。
- 场景由 Canvas 2D 运行时几何绘制，零装饰性图片，字体是唯一的外部位图。
- 深度来自等距投影与明暗，不来自阴影。
- 十章共用一套网格；每章只换色带与规则，不换语言。

## Colors

整块画面是一组低饱和的雾色，只让珊瑚、金色两处暖色发亮；颜色按场景职责命名，不按色相命名。

### Primary
- **天空青（#e7efea）**：页面底色与场景地面共用同一支颜色，所以画布与页面没有接缝，石庭像是直接长在页面上。
- **旅人珊瑚（#d15e48）**：唯一的高饱和暖色，只属于玩家角色。它出现在画面里最小的形状上，越是稀有越是指向明确。五个色带的第五槽永远是它。
- **桥头金（#b88a43）**：金色只画在投影中真正相接、可以走的那一段桥缝上；同一段桥在错误视角或机关未开时退成铁锈红虚线（#a45139）。星光菱形（#c28a3e）、机关、星盘沿用同一族的琥珀与铜色。

### Secondary
- **焦点赭红（#b44734）**：键盘焦点轮廓与文字选区的唯一用途色，不出现在场景里。

### Neutral
- **深墨绿（#284a46）**：正文、标题与主按钮底色；界面层唯一的近黑。
- **次级灰绿（#516962）**：故事以外的辅助说明、视角标签、页脚与数字说明。
- **象牙石顶（#faf4df）**：场景中被照亮、可站立的石台顶面。
- **鼠尾草石侧（#c6d8ca）**：石台受光一侧的立面。
- **石影青（#8bb5ac）**：石台背光一侧的立面，也是画面里面积最大的形状色。
- **发丝线（#b8ccc1）**：页眉、页脚、分区与目标块的 1px 分隔线，只做分隔。
- **纸白（#f7f6eb）**：通关卡片与主按钮文字；比象牙更冷，专属于界面层。

### Named Rules
**The 一色一职 Rule。** 每个色槽在一个章节里只承担一个职责：天空是地面，象牙是石顶，鼠尾草是石侧，珊瑚只属于旅人。跨章节换色带时槽位不变，绝不把一个颜色借给第二个语义。

**The 金色即通路 Rule。** 只有当投影中的两段桥确实相接、机关确实开门时，才画出金缝（#b88a43）；否则是虚线铁锈红。金色是状态，不是装饰。

## Typography

**Display Font:** Prism Display（ZCOOL XiaoWei 子集，本地 `display.woff2`，回退 Songti SC / STSong / serif）
**Body Font:** Avenir Next（回退 PingFang SC / Microsoft YaHei / sans-serif）
**Story Font:** Songti SC（回退 STSong / serif）

**Character:** 自托管的标题体是一支带刀刻感的衬线，只在四个地方出现——作品名、章节号、通关标题、页眉字标——像石庭入口的题刻；其余全部交给系统无衬线，安静、可读、离线可用。故事段落单独用系统宋体，让叙事和操作语言在字形上就分开。

### Hierarchy
- **Display**（500，35px，行高 1.15，字距 0.08em）：作品名「折光之径」；移动端 30px。
- **Chapter Numeral**（400 斜体，72px，行高 1）：左侧栏的章节号，用大字号页码给出进度感；移动端缩到 62px 并退到右上角。
- **Story**（400，17px，行高 1.95，约 14em 行宽）：每章的一句叙事，桌面 17px、移动 13px，行宽主动收窄以保持阅读节奏。
- **Body**（400，13px，行高 1.85）：目标、提示、指南与状态播报。
- **Label**（400，12px，字距 0.12em）：视角标签、区块小标题、章节列表与页脚，用字距而非字重区分层级。

### Named Rules
**The 题刻只刻四处 Rule。** Prism Display 只用于作品名、章节号、通关标题与字标；任何正文、按钮、列表都不使用它。第三支字体（宋体）只服务故事段落。

## Layout

桌面是固定三列网格：左侧 235px 的章节栏（章节号 / 作品名 / 章名 / 故事 / 目标与统计 / 提示 / 动作）、中间自适应且不限高的场景列、右侧 164px 的十章索引。整页 max-width 1700px，左右 4% 内边距，列间距 24px，页眉固定 88px。

场景列自上而下是：视角标签行、画布、旋转控制行、可走路径行。画布高度 `clamp(400px, 51vw, 650px)`，是首屏绝对主体；旋转控制用负外边距轻微贴住画布下缘，让「转动世界」读作场景的一部分而不是工具栏。

断点：1600px 以上画布升到 680px；1100px 以下收成两列（章节栏 190px + 场景），十章索引整行下沉并改为横向换行；650px 以下改为单列纵向流，画布固定 300px，章节号退到标题右上角，章节栏变成 2 列小按钮网格。手机端目标块由纵向改横向，`这一章的旅程` 小标签隐藏以省高度，所有控制保持在拇指可达范围，按钮最小高度 36–44px。

## Elevation & Depth

系统本质是平铺的：深度不由阴影表达，而由等距投影和石侧的两个明暗色槽承担。整个界面只有两处柔和阴影，都用于让浮层离开平面，而不是给控件加体积。

### Shadow Vocabulary
- **浮层抬升**（`box-shadow: 0 18px 70px #284a4633`）：只用于通关卡片，让它从石庭上浮起一层。
- **场景接地影**（Canvas 内 `#355a5010` 椭圆）：每块石台脚下的一圈极淡投影，用来把悬空的几何按在地上；只服务于可读性，不是装饰。

### Named Rules
**The 无硬投影 Rule。** 不使用硬偏移阴影、浮雕、描边投影或拟物按钮；界面的层级由底色明度与 1px 发丝线表达，场景的层级由投影表达。

## Shapes

按钮与列表项用 6px 的轻圆角，浮层卡片用 12px，圆点（视角罗盘、星盘圆环）为正圆；圆角只用来软化交互面，从不放大到形状级别。

真正的形状语言在场景里：所有体块都是等距正交的立方体（顶面菱形 + 两侧立面），桥是细的金色线段，星光是被照亮的菱形，机关是铜色菱形，星盘是一圈细描的椭圆环，拱门是两根立柱顶起一个正圆弧。所有这些都由代码逐帧绘制，没有一处来自图像资源。视角切换时整个投影真实旋转，形状彼此遮挡关系随之改变——形状本身就是玩法。

## Components

### Buttons
- **Shape:** 轻圆角 6px，1px 发丝线描边，最小高度 44px（小动作 36–40px）。
- **Primary:** 深墨绿实底（#284a46）、纸白文字，用于通关卡片的「进入下一章」；悬停转亮为 #39675f。
- **Default:** 透明底、深墨绿文字与描边；悬停时底变 `#ffffff70`、描边转为深墨绿。
- **Secondary / 小动作:** 半透明白底（`#ffffff50`）的路径按钮与「指引 / 撤回 / 重走」，更小更轻；「切换机关」用沙金底（#d9ba83）区分。
- **Disabled:** 透明度 0.4，用于还不能旋转、没有可撤回步骤等状态。
- **Hover / Focus:** 过渡克制；键盘焦点统一为 3px 赭红（#b44734）外轮廓、偏移 4px。

### Navigation
- **Header:** 左侧返回启动台的文字链接、中间 Prism Display 字标「PRISM / PATH」、右侧「游玩指南」，下缘 1px 发丝线。透明描边的按钮不抢注意力。
- **Chapter Index:** 右侧十章列表，每行是「序号 + 章名 + 完成勾」，当前章用 `aria-current` 配半透明白底与描边；移动端转成 2 列网格。
- **View Compass:** 四个圆点表示当前朝向，实心点即 `state.view`。

### Canvas Scene (signature)
- **Style:** 整个谜题是一块 Canvas 2D 画布，`tabindex="0"`，键盘与触屏同权。
- **Color assignment:** 五条章节色带轮流使用（绿 / 紫 / 蓝 / 沙 / 灰绿），槽位固定；当前可走石台的顶面提亮为 `#fffbea`。
- **States:** 选中石台加铜色描边并竖起珊瑚色旅人；可走相邻石台描一圈鼠尾草细环；桥缝按真实连通性变金或变锈。
- **Motion:** 旋转视角用 380ms 缓出四阶淡入（`1-(1-t)^4`）；点石台后旅人按路径每 150ms 逐格行走。`prefers-reduced-motion` 下所有旋转与步行动画取消，直接跳到终点。

### Completion Card
- **Corner Style:** 12px 圆角。
- **Background:** 纸白（#f7f6eb），叠在画布中央上方。
- **Shadow Strategy:** 见 Elevation & Depth 的浮层抬升。
- **Behavior:** 通关前 `hidden`；出现时给出本章步数、星级与下一步动作，第十章改为「回到第一章」。

### Help Panel
- **Corner Style:** 12px 圆角，与通关卡片同一形状语言。
- **Background:** 半透明白（`#ffffff80`），横跨整行（grid-column 1/-1），max-width 780px 居中。
- **Behavior:** 由页眉「游玩指南」切换，`hidden` 控制显示；打开时滚动入视野并把焦点移到「回到旅程」，关闭时焦点回到触发按钮。

## Do's and Don'ts

### Do:
- **Do** 让画面本身可玩：新增任何视觉元素前，先问它是否能被点击、被走、被转动。
- **Do** 保持五色槽位不变，只更换章节色带；珊瑚只属于旅人，金色只标真通路。
- **Do** 让深度由等距投影和石侧两个明暗槽表达，地面影只用于把几何按在地上。
- **Do** 用字距和字号（12px / 0.12em）表达层级，而不是靠加粗或加色。
- **Do** 让所有控制在桌面与手机上保持 36–44px 的可触高度，旋转控制始终贴着画布。

### Don't:
- **Don't** 引入装饰性图片、图标包或位图纹理；场景里的每个形状都必须是运行时几何。
- **Don't** 给控件加硬偏移阴影、浮雕或拟物边框；系统的层级由明度与发丝线承担。
- **Don't** 在场景里使用高饱和的第三种暖色；除珊瑚与金色外，画面保持雾色。
- **Don't** 让 Prism Display 出现在正文、按钮或列表里；它只用于四处题刻。
- **Don't** 把「转动世界」降级成工具栏动作；视角旋转是核心玩法，必须贴近场景呈现。
