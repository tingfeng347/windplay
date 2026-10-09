# 字间飞行：操纵与开发

## 运行

开发需要 Node.js 22+，在仓库根目录运行 `npm ci`。作品使用原生 JavaScript、Canvas 2D 和 esbuild。`npm run dev --workspace @windplay/ascii-flight` 启动热构建预览；`PORT=4174` 可指定端口。

`npm run build --workspace @windplay/ascii-flight` 从 src 构建 dist/index.html 与 tracked demo/index.html。demo 内联所有代码、样式，可用 file:// 离线打开。支持现代 Chrome、Edge、Firefox、Safari，需要 Canvas 2D，不需要 WebGL。

## 操纵

- W 降低俯仰，S 增加俯仰，变化速率为 60°/s。
- A 左滚转，D 右滚转，变化速率为 60°/s。
- 俯仰与滚转都限于 ±45°；松杆保持角度，不自动回中。
- 偏航角速度 = 滚转角 / 45° × 90°/s，进行线性协调转弯。
- Z 加速，X 减速，变化速率为 10 m/s²；速度限制为 10–50 m/s。
- P / Esc 暂停或继续，R 重飞。
- 触屏按住底部操纵键；失焦、隐藏页面、取消触摸时释放所有输入并暂停。

## 内容

三条航线：沿街初航、街角转弯、低空巡游，另有自由飞行。穿过所有金色航门即可完成航线；楼房、树冠、地面发生碰撞后可重飞。航线最快用时保存在浏览器本地，存储不可用时仍可完整游玩。

## 显示

世界使用 CPU 射线和深度缓冲判断可见表面，最终只通过固定等宽网格的 ASCII 字符显示。canvas 只调用 2D 填字，没有 Three.js 或 WebGL。建筑以 # / H / = / - 表示墙面、窗格和屋面，树冠用 * / + / &，道路用 . 和中心线 =，草地用逗号，天空没有字符且纯黑。航门用 O / +，并参与深度遮挡。

## 验证

`npm run test --workspace @windplay/ascii-flight` 检查角度、角速率、速度限制、线性协调转弯、运动距离、扫掠碰撞、航门方向、确定性城市、航门位置、离线 demo 与源码一致性。

## 启动台预览

`demo/index.html?preview=1` 隐藏操作界面，只从同一份场景源码绘制初始画面，不启动持续动画或模拟；页面缩放时重新绘制。首页缩略图通过浏览器截取该模式的真实画面并保存到 assets/screenshots/new-games，不嵌入活动场景。此模式不能替代正常页面的交互验收。
