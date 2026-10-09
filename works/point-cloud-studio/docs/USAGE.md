# 点云照片

将照片转换为保留原图颜色的圆点人像与三维点云。支持只含点云画面的独立 HTML 导出。

本文件用于了解界面参数和嵌入方式；项目运行与构建请参阅根目录 README。下文测试成品位于 `dist/`，开发源码位于 `src/`。

## 直接使用

1. 双击 `dist/index.html`，用 Chrome、Edge、Firefox 或 Safari 打开。
2. 页面内置新的彩色演示人像，默认保留照片颜色、开启三维点云和鼠标扰动，无须安装依赖、启动服务或联网。
3. 点击“打开本地照片”或把照片直接拖到画面上，调整点距、圆点大小和明暗。
4. 画面底部的“2D 点阵 / 3D 点云”切换显示方式；调整“立体纵深”（默认 0.10），拖拽人像旋转，滚轮缩放，“复位视角”恢复默认视角。画面右上角实时显示当前角度与缩放。
5. 点击“导出点云 HTML”，得到只有点云画面和交互的单文件 HTML，保留当前纵深、颜色和拖拽后的视角。用浏览器直接打开即可展示。
6. 也可导出二维交互 SVG，或当前视角的 PNG。PNG 的长边为 1600 像素。

文件预览器可能不执行 JavaScript。遇到这种情况，先下载 HTML，再在浏览器中打开。

照片在浏览器本机处理，不发送到服务器。“鼠标扰动”仅控制生成器里的预览；导出的 HTML 和 SVG 默认都包含独立运行的扰动脚本。PNG 为静态图片。

## 布局与明暗主题

桌面端采用两栏布局：左侧是随窗口高度调整的大画面，右侧是按“照片、点阵、三维、配色、导出”编号排列的参数面板。窄屏先显示画面，再排列参数；左上角可返回 WindPlay 启动台。

右上角“亮色 / 暗色”切换界面主题，浏览器允许本地存储时会记住选择。主题只改变界面外观，画面始终是深色“暗房”：点阵用照片自身的亮度控制圆点大小，只有深色背景才能正确还原人像，白底会让明暗反转、颜色发灰。

“保留照片颜色”默认勾选。每个网格采样原图 RGB，HTML、SVG、PNG 均保留这些颜色；明暗参数控制圆点大小，不会给原图颜色套用主题色。取消勾选后可使用“单色”颜色选择器。单色和背景颜色可以手动修改，切换主题不会覆盖；“恢复默认”回到深色背景与默认单色，不会关闭照片颜色模式。

## 独立 HTML 与三维效果

`dist/index.html` 是用来换图、调参和导出的生成器；`test-point-cloud.html` 是已生成的点云成品。成品页面只显示点云，没有上传入口、参数面板、导出按钮或可见文字。

导出的 HTML 内嵌点坐标、圆点半径、颜色和运行代码，不包含原始照片，不依赖旁边的 JavaScript 文件或 CDN。重新选择照片生成后，导出的是当前点云，不是固定示例。

| 操作 | 效果 |
| --- | --- |
| 移动鼠标 | 局部圆点避让，并产生轻微视差 |
| 移开鼠标 | 扰动回位，视差恢复，保留拖拽选择的角度 |
| 按住鼠标拖动 / 单指拖动 | 旋转三维点云，上下拖动方向已调整为跟随指针 |
| 滚轮 | 缩放，范围 0.55～2.5 倍 |
| 双击 | 回到该文件的初始视角 |
| 聚焦画布后使用方向键 | 调整旋转角度 |
| `+` / `-` / `Home` | 放大、缩小、复位 |

“启用三维点云”默认勾选；关闭后可导出平面的 HTML 点阵。HTML 保留所选模式，SVG 始终输出二维圆点及鼠标扰动。三维模式下 PNG 保存当前选定视角，避免把鼠标临时扰动烘焙进去。

这里的三维是由照片亮度、曲面隆起和少量厚度变化生成的艺术化浮雕纵深。每个点有实际的 X、Y、Z 数值，并经过旋转、透视投影和深度排序；Z 不是实测场景深度，因此不用于三维测量或人脸几何重建。

## 如何打开带扰动的 SVG

下载 `test-portrait.svg`，右键选择“打开方式”→ Chrome、Edge、Firefox 或 Safari，然后将鼠标移到人像上。SVG 内嵌完整的交互代码，不依赖旁边的 HTML、`halftone.js` 或网络服务。

在网页中嵌入这个文件时，使用文档嵌入方式：

