---
name: 烟雨江南
description: 可环绕和入园近看的非对称江南三维园林。
colors:
  ink: "#253e38"
  muted: "#52665f"
  surface: "#e9ede7"
  line: "#a6b6aa"
  accent: "#315f50"
  background: "#c7d0c8"
  pressed-ink: "#f2f3e8"
  night-ink: "#d6dfd4"
  night-muted: "#b7c5bd"
  night-surface: "#23332f"
  night-line: "#687a71"
  night-accent: "#b6c5aa"
  night-pressed-ink: "#1d332b"
  wood: "#b7a38d"
  dark-wood: "#cdb7a0"
  plaster: "#efe9d6"
  stone: "#8a938d"
  tile: "#bbc3b3"
  lamp: "#f0d3a1"
  lamp-emission: "#ffad48"
  rock: "#b4b1a1"
  paper: "#d4c9ab"
  linen: "#e9dbc0"
  bed-curtain: "#e2d4bd"
  quilt: "#b3b9b3"
  ceramic: "#afc4ad"
  brick: "#91998e"
  wet-wood: "#bbb098"
  earth: "#607653"
  woven: "#71624c"
  bark: "#797365"
  scene-day-background: "#c4cec7"
  scene-night-background: "#172b3e"
typography:
  title:
    fontFamily: '"Noto Serif SC", "Songti SC", "STSong", serif'
    fontSize: "28px"
    fontWeight: 500
    letterSpacing: ".13em"
  headline:
    fontFamily: '"Noto Serif SC", "Songti SC", "STSong", serif'
    fontSize: "22px"
    fontWeight: 500
  destination:
    fontFamily: '"Noto Serif SC", "Songti SC", "STSong", serif'
    fontSize: "16px"
  body:
    fontFamily: "system-ui, sans-serif"
    fontSize: "13px"
    lineHeight: 1.9
  label:
    fontFamily: "system-ui, sans-serif"
    fontSize: "11px"
rounded:
  control: "5px"
  walking-title: "6px"
  switch: "7px"
  panel: "8px"
spacing:
  switch-gap: "4px"
  control-gap: "8px"
  compact: "12px"
  help: "24px"
  desktop-edge: "28px"
components:
  button-plain:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-selected:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.pressed-ink}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  view-switch:
    backgroundColor: "#a6b6aa29"
    rounded: "{rounded.switch}"
    padding: "4px"
  visit-panel:
    backgroundColor: "#e9ede7ed"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "18px 20px"
    width: "195px"
  destination:
    textColor: "{colors.ink}"
    rounded: "0"
    padding: "9px 0"
    typography: "{typography.destination}"
  help-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "24px"
    width: "min(380px, calc(100% - 48px))"
  day-range:
    width: "145px"
  roof-control:
    textColor: "{colors.ink}"
  walking-title:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.walking-title}"
    padding: "12px 16px"
  walk-control:
    backgroundColor: "#e9ede7e8"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "9px"
---

# Design System: 烟雨江南

## Overview

**Creative North Star: "观察到入内"**

从环绕观察走向入园近看：浅灰绿界面围绕可漫游的实时三维园林，宋体标题承接中文游园文字，系统无衬线承担操纵说明。非对称池岸与曲廊连接三开间主屋，进入堂屋、书房、卧房后可近看梁柱、格扇和陈设。

当前实现以实体几何、实拍 PBR 材质、阴天 HDRI 环境、软阴影、环境遮蔽、雨线、涟漪和低雾建立空间。木构使用 Rough Wood，其余程序陈设木件使用 Wood Table 001；主要椅子与桌案使用 CC0 Chinese Armchair / Chinese Tea Table 的完整模型及 2K PBR 材质；墙、石、瓦、砖、曲廊木板、地表和麻布均有实际授权扫描材质。床帘与枕使用重染为原色的麻布，帘形由重力、距离弹簧、顶部悬挂与束带约束计算后静态缓存；被褥在重力、床垫接触及横向摩擦、双向剪切与弯曲约束下松弛，填棉平滑后生成闭合体积，保留蓝亚麻织纹；挂轴采用大都会博物馆开放的文徵明公版画作。

乔木使用 CC0 Tree Small 02 的真实几何和材质，蕨类使用 CC0 Fern 02 四种几何，按比例、朝向和位置组成原创造景；林下与池岸地被连成片，以四株中层小树和 CC0 Shrub 04 实例连接蕨床与树冠，并配合起伏地表。竹丛、藤、荷叶、建筑、其余陈设和织物体积由源码构建；模型原始几何与 UV 保留。近景陈设包括授权木椅与桌案、线装书、香炉、闭合被褥、软矩形枕与不透明麻布床帘。写实、宋明江南与电影感是方向要求，本文不宣称已经达到照片或电影制作水准；具体品质与验收结论由 docs/QUALITY.md 记录。

**Key Characteristics:**
- 浅灰绿日间界面与墨绿夜间界面。
- 宋体空间名称搭配系统无衬线操纵文字。
- 可进入的三开间木构与非对称临水曲廊。
- 近距离观察、连续日夜光照与持续细雨。

