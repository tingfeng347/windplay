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

## 部署

推送到 GitHub 的 `main` 分支会触发 GitHub Actions，将 `_site/` 部署至 GitHub Pages。

## 相关文档

- [新增作品](../CONTRIBUTING.md)
- [目录设计](STRUCTURE.md)
- [作品预览](PREVIEWS.md)
