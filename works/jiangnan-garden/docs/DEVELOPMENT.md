# 烟雨江南：游园与开发

## 运行

开发需要 Node.js 22+，在仓库根目录运行 `npm ci`。作品使用仓库已有的 Three.js 与 esbuild，不加载外部 CDN；离线成品内联授权贴图、HDRI 和模型，在线成品从同源加载并按观察距离补充细节。

`npm run dev --workspace @windplay/jiangnan-garden` 启动预览；通过 `PORT` 指定端口。`npm run build --workspace @windplay/jiangnan-garden` 输出 dist/index.html 与 tracked demo/index.html，代码、样式、Three.js、贴图、HDRI 与模型内联。当前离线成品 44.18 MiB；同时输出同源在线目录 dist/web，入口 10,785 B、首批资源 11.18 MiB。首次打开需要解压几何并上传贴图，载入耗时取决于设备。根构建按 windplay.webOutput 将在线目录组装进 _site，公开路径保持；部署 _site，离线 demo 可用 file:// 打开。体积、加载策略和测量限制见 [PERFORMANCE.md](PERFORMANCE.md)。

需要支持 WebGL 2、启用硬件加速的现代 Chrome、Edge、Firefox 或 Safari。较慢的设备可使用“流畅画质”，关闭屏幕空间环境遮蔽和泛光并降低像素比与阴影分辨率。精细模式首次载入需生成纹理并编译多种材质，实际载入时间随设备、材质编译缓存和画质而变，较慢设备可能更久。画面品质依赖设备；当前采用浏览器实时光栅化、实拍 PBR 与真实植物及家具几何；质量验收结论单独记录在 [QUALITY.md](QUALITY.md)。

## 游园

- 默认环绕视角：拖动旋转，滚轮缩放，右键拖动平移；触屏单指旋转，双指缩放。
- 入园漫游：WASD / 方向键移动，拖动画面转头；Shift 加快，Esc 返回环绕。
- “移步换景”可进入待客堂屋、听雨书房、疏影卧房、池畔曲廊。
- 隔扇之间留有贯通通道，可从庭院依次进入三间。墙体、柱子、主要家具和池塘阻挡移动。
- 日景、夜景和时辰滑杆连续调整背景天空、日光位置和颜色、环境光、轻雾、室内灯笼与水面光照。
- “揭顶看木构”隐藏主堂瓦面、椽子和山墙，展示承担屋架的柱、梁、檩；进入室内时恢复屋顶。

## 建筑与陈设

主堂三开间，净高超过 3 m。12 根柱以四条横向轴线、三道进深轴线组成木构架；柱承梁，梁上架檩，椽子沿屋坡支承瓦面。露明构件为实际建筑几何，门窗与隔断依附构架。各坡铺设独立弧形瓦；主屋瓦带确定性的小幅位置、倾斜与尺寸变化，跨行连续斑块与檐缘衰减表达风化和受湿色差。前檐隔扇部分敞开，后窗为木棂与纸面。

主要木椅与宽度至少 1 m 的桌案使用 CC0 Chinese Armchair / Chinese Tea Table 的完整几何和 2K PBR 材质；木椅等比缩放，桌案按目标尺寸缩放。其余较小的程序桌面由三块真实拼板组成，板缝为窄缝，中央板有轻微高差。堂屋有条案、方桌、授权木椅、屏风、香几、香炉和挂画。书房有书案、书橱、分层书册、笔墨纸砚、笔筒、花几和琴几。卧房有架子床、不透明原色麻布床帘、软矩形枕、闭合蓝亚麻被褥与屏风。照明使用木架纸灯笼和石灯，不放置现代灯具。

园林沿池岸经营，主堂偏置，东、南两侧曲廊围池，植被与太湖石不作对称排列。乔木采用 CC0 Tree Small 02 模型；四种 Fern 02 蕨类以四个 InstancedMesh 组成连续林下与池岸地被，四株约 3.5–4.2 m 的中层小树与 CC0 Shrub 04 的 1K PBR 灌木实例连接蕨床和树冠，另配竹丛、藤本、荷叶与苔藓。石板采用实际磨圆的 RoundedBoxGeometry，按起伏地表高度摆放并带轻微倾斜。地面起伏、植物基底与室外漫游眼高使用同一个 terrainHeight。库中乔木不误标为中国本土树种。

## 材质和渲染