## Colors

### Primary
园林深绿标记当前视角、日夜按钮、滑杆与焦点。夜间苔灰绿替换主色，配深色选中文字；昼夜通过 CSS 自定义属性切换，不使用独立的组件体系。

### Secondary
木构、程序陈设与授权家具模型采用各自扫描纹理和材质，灯纸和灯火使用暖色。扫描纹理、乘色、法线、粗糙度、端面年轮与位置相关的磨损共同影响最终画面，材质色不是最终屏幕色。原色麻布帘与枕经过着色器明度提取和染色；蓝亚麻被褥使用独立材质。书页、丝织物、书封与陶瓷保留程序纹理。程序陈设木材的着色器粗糙度限制在 (.60–.94)，并调整木纹明度；釉陶瓷采用较低粗糙度 (.22)、clearcoat (.94) 和折射率 (1.48)，与哑光木件区分。

### Neutral
灰绿控制面连接界面和庭院；页面底色与加载层使用 background，场景背景与雾使用独立的 scene-day-background / scene-night-background 连续插值。文字、说明、边线逐层变浅；夜间控制面变墨绿，文字变灰白。粉墙经过洗白着色器处理，铺地湿石与湖石共享 Rock 3 照片贴图，铺地设置粗糙度、法线和 clearcoat 表现潮湿表面；黛瓦采用 Grey Roof Tiles 的单片扫描采样，砖地采用 Brick Floor 003 的单块砖面采样，潮湿地表采用 Forest Floor 扫描。

## Typography

主标题使用本机可用的 Noto Serif SC / Songti SC / STSong / serif 回退，不加载外部字体。桌面主标题 (28px)、字距 (.13em)，窄屏 (22px)、字距 (.08em)。场所标题 (22px)，移动 (18px)，漫游移动标题 (17px)。去处名称 (16px)，移动 (14px)。

说明和工具栏以 system-ui / sans-serif 呈现：帮助正文 (13px / 1.9)，页脚 (12px)，去处副注 (11px)。宋体与无衬线分工来自现有样式，应保持空间名与操纵说明的区别。

## Layout

整页高 (100dvh)，最小 (540px)。桌面页头 (75px)，页脚至少 (64px)，画布填满中间区域。场所名左上、去处面板左下、天气右下；页脚承载时辰、揭顶、复位、画质与操作帮助。去处面板可折叠；漫游将场所名放在有底色的小层上，隐藏天气说明，并压缩去处面板。

在 (700px) 以下页头降至 (66px)、页边约 (15px)，去处面板缩至 (150px)，页脚允许换行，滑杆缩至 (82px)，画质按钮隐藏。粗指针或窄屏的漫游模式显示触屏移动键。环绕视角会按画布宽高比调整相机距离：当画布宽高比低于 (.85) 时，从正面较高位置取景并按园林宽度计算距离，避免在竖屏裁掉庭院；宽屏保持斜向环绕初景。环绕视场角 (43°)，入内视场角 (65°)。作品的 preview 模式隐藏游园控制，只留下实时场景帧；当前启动台封面使用实际浏览器截图。

## Elevation & Depth

