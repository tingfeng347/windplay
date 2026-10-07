---
name: 余烬地牢 · ASCII Delve
description: 提灯下的字符地牢：炭底、纸白、一点琥珀灯火。
colors:
  firelight: "#e3b768"
  moss: "#a7c18e"
  ember-coral: "#e48f79"
  ground: "#171d1b"
  surface: "#1c2420"
  map-plane: "#111814"
  ink: "#e0e4d1"
  dim-ink: "#a1ad9f"
  stone-line: "#39453b"
  unseen: "#263129"
  floor-dim: "#576348"
  wall-moss: "#687e66"
  exit-teal: "#abd1ca"
  traveler: "#f9d78c"
  enemy: "#de9480"
  boss: "#ef966b"
  key-gold: "#f2cf7b"
  potion-violet: "#b9a1cd"
  merchant-gold: "#d2b679"
  lore-teal: "#94b7ba"
  trap-clay: "#c18b76"
  weapon-paper: "#dcdfc5"
  armor-steel: "#abbcc0"
  track: "#343f34"
typography:
  display:
    fontFamily: "Delve Display, Songti SC, serif"
    fontSize: "38px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.06em"
  headline:
    fontFamily: "Delve Display, Songti SC, serif"
    fontSize: "32px"
    fontWeight: 500
    lineHeight: 1.2
  title:
    fontFamily: "SFMono-Regular, Consolas, Liberation Mono, PingFang SC, monospace"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.4
  body:
    fontFamily: "SFMono-Regular, Consolas, Liberation Mono, PingFang SC, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.9
  label:
    fontFamily: "SFMono-Regular, Consolas, Liberation Mono, PingFang SC, monospace"
    fontSize: "15px"
    fontWeight: 700
    letterSpacing: "0.18em"
    lineHeight: 1
rounded:
  sm: "3px"
  md: "6px"
spacing:
  "2xs": "3px"
  xs: "6px"
  sm: "9px"
  md: "13px"
  lg: "22px"
  xl: "30px"
components:
  button:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "9px 13px"
    height: "42px"
  button-hover:
    backgroundColor: "#2b352c"
  button-primary:
    backgroundColor: "{colors.firelight}"
    textColor: "{colors.map-plane}"
    rounded: "{rounded.sm}"
    padding: "9px 13px"
    height: "42px"
  button-primary-hover:
    backgroundColor: "#eed098"
  field:
    backgroundColor: "{colors.map-plane}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "9px 13px"
    height: "42px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "13px 18px"
  map-plane:
    backgroundColor: "{colors.map-plane}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  dpad-key:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    size: "38px"
  health-track:
    backgroundColor: "{colors.track}"
    height: "6px"
---

# Design System: 余烬地牢 · ASCII Delve

## Overview

**Creative North Star: 「提灯手稿」(The Lanterned Manuscript)**

整个界面是一页在黑暗中被人提灯照亮的手稿。底色是炭，字是纸白，唯一的光就是那一点琥珀灯火；玩家读到的不是图形，而是字符本身构成的世界。所有面板、按钮、图例都使用同一套等宽字体，界面与地牢共享同一种字母，仿佛地牢是从这页手稿里长出来的，而不是被画在它上面。

密度是「一屏之内看完一局」的密度：地图占桌面视口约三分之二，左侧地图、右侧旅人状态与手记，底部方向与行动控制。没有卡片栅格、没有装饰插画、没有过场动画；每一次移动、每一次受击都由字符状态与颜色直接表达。视觉层级只来自三个来源：炭与纸的明度差、视野内外的迷雾、以及琥珀色的稀有点缀。

**Key Characteristics:**
- 炭黑底 + 纸白字 + 单一琥珀光源，界面是「黑暗中提灯」的三色关系。
- 地图由字符实时渲染，颜色即语义（旅人、敌人、钥匙、商人各有一色），不依赖任何图像素材。
- 界面与地牢共用一套等宽字体，标题单独使用自托管的「Delve Display」汉字子集。
- 无阴影、无渐变、无圆角大弧线；深度只由明度层级与迷雾产生。
- 回合制节奏：玩家行动，世界才行动。