木构采用 Rough Wood，其余程序陈设木件采用 Wood Table 001；主要家具保留完整模型的 2K PBR 贴图；风化粉墙、湖石、铺地石、树皮和亚麻采用 Poly Haven 的 1K CC0 实拍 PBR 颜色、OpenGL 法线和粗糙度贴图。粉墙施加石灰洗白色校正；枕与床帘保留扫描织纹法线和粗糙度并重染原色，被褥使用独立蓝亚麻材质。床帘为不透明麻布，写入深度并投射阴影，避免透明排序；不宣称透明纱帘。帘形由 src/cloth.js 的简化 Verlet 模拟计算：边、斜向与弱弯曲距离约束结合重力、顶部悬挂及压缩束带，完成 240 步松弛后按尺寸与侧向缓存；furnishings.js 将结果转成静态网格，再加缝边与悬挂环。被褥由同文件的 settleQuilt 使用重力、床垫/床架接触与横向摩擦、双向剪切与弯曲距离约束完成 260 步松弛，床垫接触面有最大 .115 m 的局部隆起，再做 6 遍邻域平滑以表达填棉，furnishings.js 将上下层与边缘闭合。枕头缝边与枕体保持同一旋转。这些结果现在于构建时计算并以完全相同的 Float32 顶点随成品交付；不是运行时首次迭代或逐帧布料模拟。砖地、瓦面、曲廊风化木板与森林地表也使用实拍 PBR 扫描。陶瓷、纸与部分丝织物使用源码生成的 1024px 颜色、凹凸和粗糙度纹理。贴图原文件及下载地址、作者、授权、SHA-256 记录在 assets/textures/sources.json 与 assets/sources-rebuild.json；授权说明见 [ASSETS.md](ASSETS.md)。

静态木构与家具按材质合批绘制，屋顶保持独立分组，原构架和碰撞数据保留。方形长木件的 UV 沿最长轴排布；圆柱侧面按周长和长度连续映射，端面单独处理年轮；曲线扶手按管半径和曲线长度排布。材质着色器叠加位置相关磨损、木纹明度与粗糙度变化，程序陈设木件粗糙度范围限制在 .60–.94；不同木材和粉墙着色器使用独立编译缓存标识，保持各自纹理尺度与饰面；釉陶瓷设 roughness=.22、clearcoat=.94、clearcoatRoughness=.10、ior=1.48，以区分木件和釉面。

PBR 材质使用 metallic-roughness 工作流，非金属材质的 metalness 为 0。环境由 Lythwood Terrace 阴天实拍 HDRI 生成 PMREM，配合方向光柔化阴影、三个室内灯笼的缓存阴影、按材质合批的静态木构与家具、前檐开口面光源的间接光近似、SSAO、克制泛光与 ACES 色调映射。水面实时反射场景；湿石与湿木降低粗糙度。细雨、檐口滴水、扩散涟漪、低位水汽在日夜均保留。

这是基于宋明江南生活和木构逻辑的原创组合场景，并非某座历史园林的考古测绘复原。

## 渲染证据

当前加载优化的前后截图、复核范围和测量见 [PERFORMANCE.md](PERFORMANCE.md)。下面第七轮记录为已接受的历史画面基线，优化保留该方向及其既有画质差距。

第七轮截图在最终授权家具与灌木、被褥接触及横向摩擦、填棉平滑、材质缓存、地形和瓦面实现构建后拍摄并逐张打开复核。它们涵盖日景、夜景、揭顶、堂屋、书房、卧房、床具近景、堂屋夜景、手机、810px 环绕视图与默认 1280px 视图，记录当前成品的材料、结构和布局；画面品质结论另见 [QUALITY.md](QUALITY.md)。