去处层使用 (0 8px 25px #243e3824)，帮助层使用 (0 10px 35px #142a3d35)，场所和天气在画布上用轻文字阴影提升识别。漫游标题采用实色背景，移除文字阴影。

场景通过真实几何、软阴影、SSAO、克制 bloom、连续时辰光照和雾建立深度。Lythwood Terrace 实拍 HDRI 经 PMREM 提供环境照明和反射，日间定向光与窗前矩形补光照亮室内，夜间保留蓝色定向光与暖灯笼；阴影、色调映射和织纹共同改变最终亮度。光照在昼夜滑杆上连续插值，并不意味着固定材质色等于截图色。主屋柱、梁、承檩短柱、檩、椽和瓦分别建模；揭顶可观察结构，入内保留屋顶。该承托关系是视觉与空间建模约束，不代表工程级结构验证。静态木构与陈设按材质合并绘制，屋顶保持单独批次以支持揭顶；批量化保留米制纹理尺度、原结构关系和碰撞数据。木纹沿方形构件最长轴排列；圆柱侧面连续映射周长和长度，端面单独标记年轮，避免绕柱出现方向跳变。

**The 近看承托 Rule.** 木构的层次应能在入内与揭顶视角中被观察；空间说明必须对应实际几何。

## Shapes

界面使用轻圆角：按钮 (5px)、漫游场所层 (6px)、视角分组 (7px)、浮层 (8px)。去处列表按钮保持直角、无实色选中卡片。建筑使用柱状构件、梁架、格扇、弧形瓦几何与不对称池岸。主屋和曲廊的瓦逐片实例化；主屋瓦带小幅位置、角度和尺寸差异，以跨行连续斑块和檐缘衰减表达风化与受湿色差。石路采用实际磨圆的石板几何，随起伏地表铺放并有轻微倾斜。木件边缘按照米制尺寸做细小圆角，主要椅子与桌案保留授权模型的构件和原始 UV，椅子等比缩放，桌案按空间尺寸缩放；较小的程序桌面由三块实体木板组成，板间保留窄缝和轻微高差。乔木来自 Tree Small 02，不将库中资产命名为某个中国本土树种；整株几何会改变弯曲、比例和朝向，枝叶与阴影采用同一几何。Fern 02 的四种蕨类以四个 InstancedMesh 组织为连续林下与池岸地被。Shrub 04 用一个 InstancedMesh 形成灌木层；竹和藤等仍使用程序逐叶几何。地形顶点随 terrainHeight 起伏；植物基底与漫游眼高跟随地表。这些场景形式不应机械复用于界面按钮。

## Components

- **视角分组：** 灰绿半透明底，两个原生按钮，当前项通过 aria-pressed 呈深绿实底浅字。普通按钮悬停出现淡绿底；焦点用主色 (2px)，外偏 (3px)。
- **去处面板：** 浅灰绿半透明卡片，宋体地点名和无衬线副注。列表纵向排列，悬停只改变文字；“移步换景”标题按钮折叠列表，以内联 SVG 折线箭头表示状态；图标 (16px × 16px)，线宽 (1.3)，展开旋转 (180°)、折叠恢复原方向。
- **日夜控制：** 日景 / 夜景按钮夹原生 range，主色 accent-color；光照连续插值，界面在 day < (.4) 时切换夜间属性。持续细雨配合檐滴、涟漪和轻雾；不存在单独晴雨切换按钮。
- **揭顶：** 原生 checkbox 与文字标签；从漫游开启揭顶会返回环绕，进入房间会恢复屋顶。
- **帮助与状态：** 右下帮助浮层可滚动。加载层使用转圈描边与宋体“园门将启”；减少动态偏好会停止加载旋转。图形加载失败显示文字与重新打开按钮。
- **触屏漫游：** 前进按钮上置，左右后退三键下排；按住标记主色，夜间采用深底浅主色的相应状态。

近景陈设由 src/furnishings.js 组合：src/furniture-models.js 放置授权木椅与主要桌案，其余木件由程序生成；书页、布封与装订线分开建模；香炉用旋转轮廓和曲线足；架子床保留镂空床围，被褥由 settleQuilt 的重力、床垫/床架接触与横向摩擦、双向剪切与弯曲距离约束完成 (260步) 松弛，再以 (6遍) 邻域平滑表达填棉，将上下层与边缘闭合；软矩形枕由闭合球面塑形并补缝线，缝线跟随枕头旋转；束起床帘由 src/cloth.js 的简化 Verlet 模拟生成：顶部悬挂、边/斜距离弹簧、重力和不同高度的压缩束带共同约束帘形；结果缓存后成为静态网格，缝边与悬挂环另建几何。帘形不是预设漏斗曲面，也不随帧持续模拟。枕与床帘采用带 sheen 的实拍麻布材质，保留织纹、提取明度并重染原色；床帘为不透明麻布，写入深度并投射阴影，以避免透明排序。被褥采用独立蓝亚麻扫描材质。床具、书册与香炉体积由源码构建；椅与主要桌案保留外部模型几何。照片织纹与完整家具模型的来源应分别记录。

环绕使用拖动、滚轮与右键平移；漫游用 WASD / 方向键移动、拖动转头、Shift 加快，Esc 返回。室内预设去处带领用户观察堂屋、书房、卧房与池畔曲廊，原生滑杆和复选框保留键盘操纵。

## Do's and Don'ts

### Do:
- Do 以可进入的几何空间支撑环绕和漫游两种观察方式。
- Do 保持柱、梁、承檩短柱、檩和椽之间可观察的承托关系。
- Do 同步昼夜文字、控制面与场景光照，保留键盘焦点。
- Do 标明照片贴图来源，并把程序生成的材质如实记为程序生成。
- Do 从 src/ 修改并构建独立 demo，详细说明放在 docs/。

### Don't:
- Don’t 以静态效果图替代可进入的建筑。
- Don’t 给粉墙贴上不参与开口的假窗；现有窗洞和格扇由几何构成。
- Don’t 用界面装饰遮挡近距离木构观察。
- Don’t 将 PBR、照片贴图或后处理本身等同于已实现电影级写实。

提取依据：src/styles.css、src/index.html、src/app.js、src/materials.js、src/architecture.js、src/furnishings.js、src/cloth.js、src/landscape.js、src/flora-models.js、src/furniture-models.js、src/offline-gltf.js、src/render-batches.js。外部扫描、Tree Small 02 / Fern 02 / Shrub 04 / Chinese Armchair / Chinese Tea Table 模型、Lythwood Terrace HDRI 与文徵明公版画作的来源、授权和离线处理见 docs/ASSETS.md、assets/textures/sources.json、assets/sources-rebuild.json。Tree Small 02 / Fern 02 离线处理后，其余模型保留原始拓扑；构建时几何 gzip 内联，运行时本地解压，正常构建与游园均无需外部下载。浏览器限制见 docs/DEVELOPMENT.md；README 保持简短。
