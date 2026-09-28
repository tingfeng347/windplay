# 开发说明

## 数据流程

`Image → Halftone.fromImage → model → SVG / PointCloud.prepare → scene → PointCloud.mount / toHTML`

`editor.js` 负责界面状态；采样模块和三维模块保持独立。它们使用 UMD 导出，浏览器可访问 `window.Halftone`、`window.PointCloud`，Node.js 可以用 `require()` 载入。

## 圆点模型

```js
const model = {
  width: 800,
  height: 800,
  config: { /* Halftone.options(input) 的规范化参数 */ },
  dots: [
    { x: 120, y: 180, r: 3.2, luminance: 0.65, color: '#cb9074' }
  ]
};
```

`x/y/r` 单位为输出画布坐标；`luminance` 为原始平均亮度；`color` 是透明度加权的平均 RGB，使用六位十六进制颜色。明暗参数改变点大小，原色模式不直接改 RGB。

```js
const model = Halftone.fromImage(img, {
  width: 800, spacing: 9, radius: 0.52, sourceColors: true
});
const svg = Halftone.toSVG(model); // 默认带独立交互脚本
```

`Halftone.fromPixels(rgba, width, height, config)` 是纯采样入口。浏览器的 `fromImage` 通过 Canvas 取得 RGBA；构建脚本用 sharp 读取示例 JPG 后调用同一个入口。

## 三维场景

```js
const scene = PointCloud.prepare(model, {
  threeD: true,
  depth: 0.1,
  interactive: true,
  view: { yaw: 0.12, pitch: -0.04, zoom: 1 }
});
// scene.points 中每个元素为 [x, y, z, radius, '#rrggbb']
const controller = PointCloud.mount(canvas, scene);
const html = PointCloud.toHTML(model, { view: controller.getView() });
```

`project(scene, view, size)` 执行旋转、透视和深度排序，输出包含原索引和颜色的投影点。颜色必须随原索引保留，不能将排序后的点重新按顺序套用颜色。

`mount()` 管理交互与动画，返回 `getView()`、`reset()`、`snapshot(scale)` 和 `destroy()`。换图、切换模式或销毁组件时调用 `destroy()`，避免残留事件和动画帧。

下拖时俯仰角减小：`pitch -= deltaY * 0.006`。不要在重构时直接改成加号，否则会恢复之前的方向问题。

## 当前深度算法与扩展位置

`prepare()` 当前使用：

```js
z = ((light - 0.30) * 0.75 + dome * 0.22 + grain * 0.024)
    * depth * Math.max(width, height);
```

这是明暗驱动的浮雕深度。后续接入深度模型时，应在此处替换 Z 来源，并为每个圆点读取对应原图区域的预测深度。需要统一深度图与照片的裁剪、缩放、坐标和远近方向，再归一化到展示范围。

可采用下列扩展顺序；当前版本尚未实现这些功能：

1. 在 `dots` 增加可选 `depth`，先用离线深度图验证几何关系。
2. 在 `prepare()` 中优先读取有效的外部深度，缺失时回退到现有算法。
3. 最后增加深度图上传或模型推理。三维渲染与 HTML 导出可继续使用同一套 XYZ 接口。

## 导出边界

- HTML：只嵌入场景数据及 `mount/project` 运行代码，不含编辑器、原照片或网络依赖。
- SVG：每个圆点是真实 `<circle>`，默认嵌入二维扰动脚本。
- PNG：三维模式调用 `snapshot()` 保存选定视角；二维模式将静态 SVG 栅格化。

独立 HTML 的样式由 `point-cloud.js` 中的 `toHTML()` 生成，与编辑器的 `styles.css` 分开。画布所有焦点状态均设置 `border:0; outline:none; box-shadow:none`，去掉原先的外围白线。`tabindex` 和键盘监听仍保留。

如果嵌入其他页面，还需让宿主的 iframe 或 object 自身无边框，例如：

```html
<iframe
  src="./test-point-cloud.html"
  title="交互点云"
  style="display:block;width:100%;height:600px;border:0">
</iframe>
```

运行函数通过 `toString()` 被写入导出文件，因此 `project` 不应新增未封装的模块变量引用，`mount` 的投影器依赖需继续显式传入。序列化数据必须继续转义 `<`，嵌入模块中的脚本结束标签需采用拆分写法，避免提前结束生成器的外层脚本。

## 修改与验收

1. 修改 `src/`；换默认示例时替换 `assets/sample-portrait.jpg`。
2. 运行 `npm test`，确认构建产物和已有交互没有回归。
3. 浏览器手动检查深浅主题、照片上传、2D/3D 切换和导出文件。
4. 导出后单独打开 HTML/SVG，确认颜色、扰动、旋转视角以及无外框状态。

若修改默认采样值，还需同步 `src/index.html` 中的控件默认值；修改三维默认视角或深度时，也要同步 `editor.js` 的重置逻辑和相关断言。项目没有数据库、后端 API、模型推理服务或远程上传。
