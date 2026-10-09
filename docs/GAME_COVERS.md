# 游戏封面维护

城市疾跑与临界行动使用代码绘制的低多边形 SVG 封面，延续原版的配色与游戏场景，不使用 AI 图片生成。封面为场景插画；真实游玩截图保存在 `assets/screenshots/metro-rush.jpg` 和 `assets/screenshots/strike-arena.jpg`。

## 源资产与启动台

- 城市疾跑：`works/metro-rush/assets/preview.svg` → `assets/metro-rush-preview.svg`。
- 临界行动：`works/strike-arena/assets/preview.svg` → `assets/strike-arena-preview.svg`。
- 两图均为 1600 × 900，16:9。源资产与启动台副本内容相同。

## 调整范围

城市疾跑保留原城市背景、夕阳、金币和跑者。轨道、枕木、支架与列车使用同一个透视投影；车头保持竖直，侧窗沿车厢侧面排列，车身色带在转角处连续，车轮与阴影落在右侧轨道上。相关 SVG 分组为 `tracks`、`gantries` 和 `train`。

临界行动使用作品自身的工业园和持枪模型重新投影，并调整取景，使仓库、集装箱与掩体形成清楚的通道。建筑先进行可见面筛选与近面裁剪，再按深度绘制，避免超大多边形穿过画面。前景枪械与双手一起变换，准星支架与枪管连接。相关 SVG 分组为 `industrial-yard` 和 `first-person-rifle`。

两图不内嵌标题、按钮、说明或游戏 HUD，使网页标题与底部说明各显示一次。可访问性标题和描述保留在 SVG 的 `title` / `desc` 元素中。

首页作品目录中的两款卡片使用 16:9 比例、`object-fit: contain`，不额外放大或平移 SVG 封面。首屏悬浮画廊另用全部 10 个作品的真实界面截图，使访客能够预览实际游玩与交互画面。

修改作品内的 SVG 后同步根目录副本，运行 `npm run build`，并检查桌面及 320/390px 手机布局。除外框裁切外，也需检查车窗、车身、准星和手部在插画内部的接缝及遮挡。

## 真实截图与 README

首屏画廊与 README 的作品预览使用以下截图。截图来自作品本身，不以封面插画替代实际界面。

| 作品 | 截图 |
| --- | --- |
| 折光之径 | `assets/screenshots/prism-path.jpg` |
| 余烬地牢 | `assets/screenshots/ascii-delve.jpg` |
| 听风花园 | `assets/screenshots/wind-garden.jpg` |
| 影子工坊 | `assets/screenshots/shadow-atelier.jpg` |
| 城市疾跑 | `assets/screenshots/metro-rush.jpg` |
| 临界行动 | `assets/screenshots/strike-arena.jpg` |
| 方块旷野 | `assets/screenshots/voxel-frontier.png` |
| 余烬荒野 | `assets/screenshots/ember-wilds.png` |
| 点云照片 | `assets/screenshots/point-cloud-studio.png` |
| 超级马里奥 | `assets/screenshots/mario-world.png` |

启动台截图保存在 `assets/screenshots/launcher.jpg`，手机端保存在 `assets/screenshots/launcher-mobile.jpg`。
首页布局变化时同步刷新这两张图片；作品界面变化时刷新对应截图，并确认 README 的图片链接与作品入口一致。