## Colors

调色板是「炭、纸、一盏灯」的三段关系，加上一层字符墨作为地图上的语义色。

### Primary
- **灯火琥珀 / Firelight** (#e3b768)：唯一的强调色。用于主按钮实底、焦点轮廓、当前回合与金币数字、选项高亮、以及地图上的玩家与钥匙。它的稀有是它成立的原因——一屏之内只允许出现少数几处。
- **灯火浅金 / Firelight Soft** (#eed098)：主按钮悬停时的色，是琥珀的唯一次级明度。

### Secondary
- **苔绿 / Moss** (#a7c18e)：生命值条、存活指示点、遗迹（`+` 泉眼）与「已保存」状态。它代表还能继续活下去的东西。

### Tertiary
- **余烬珊瑚 / Ember Coral** (#e48f79)：危险与敌人。用于图例中的敌人、生命危急（低于 30% 时生命条转为此色）。

### Neutral
- **炭地 / Charcoal Ground** (#171d1b)：页面底色，也是 `<meta theme-color>`。
- **灯雾面 / Lantern Surface** (#1c2420)：地图条、地图页脚、侧栏区块与弹层容器的面板色，比底色亮一档。
- **地牢底 / Dungeon Plane** (#111814)：地图画布与输入框底色，比底色还要暗，是画面的「洞」。
- **纸白 / Paper White** (#e0e4d1)：正文字色与地图上可行走地面的默认色。
- **灰墨 / Dim Ink** (#a1ad9f)：辅助说明、标签、页脚、手记中较早的条目。
- **石线 / Stone Line** (#39453b)：所有 1px 分隔线与控件描边，是唯一的结构线。
- **未视 / Unseen** (#263129)：未探索区域的点阵色。
- **暗底 / Dim Floor** (#576348)：已探索但当前不在视野内的地面与物件色。

### 字符墨（地图语义色）
这一组只出现在地图画布上，每一色绑定一个可交互的字符，是这个世界真正的图例。

- **旅人 / Traveler** (#f9d78c)：`@`，玩家，地图上最亮的一枚字符，脚下带一层琥珀色行走高光。
- **敌人 / Enemy** (#de9480)：`r s w` 普通敌人的字色，血条用 #514438 底 + #de9480 填充。
- **首领 / Boss** (#ef966b)：`W` 守火者，比普通敌人更红。
- **钥匙 / Key Gold** (#f2cf7b)：`k` 铜钥匙，比灯火更浅的金。
- **药水 / Potion Violet** (#b9a1cd)：`!` 药水，是调色板里唯一的紫。
- **商人 / Merchant Gold** (#d2b679)：`&` 商人。
- **碑文 / Lore Teal** (#94b7ba)：`?` 碑文。
- **陷阱 / Trap Clay** (#c18b76)：`^` 陷阱。
- **兵器 / Weapon Paper** (#dcdfc5) 与 **护甲 / Armor Steel** (#abbcc0)：`/` 与 `]`，走上即装备的掉落物。
- **墙苔 / Wall Moss** (#687e66)：`#` 视野内的墙；**出口青 / Exit Teal** (#abd1ca)：`>` 阶梯，视野内最冷的颜色。
- **轨道底 / Track** (#343f34)：生命条与移动端生命条的底槽。

### Named Rules
**The One Lantern Rule. 「只有一盏灯」** 琥珀色是唯一的光源色，一屏之内只出现在少数几处（主按钮、焦点、玩家、钥匙、关键数字）。它一旦铺开成面，这个世界就失去了黑暗。

**The Character Carries Color Rule. 「字符即语义」** 地图上的每一种颜色都必须绑定一个可交互的字符或地形；不要为了好看给地图加装饰色。玩家应该能靠颜色一眼读出「那是敌人还是钥匙」。

**The Charcoal-Not-Black Rule. 「炭不是黑」** 底色是 #171d1b 的炭绿灰，不是纯黑。纯黑会让琥珀失去暖意，也会让地图失去地牢的潮湿感。

## Typography

**Display Font:** Delve Display（自托管的 ZCOOL XiaoWei 子集，OFL 1.1；回退 `Songti SC`, serif）
**Body Font:** 等宽栈 `SFMono-Regular, Consolas, Liberation Mono, PingFang SC, monospace`
**Label/Mono Font:** 与 Body 同栈

**Character:** 正文、按钮、数字、图例、面板标题全部使用同一套等宽字体，连界面本身都像是从地牢里打出来的字；只有大标题与结算文案换成自托管的汉字衬线「Delve Display」，让页面像手稿上写下的一个名字。等宽让生命、金币、回合、坐标天然对齐，界面因此安静。

### Hierarchy
- **Display**（600，38px，行高 1，字距 0.06em）：只有一个，作品名「余烬地牢.」；手机 30px。句末的「.」用琥珀色。
- **Headline**（500，32px，行高 1.2）：结算弹层的主句（「天，终于亮了。」/「灯火暂时熄灭。」）；手机 25px。与 Display 同字体。
- **Title**（500，15px，行高 1.4）：侧栏区块标题（旅途手记、行脚商人）与游戏内 h2；手机 13px。
- **Body**（400，12px，行高 1.9）：界面绝大部分文字——说明、图例、手记、按钮标签、页脚。这是本作唯一的工作字号。
- **Label**（700，15px，字距 0.18em）：顶部字标「ASCII DELVE_」，全大写宽字距，末尾光标 `_` 为琥珀色。

### Named Rules
**The One Alphabet Rule. 「同一种字母」** 地牢里的字符和界面上的文字必须来自同一套等宽字体。不要把界面换成无衬线 UI 字体——那会让界面和地牢分属两个世界。

**The Single Working Size Rule. 「只有一个工作字号」** 界面正文固定 12px，层级靠颜色与位置拉开，不靠字号堆叠。只有标题、数字与结算允许跳出这一档。

## Layout

桌面是两列网格：地图占 `minmax(0,1fr)`，右侧旅人栏固定 276px，列间距 30px（`main` 上限 1500px，左右内边距 5%）。地图本身是「地图条 + 画布 + 页脚 + 图例 + 控制」的垂直堆叠，画布高度 `clamp(370px,36vw,510px)`，因此地图稳定占据首屏约三分之二。地图条、画布、页脚共享同一条 1px 石线描边并各自带 6px 圆角，拼成一个连续的边框体。

画布内部是固定字符网格，不随窗口任意缩放：桌面视野 31×23 格，窄于 450px 时 19×17 格，切到全景图时铺满整层。画布 backing store 按 DPR（上限 2）换算，字符尺寸由格子宽高实时推导。

响应式：
- **≤1400px**：画布锁定 510px 高。
- **≤1050px**：右栏收窄到 220px，隐藏控制提示文案，内边距减到 4%。
- **≤740px**：整体改为单列 flex。地图在最上，侧栏在下方排成两列网格，商人区块与存档信息跨整行。控制区居中，方向键放大到 42px。地图条变为 `position:sticky` 吸顶，隐藏回合数、改在条内显示移动端生命读数（见 Components 的 Mobile Health）。
- **≤380px**：隐藏字标，页脚改为纵向。

## Elevation & Depth

**没有阴影。** 全部深度由明度层级与「迷雾」产生：页面底 #171d1b 之上浮着面板 #1c2420，面板里再挖出地图底 #111814。层次关系不是靠投影，而是靠「谁比谁亮一档」。

地图内部的深度由三档可见性表达：未探索区域是 #263129 的稀疏点阵，已探索但不在视野内是 #576348 的暗字，视野内才回到纸白与语义色，并且可行走区域会覆一层极淡的绿色高光（#a7c18e06）。迷雾，而不是阴影，才是这个世界表现「远近」的方式。

唯一近似「抬起」的效果是结算弹层：它以 `#111814f2` 的半透明地图底覆盖在地图画布上，用透明度而不是投影把内容推到最前。

### Named Rules
**The Fog-Not-Shadow Rule. 「用迷雾造深，不用阴影」** 不得引入 `box-shadow` 或渐变阴影。需要强调层级时，用明度更高的面板、用描边、或用迷雾透明度——阴影一旦出现，这个世界就不再是「黑暗中提灯」，而是「打了光的 UI」。

**The Two-Step Surface Rule. 「面板只亮一档」** 面板底色只比页面底亮一档（#171d1b → #1c2420），再深一档就是地图洞（#111814）。不要造出中间灰。

## Shapes

形状语言是「印刷体」：控件 3px 圆角，面板 6px，几乎等于直角，靠 1px 石线描边定义边界而不是靠圆角。地图容器由地图条（上圆角 6px）、画布（无左右描边重复）、页脚（下圆角 6px）三段拼合，形成一个上下圆角的「窗口」。方向键是严格的 3×3 方格拼贴，按键本身 3px 圆角、3px 间隙。生命条是 6px 高的直角横槽。整体没有圆形、没有胶囊形——圆只出现在字符本身（如 `@`、`&`）。

### Named Rules
**The Printed-Corner Rule. 「印刷角」** 圆角只允许 3px（控件）与 6px（面板）两档。看到更大的圆角，说明有人把别处的界面语言搬了进来。

## Components

### Buttons
- **Shape:** 3px 圆角、1px 石线描边、min-height 42px、内边距 9px 13px。
- **Default（幽灵按钮）:** 透明底、纸白字、石线描边；用于页头（操作指南、新旅程）、结算、帮助、商店行项。
- **Hover / Focus:** 悬停底变 #2b352c、描边转为灰墨；`focus-visible` 为 2px 琥珀轮廓、偏移 4px（画布因描边重叠用 -4px）。
- **Primary（点燃灯火）:** 琥珀实底、地牢底字色、同 3px 圆角；悬停底色 #eed098。整页只有「开始新旅程 / 再次点灯」这类推进主线的动作使用它。
- **Disabled:** 不透明度 0.4，光标不变手形；回合未就绪或资源不足（无药水、无震荡次数）时使用。

### 方向键方向盘（Direction Pad）
- **Style:** 3×3 网格，格 38×33px、间隙 3px，透明底、纸白字、17px 箭头字符；中心「·」为琥珀色（等待一回合）。
- **State:** 与其它操作按钮共用 42px 触控目标规则；手机放大到 42×42px。

### 行动按钮（Action Buttons）
- **Style:** 纵向列，min-height 32px（手机 44px），左对齐，每行是「按键提示 + 文字 + 数量」三段：`kbd` 用琥珀色 11px，数量右浮。
- **Purpose:** H 饮用药水、F 灯焰震荡、E 交互 / 下潜。数量用同一等宽字体，靠等宽天然对齐。

### Map Bar / Map Footer（地图条与页脚）
- **Bar:** 灯雾面底、上下石线、上圆角 6px；左侧是苔绿 5px 存活点 + 楼层名，右侧是回合数（等宽、`tabular-nums`）；桌面动态注入一个「地图 M」视图切换按钮。
- **Footer:** 灯雾面底、下圆角 6px；左侧是当前目标句（会随钥匙状态改写），右侧是探索百分比。
- **Mobile Health（≤740px）:** 地图条变吸顶并隐藏回合数，改显示紧凑生命读数——「生命 38 / 38」一行加一条 4px 高的苔绿进度条。它与侧栏的完整生命条同源同色，是移动端在滚动时仍能看见生命的唯一手段。

### 面板 / 容器（Panels）
- **Corner Style:** 6px 圆角。
- **Background:** 灯雾面 #1c2420（帮助区、新旅程表单、地图条与页脚）或地牢底 #111814（画布、输入框）。
- **Border:** 一律 1px 石线，不加阴影。
- **Internal Padding:** 面板 13px 18px，内容区 22–28px。

### 旅人状态栏（Traveler）
- **Style:** 区块标题带回退层级的灰墨「LV. 01」；生命标签行、6px 生命横槽（苔绿填充，低于 30% 转余烬珊瑚，`transform:scaleX` 以 180ms 过渡）、三格数字（攻击 / 护甲 / 金币，21px 等宽 `tabular-nums`），再接装备定义表。
- **Journal:** 旅途手记是倒序的无序列表，每条前置一个琥珀色的「.」假项目符号，最新一条为纸白、其余为灰墨，可滚动（桌面 255px / 手机 290px）。

### 行脚商人（Shop）与 新旅程表单（New Run）
- **Shop:** 只在踏进商人视野时出现，标题琥珀色，每行按钮左右两端分别是「物品名」与「价格（琥珀）」。
- **New Run:** 灯雾面面板，含说明句、职业下拉、种子输入、随机种子、主按钮「点燃灯火」与取消。种子的输入底色是地牢底、光标为琥珀色。

### 结算弹层（Run Ending）
- **Style:** 绝对覆盖画布，底 `#111814f2`；顶部一个 56px 的琥珀字符（胜利为 `*`、失败为 `@`），下接 Delve Display 的标题句与一段灰墨小结，最后是主按钮「再次点灯」与幽灵按钮「换个世界」。

### 图例（Legend）
- **Style:** 一行可换行的字符说明，每项是「语义色字符 + 灰墨标签」，12px；是玩家理解字符墨的入口，因此字符必须与画布渲染同色。

### Named Rules
**The Reachable-Thumb Rule. 「移动端拇指可达」** 手机下方向盘与行动按钮居中排在内容下方、方向键放大到 42px、行动按钮 44px；地图条吸顶并带移动端生命读数。任何重排都不得让操作落出屏幕。

**The No-Synthetic-Marks Rule. 「不用合成图标」** 界面里的所有标记（箭头、生命点、图例符号、等待点）都必须是等宽字体里的真实字符，或纯 CSS 几何。不要引入 SVG 图标、图标字体或图片符号——那会立刻把这个世界从「字符世界」拉回普通 UI。

## Do's and Don'ts

### Do:
- **Do** 让琥珀色保持稀有：一屏通常不超过三处（例如玩家、主按钮、一个关键数字）。
- **Do** 把每个新交互字符绑定到一个明确颜色，并让画布渲染与图例使用同一个值。
- **Do** 把界面正文锁在 12px 等宽，靠颜色、位置、明度拉开层级。
- **Do** 用面板明度（#171d1b → #1c2420 → #111814）和 1px 石线表达层级与分组。
- **Do** 用迷雾三档（未视 / 暗底 / 视野）表达地图远近；用 `transform:scaleX` 表达生命变化。
- **Do** 保留动效的降级路径：`prefers-reduced-motion` 下停掉全部过渡与动画。

### Don't:
- **Don't** 引入 `box-shadow`、投影或渐变阴影来表达层级。
- **Don't** 把琥珀色铺成大面积底色或整块区域。
- **Don't** 使用纯黑 #000 作底；炭绿灰 #171d1b 才是这个世界的黑。
- **Don't** 使用大于 6px 的圆角，或引入胶囊形、圆形控件。
- **Don't** 为地图添加无字符语义的装饰色或装饰图形。
- **Don't** 用 SVG 图标 / 图标字体替代等宽字符标记。
- **Don't** 把界面换成无衬线 UI 字体；界面与地牢必须共用同一套等宽字母。