- [卧房](../../../.impeccable/review/new-games/garden-bedroom-seventh.jpg)与[床具近景](../../../.impeccable/review/new-games/garden-bed-close-seventh.jpg)：浅色床帘不透视后方，悬挂环、束带与垂落边缘可见；蓝色亚麻被褥覆盖床垫并保留封闭边缘，浅色枕为独立体积。截图记录当前形状和表面；重力、接触、横向摩擦及填棉平滑的具体约束以 src/cloth.js 为准。
- [堂屋](../../../.impeccable/review/new-games/garden-hall-seventh.jpg)、[书房](../../../.impeccable/review/new-games/garden-study-seventh.jpg)与[堂屋夜景](../../../.impeccable/review/new-games/garden-hall-night-seventh.jpg)：Chinese Armchair / Chinese Tea Table 的模型轮廓、木纹与桌面接合可见，陶瓷保留釉面高光，木构纹理沿构件长度延续；夜景灯笼改变室内照明，格扇阴影落在墙面。
- [庭院日景](../../../.impeccable/review/new-games/garden-day-seventh.jpg)、[庭院夜景](../../../.impeccable/review/new-games/garden-night-seventh.jpg)与[揭顶](../../../.impeccable/review/new-games/garden-roof-seventh.jpg)：乔木、中层小树、灌木与蕨床共同构成池岸层次，石路穿过植被；瓦面保留乘色差异，揭顶露出主堂柱、梁、檩承托层次，夜景保留庭院灯光和水面响应。
- [手机 390×844](../../../.impeccable/review/new-games/garden-mobile-seventh.jpg)、[810×1082 环绕视图](../../../.impeccable/review/new-games/garden-user-810-seventh.jpg)与[默认 1280×720](../../../.impeccable/review/new-games/garden-default-1280-seventh.jpg)：竖屏使用较高的庭院视角，庭院边界和操作条仍可见；810px 图的环绕模式处于选中状态。
- [启动台封面 1280×800](../../../assets/screenshots/new-games/jiangnan-garden.jpg)：同一第七轮构建的普通页面浏览器截图，包含游园界面。

这些截图不证明某一植物的本土身份、历史建筑考古准确性或电影级写实。

## 源码

- src/world.cjs：坐标、主要空间、阻挡、动线、起伏地表与日夜参数。
- src/materials.js：实拍 PBR、磨损与湿润响应、逐叶纹理。
- src/offline-gltf.js：内联或同源几何 gzip 解压、Meshopt 解码、GLTFLoader 解析和临时 URL 释放。
- src/texture-streaming.js：512px 预览纹理登记、原分辨率纹理延后升级和状态保留。
- src/tree-instances.js：共享树网格、GPU 弯曲与一致的深度/距离阴影。
- src/flora-models.js：真实乔木整体弯曲、四种蕨类和 Shrub 04 的实例化与提交。
- src/furniture-models.js：完整授权椅与桌模型的物理材质、尺寸适配和放置。
- src/furnishings.js：授权家具放置、其余三块拼板小桌、书册装订、铜香炉、茶碗与砚池、带缝边的闭合床褥和模拟床帘网格。
- src/cloth.js：重力 Verlet、距离弹簧、悬挂与束带约束、被褥接触/横向摩擦/双向剪切/弯曲约束、填棉平滑及静态结果缓存。
- src/architecture.js：主堂木构、瓦面、隔扇、陈设与曲廊。
- src/render-batches.js：保留源构架与揭顶分组，合并静态绘制并保留纹理尺寸。
- src/landscape.js：池岸、山石、植物、水面和安静动态。
- src/app.js：Three.js 渲染、相机、漫游和操作。

乔木与蕨类离线处理由 scripts/prepare-flora.mjs 完成；量化成果及原始材质贴图已跟踪。木椅、桌案与灌木保留完整原始 model.bin、拓扑、UV 和原始 glTF 元数据，仅改写本地 URI 与 provenance。构建时生成 Meshopt + gzip 几何和 quality 90 WebP 派生贴图：离线内联，在线同源拆分。完整近景拓扑、位置与 UV 保留，法线有 12-bit 编码损失，远景乔木另用受限误差版本。运行时优先用 DecompressionStream 解压，缺少原生支持时使用 fflate 回退；正常构建与 file:// 成品不需外部下载。原始素材保持，具体取舍见 [PERFORMANCE.md](PERFORMANCE.md)。处理流程及源缓存说明见 [ASSETS.md](ASSETS.md)。

测试检查房间入口、连续通道、墙体和水岸阻挡、日夜参数连续性、授权模型完整几何/UV/材质、木材与粉墙着色器缓存区别、demo 新鲜度及离线依赖。

## 启动台预览

`demo/index.html?preview=1` 隐藏操作界面，只从同一份场景源码绘制初始画面，不启动持续动画或模拟；页面缩放时重新绘制。当前首页缩略图是含游园界面的普通页面浏览器截图，保存到 assets/screenshots/new-games，不嵌入活动场景；preview 模式仍可用于无界面的场景截图。此模式不能替代正常页面的交互验收。