```html
<object
  data="./test-portrait.svg"
  type="image/svg+xml"
  width="600"
  height="600"
  aria-label="带鼠标扰动的点阵人像"
  style="display:block;max-width:100%;aspect-ratio:1;height:auto">
  <a href="./test-portrait.svg">打开交互人像</a>
</object>
```

`<img src="...svg">`、CSS 背景图和许多聊天/文件预览器只会显示静态画面。SVG 在图片模式下禁用 JavaScript；直接打开或作为 `<object>` / `<iframe>` 文档嵌入时可以运行。这是浏览器的 SVG 加载规则，见 [MDN：SVG as an image](https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/SVG_as_an_image)。

程序动态执行 `container.innerHTML = svgText` 时，里面的脚本不会自动执行。此时请用 `Halftone.interact(container.querySelector('svg'), model)` 显式启动交互；下面的集成示例已包含这一步。

## 文件

| 文件 | 用途 |
| --- | --- |
| `dist/index.html` | 完整生成器；包含 HTML、CSS、JavaScript、示例照片和初始 SVG，可单独使用 |
| `test-point-cloud.html` | 已生成的三维点云成品，只有点云画面，默认带鼠标扰动、视差、拖拽旋转与缩放 |
| `halftone.js` | 可提取到自己项目中的生成算法，无第三方依赖 |
| `point-cloud.js` | 三维点坐标构造、投影、Canvas 交互与纯画面 HTML 导出，无第三方依赖 |
| `test-portrait.svg` | 已生成的彩色交互测试图，800 × 800，3786 个独立圆点，内嵌扰动脚本，无内嵌位图 |
| `test-portrait.png` | 同一张测试图的 1600 × 1600 PNG |
| `README.md` | 用法、参数和最小集成示例 |

## 实现原理

基础圆点效果通常称为“半色调网点 / Halftone”。它从二维照片采样；三维模块再为这些点构造展示用的 Z 坐标。整个流程无需 Three.js 或大模型。

1. Canvas 读取照片的 RGBA 像素。原始纵横比保持完整。
2. 将画面分为规则网格，计算透明度加权的平均 RGB 和亮度。透明像素不污染颜色；每个圆点记录自己的 `color`，亮度近似为 `0.2126R + 0.7152G + 0.0722B`。
3. 可选地使用第 5% 和第 95% 的亮度分位数拉开明暗，然后调整对比度和 Gamma。
4. 每个网格中心生成一个独立填色的 SVG `<circle>`；明亮区域的圆点更大，过暗区域不生成圆点。边缘轻微淡出。三维点在旋转和深度排序时携带各自颜色。

核心关系：

```js
const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
const radius = spacing * dotSize * (sourceColors ? Math.sqrt(tone) : tone);
// tone 是经过明暗调整、透明度和边缘衰减后的亮度。
// 彩色模式采用面积映射，让较暗的饱和颜色仍有足够的圆点面积。
```

可见结果是实际的 SVG 圆点，不是给原照片叠加一层网格。CSS 负责布局；JavaScript 负责读取照片并生成圆点。交互 SVG 内嵌同一套扰动函数，读取圆点自己的初始坐标，通过 `requestAnimationFrame` 更新鼠标附近的圆点；移开后平滑回位，稳定后停止逐帧更新。通过 SVG 屏幕变换矩阵定位鼠标，缩放或嵌入后仍能对准圆点。

生成可独立交互的 SVG 字符串：

```js
const svgText = Halftone.toSVG(model); // 默认自带鼠标扰动
// 将 svgText 保存为 .svg 文件，即可在浏览器中直接打开。
```

`Halftone.toSVG(model)` 默认生成带鼠标扰动的 SVG，生成器打开时也默认启用扰动。只有需要静态 SVG 时，才显式传入 `{ interactive: false }`。二维模式预览先挂载静态圆点，再调用 `Halftone.interact(...)` 启动交互；二维 PNG 使用静态 SVG 栅格化。

三维模式使用 `point-cloud.js`：先绕 X/Y 轴旋转点坐标，再做透视投影，按深度由远到近绘制。Canvas 只负责显示计算出的二维投影；透视和视差来自每个点自己的 Z 坐标，并非把整张图片做 CSS 倾斜。

```js
// model 由 Halftone.fromImage(img) 得到。
const scene = PointCloud.prepare(model, { threeD: true, depth: 0.1 });
const controller = PointCloud.mount(canvas, scene);

// 导出当前选择的三维视角；html 保存为文件后可独立运行。
const html = PointCloud.toHTML(model, {
  threeD: true,
  depth: 0.1,
  view: controller.getView()
});

// 组件卸载或换图时，清理事件与动画。
controller.destroy();
```

