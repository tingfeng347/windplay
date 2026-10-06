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

首页两款卡片使用 16:9 比例、`object-fit: contain`，不额外放大或平移封面；画廊中的城市疾跑大图按图片原始比例展示。修改作品内的 SVG 后同步根目录副本，运行 `npm run build`，并检查桌面及 320/390px 手机布局。除外框裁切外，也需检查车窗、车身、准星和手部在插画内部的接缝及遮挡。
