# 开发与运行

## 环境

Node.js 22 或更新版本。

```bash
npm ci
npm run dev
```

启动台地址：`http://localhost:4173`。单独开发作品：

```bash
npm run dev --workspace @windplay/point-cloud-studio
```

## 作品命令

| 作品 | 命令 |
| --- | --- |
| 折光之径 | `npm run dev:prism` |
| 余烬地牢 | `npm run dev:delve` |
| 听风花园 | `npm run dev:garden` |
| 影子工坊 | `npm run dev:shadow` |
| 城市疾跑 | `npm run dev:runner` |
| 临界行动 | `npm run dev:shooter` |
| 方块旷野 | `npm run dev:voxel` |
| 余烬荒野 | `npm run dev:survival` |
| 点云照片 | `npm run dev:point-cloud` |
| 超级马里奥 | `npm run dev:mario` |
| Tingfeng Reel（已隐藏） | `npm run dev:reel` |

## 构建与检查

```bash
npm run build
npm test
```

根级命令执行所有声明了对应脚本的 workspace。构建生成 `_site/`，包含启动台及各作品的成品。

每个作品的 `src/` 和原始素材是源码；`demo/index.html` 为受 Git 跟踪的单文件成品，
`dist/` 为忽略的构建输出。通过作品构建脚本更新成品。

## 离线体验与存档

根目录 `index.html` 和各作品 `demo/index.html` 可以直接通过文件协议打开。
入口使用相对路径，单文件成品不依赖开发服务。支持存档的作品将进度或记录存储在当前浏览器中。

## 首页展示

首页展示公开作品的缩略图、封面、介绍和入口。滚动展开画廊，指针移动带动屏幕倾斜；
动效可以暂停，系统开启“减少动态效果”时显示静态网格。

Tingfeng Reel 保留在 `works/tingfeng-reel/`，继续参与构建与测试，不在首页展示。

### 卡片跳转回归检查

卡片预览、标题、介绍与入口均属于同一个链接。滚动切换时，边缘露出的卡片也应可点击；
鼠标按下时不得因焦点改变而移动卡片。只有键盘焦点进入卡片时才自动居中。

使用真实浏览器检查：

1. 在作品区稍微滚动，让两张卡片同时可见，点击边缘卡片的预览，确认新标签页打开对应作品。
2. 检查卡片标题、介绍与入口的点击，并在暂停动效后重复检查。
3. 用 Tab 切换卡片，确认焦点卡片居中，按 Enter 打开对应作品。

根目录测试检查作品链接与文件存在；目前没有浏览器布局测试环境，无法覆盖 CSS 命中检测与
鼠标按下、焦点变化、鼠标松开之间的导航行为。这些交互需要按上述步骤在浏览器中复测。

## 部署

推送到 GitHub 的 `main` 分支会触发 GitHub Actions，将 `_site/` 部署至 GitHub Pages。

## 相关文档

- [新增作品](../CONTRIBUTING.md)
- [目录设计](STRUCTURE.md)
- [作品预览](PREVIEWS.md)
