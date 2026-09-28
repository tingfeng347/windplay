# Tingfeng Reel

> WindPlay 作品：`works/tingfeng-reel`

一段 28 秒、可循环的动态作品片头，根据 [github.com/tingfeng347](https://github.com/tingfeng347)
的公开资料和仓库 README 编排：编码 Agent（windcode）、身份卡、RAG 客服（zst_agent）、
Agent 编排（WindAgent）、VS Code 工作台（dsh-vscode-workbench）、repo2career、a2a_agent、
archtools，最后收在署名页。原生 HTML、Canvas、Web Audio 实现，浏览器端没有第三方依赖，
也不加载任何音频或视频文件。

## 立即体验

用浏览器打开 `demo/index.html`。它是提交到仓库的完整单文件成品，可以直接双击并离线播放。

## 操作

| 控件 | 快捷键 | 说明 |
| --- | --- | --- |
| 播放 / 暂停 | 空格、K | 画面完全由时间决定，暂停后可逐帧拖动 |
| 进度条 | ← / → | 拖动到任意时间；方向键跳到上一个 / 下一个场景 |
| 2D / 3D | D | 3D 时三层画布在空间中拉开纵深并跟随鼠标倾斜，点云、节点图、轨道切换为透视投影 |
| 声音 | M | 默认关闭；开启后实时合成配乐，画面改由音频时钟驱动以保持节拍同步 |
| 亮色 / 暗色 | T | 默认跟随系统，选择会记在本机浏览器 |
| 全屏 | F | |

地址参数便于截图和调试：`?t=9.6` 停在指定秒数，`&theme=light|dark`，`&dim=2d|3d`，
`&play=1` 从该时间继续播放。系统开启“减少动态效果”时默认停在身份卡画面，并关闭颗粒与错帧。

## 本地开发

需要 Node.js 22 或更新版本。本作品没有 npm 依赖。

```bash
cd works/tingfeng-reel
npm run dev
```

浏览器打开 `http://localhost:5174`。修改 `src/` 后自动重新构建，手动刷新查看结果。

```bash
npm run build
npm test
```

`npm run build` 把 `src/` 内联为 `dist/index.html` 与 `demo/index.html`。`npm test` 先构建，
再检查时间线、配乐编排、投影数学和成品完整性。

## 从哪里修改

| 路径 | 内容 |
| --- | --- |
| `src/timeline.js` | 场景表、打字区间、时间码、缓动与可复现随机数；画面和配乐共用 |
| `src/score.js` | 120 BPM 的 Am–F–C–G 循环、鼓组、转场音效，展开为排序事件表 |
| `src/models.js` | 正交 ⇄ 透视投影、“风”字点云生成、检索向量球、编排图 |
| `src/audio.js` | Web Audio 合成器：底鼓、拍手、踩镲、贝斯、垫层、琶音、钟声与转场音效 |
| `src/reel.js` | 各场景绘制、HUD、错帧效果、2D/3D 舞台与播放器 |
| `src/index.html`、`src/styles.css` | 页面骨架与播放器样式 |

改文案时，项目名称、描述和星标数都写在 `src/reel.js` 的对应场景与 `PROFILE` 中。

## 浏览器要求

需要支持 Canvas 2D、CSS 3D 变换和 Web Audio 的现代浏览器（Chrome、Edge、Safari、Firefox
近两年版本）。字体使用系统字体栈：macOS 与 Windows 自带的无衬线、衬线、等宽和中文字体即可正常显示。
