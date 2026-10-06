# 游戏封面维护

城市疾跑与临界行动使用最初的低多边形 SVG 封面，在原场景基础上微调。封面保持与作品视觉风格一致；真实游玩截图保存在 `assets/screenshots/metro-rush.jpg` 和 `assets/screenshots/strike-arena.jpg`。

## 源资产与启动台

- 城市疾跑：`works/metro-rush/assets/preview.svg` → `assets/metro-rush-preview.svg`。
- 临界行动：`works/strike-arena/assets/preview.svg` → `assets/strike-arena-preview.svg`。
- 两图均为 1600 × 900，16:9。源资产与启动台副本内容相同。

## 调整范围

城市疾跑保留城市、轨道、金币、列车和跑者，只微调列车接缝与摆放。临界行动保留原工业园与第一人称持枪矢量画面。两图清除内嵌标题、按钮、说明、准星和弹药等 UI，使网页标题与底部说明各显示一次。

首页两款卡片使用 16:9 比例、`object-fit: contain`，不额外放大或平移封面；画廊中的城市疾跑大图按图片原始比例展示。修改 SVG 后同步根目录副本，运行 `npm run build`，并检查桌面及 320/390px 手机布局。