三维 API 的 `threeD` 和 `interactive` 默认都是 `true`，`depth` 默认为 `0.1`，范围 `0～1`。`interactive` 控制局部扰动与鼠标视差；拖拽旋转和缩放在三维模式下可用。`PointCloud.project(scene, view, size)` 是不依赖 DOM 的投影函数，可用于数值检查或生成静态视图。

## 参数怎么调

| 参数 | 默认值 | 调整后的表现 |
| --- | --- | --- |
| `width` | `800` | 输出长边；纵横比保持不变 |
| `spacing` | `9` | 越小越细腻，圆点数量越多 |
| `radius` | `0.52` | 最大半径与点距的比例；增大后亮部更饱满 |
| `contrast` | `1` | 增大后亮部更亮、暗部更暗 |
| `gamma` | `1` | 小于 1 保留更多暗部，大于 1 压暗中间调 |
| `threshold` | `0.06` | 增大后去除更多暗点，背景更干净 |
| `edgeFade` | `0.10` | 边缘衰减宽度占短边比例；设为 0 可关闭 |
| `autoLevels` | `true` | 根据照片亮度分布自动拉开明暗 |
| `invert` | `false` | 开启后，原照片暗处生成大点 |
| `sourceColors` | `true` | 保留每个网格的原图 RGB；设为 false 使用单色 |
| `foreground` | `#f4f3ef` | 单色模式的圆点颜色；旧模型缺少颜色时也用作回退值 |
| `background` | `#100f0b` | 背景颜色 |

三维“立体纵深”越大，旋转时前后分层越明显；设为 0 时，点都回到同一平面，但仍可旋转这个平面。关闭“三维点云”则切回二维点阵。

优先使用暗背景、有侧光和明显明暗层次的人像。生成器不包含人像抠图，普通亮背景也会生成圆点。要做白底黑点，先取消“保留照片颜色”，再将背景改为白色、单色改为黑色，并开启“反转照片明暗”。圆点使用区域平均颜色；点距和留白会影响整体观感，并非逐像素复制原照片。

## 最小集成示例

把以下页面与 `halftone.js` 放在同一目录。选择本地照片后，程序用 FileReader 转为数据 URL，避免直接读取本地路径照片时的 Canvas 跨域限制。

```html
<!doctype html>
<meta charset="utf-8">
<input type="file" id="photo" accept="image/*">
<div id="portrait" style="max-width:600px"></div>
<style>#portrait svg { display:block; width:100%; height:auto; }</style>
<script src="./halftone.js"></script>
<script>
let selection = 0;
let stopInteraction = null;
document.getElementById('photo').onchange = event => {
  const file = event.target.files[0];
  if (!file) return;
  const ticket = ++selection;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      if (ticket !== selection) return;
      try {
        const model = Halftone.fromImage(img, {
          width: 800,
          spacing: 9,
          radius: 0.52,
          sourceColors: true,
          foreground: '#f4f3ef',
          background: '#100f0b'
        });
        if (stopInteraction) stopInteraction();
        const container = document.getElementById('portrait');
        container.innerHTML = Halftone.toSVG(model, { interactive: false });
        stopInteraction = Halftone.interact(container.querySelector('svg'), model);
      } catch (error) { alert(error.message); }
    };
    img.onerror = () => alert('无法读取照片');
    img.src = reader.result;
  };
  reader.onerror = () => alert('文件读取失败');
  reader.readAsDataURL(file);
};
</script>
```

如果使用网络图片，图片服务器需要允许 CORS，并应在设置 `img.src` 前设置 `img.crossOrigin = 'anonymous'`。内置示例及本地选择照片的流程不依赖网络图片地址。

## 演示素材与验证

内置演示照片为本次生成的虚构成年人物彩色人像，已替换之前的参考站人像。页面底部的参考说明已移除。

已验证：RGBA 采样颜色、透明像素处理、SVG 逐点填色、三维排序后颜色对应、独立 HTML 实际绘制颜色、主题切换保留原图色、单色切换及旧模型兼容；同时保留默认扰动、拖拽方向、滚轮缩放、复位、HTML 视角与纵深导出、PNG 绘制及动画清理。检查通过模拟 DOM、Canvas 与动画帧执行，并检查静态点阵 PNG；未进行真实浏览器布局或交互自动化测试。

相关浏览器接口：[CanvasRenderingContext2D](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D)、[Pointer Capture](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture)。
