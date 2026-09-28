# Point Cloud Studio

> WindPlay 作品：`works/point-cloud-studio`

把照片转换为保留原图颜色的圆点人像与交互三维点云。原生 HTML、CSS、JavaScript 实现；浏览器端没有第三方依赖，照片在本机处理。

## 立即体验

用浏览器打开 `demo/index.html`。它是提交到仓库的完整单文件生成器，可以直接双击并离线使用。
`npm run build` 会同时刷新该成品和 `dist/` 中的全部输出。

- `dist/test-point-cloud.html`：仅含点云画面的彩色三维演示，默认带鼠标扰动、拖拽旋转、滚轮缩放；无外框白线。
- `dist/test-portrait.svg`：彩色二维点阵，直接在浏览器打开时默认带鼠标扰动。
- `dist/test-portrait.png`：1600 × 1600 的静态测试图。

SVG 通过 `<img>` 或文件预览器查看时通常只显示静态效果。交互展示请在浏览器单独打开，或使用无边框的 `<object>` / `<iframe>`。

## 本地开发

需要 Node.js 22 或更新版本，以及 npm。建议使用 Node.js 24；本包在 Node.js 24.19.0 下验证。首次安装开发依赖需要联网，构建后使用页面不需要联网。

```bash
cd works/point-cloud-studio
npm ci
npm run dev
```

浏览器打开终端显示的 `http://localhost:5173`。修改 `src/` 或 `assets/` 后会自动重新构建，手动刷新页面查看结果；按 Ctrl+C 结束服务。开发服务仅监听本机。

```bash
npm run build
npm test
```

`npm run build` 从源码和示例照片重新生成 `dist/` 中的全部成品。`npm test` 先构建，再检查颜色采样、导出结构和交互逻辑。`sharp` 仅用于构建时读取照片、生成测试 PNG，不进入浏览器页面；版本已由 `package-lock.json` 锁定。

## 从哪里修改

| 路径 | 内容 |
| --- | --- |
| `src/index.html` | 编辑器页面结构与构建占位符 |
| `src/styles.css` | 画面加参数面板的两栏布局、响应式样式、亮暗主题 |
| `src/editor.js` | 上传与拖放照片、参数状态、2D/3D 切换、主题与导出按钮 |
| `src/halftone.js` | RGBA 采样、圆点模型、彩色 SVG 和二维扰动 |
| `src/point-cloud.js` | XYZ 构造、投影、Canvas 交互、PNG 快照和独立 HTML 导出 |
| `assets/sample-portrait.jpg` | 内置演示照片，可直接替换为自己的 JPG |
| `scripts/build.mjs` | 单文件打包与示例构建 |
| `scripts/dev.mjs` | 开发服务和文件变化监听 |
| `tests/` | 可移植的算法、导出和交互回归检查 |
| `docs/DEVELOPMENT.md` | 模块接口、数据流与后续开发说明 |
| `docs/USAGE.md` | 参数、嵌入方式与使用示例 |
| `CHANGELOG.md` | 作品变更记录 |
| `demo/index.html` | 提交到 Git、可以直接打开的完整单文件成品 |
| `dist/` | 已构建成品，可直接使用或放到静态网站服务 |

以 `src/` 为准修改，不要直接修改 `demo/` 或 `dist/`，下次构建会覆盖它们。`src/index.html` 是构建模板，不应直接双击运行。仓库排除 `dist/` 和 `node_modules/`，但会跟踪 `demo/index.html`，保证克隆后已有可直接体验的成品。

## 已有功能

- 保留每个采样区域的原始 RGB，可切换为单色。
- SVG 和独立 HTML 导出默认带鼠标扰动。
- 三维旋转、鼠标视差、缩放、复位和键盘操作；上下拖动方向跟随指针。
- 亮暗主题（画面保持深色）、右侧编号参数面板和手机适配。
- 导出只含画面和交互的单文件 HTML，以及交互 SVG、静态 PNG。
- 独立 HTML 画布的常态、焦点状态都没有边框、轮廓或阴影。

三维深度目前由亮度、中心曲面隆起和微小厚度变化生成，属于展示用浮雕效果，并非模型推理或真实人脸几何重建。

## 验证范围

已完成锁文件安装、完整构建、RGBA 颜色检查、三维排序检查和模拟 DOM/Canvas 的交互回归。检查覆盖独立 HTML 启动、扰动回位、拖拽方向、缩放、复位、主题、逐点颜色、SVG 与 PNG 导出、动画清理。未进行真实浏览器自动化测试。

演示照片是此前生成的虚构成年人物彩色人像。项目没有包含参考站的原照片或原站脚本。
