# 素材来源

| 贴图 | 作者 | 来源 | 授权 |
| --- | --- | --- | --- |
| Wood Table 001：颜色、法线、粗糙度，1K | Dimitrios Savva | [Poly Haven](https://polyhaven.com/a/wood_table_001) | CC0-1.0 |
| Rough Wood：颜色、法线、粗糙度，1K | Rob Tuytel | [Poly Haven](https://polyhaven.com/a/rough_wood) | CC0-1.0 |
| White Plaster Rough 02：颜色、法线、粗糙度，1K | Rob Tuytel | [Poly Haven](https://polyhaven.com/a/white_plaster_rough_02) | CC0-1.0 |
| Rock 3：颜色、法线、粗糙度，1K | Rob Tuytel | [Poly Haven](https://polyhaven.com/a/rock_3) | CC0-1.0 |
| Tree Bark 03：颜色、法线、粗糙度，1K | Rob Tuytel | [Poly Haven](https://polyhaven.com/a/tree_bark_03) | CC0-1.0 |
| Rough Linen：颜色、法线、粗糙度，1K | Rico Cilliers / colormass | [Poly Haven](https://polyhaven.com/a/rough_linen) | CC0-1.0 |
| Grey Roof Tiles：颜色、法线、粗糙度，1K | Rob Tuytel | [Poly Haven](https://polyhaven.com/a/grey_roof_tiles) | CC0-1.0 |
| Brick Floor 003：颜色、法线、粗糙度，1K | Dimitrios Savva / Rob Tuytel | [Poly Haven](https://polyhaven.com/a/brick_floor_003) | CC0-1.0 |
| Wood Planks Dirt：颜色、法线、粗糙度，1K | Rob Tuytel | [Poly Haven](https://polyhaven.com/a/wood_planks_dirt) | CC0-1.0 |
| Forest Floor：颜色、法线、粗糙度，1K | eye-candy.xyz | [Poly Haven](https://polyhaven.com/a/forest_floor) | CC0-1.0 |
| Tree Small 02：完整乔木几何与 1K 材质 | Rico Cilliers | [Poly Haven](https://polyhaven.com/a/tree_small_02) | CC0-1.0 |
| Fern 02：四株蕨类几何与 1K 材质 | Rico Cilliers / Rob Tuytel | [Poly Haven](https://polyhaven.com/a/fern_02) | CC0-1.0 |
| Chinese Armchair：完整木椅几何、原始 UV 与 2K PBR 材质 | Kirill Sannikov | [Poly Haven](https://polyhaven.com/a/chinese_armchair) | CC0-1.0 |
| Chinese Tea Table：完整桌案几何、原始 UV 与 2K PBR 材质 | Kirill Sannikov | [Poly Haven](https://polyhaven.com/a/chinese_tea_table) | CC0-1.0 |
| Shrub 04：完整灌木几何、原始 UV 与 1K PBR 材质 | Rico Cilliers | [Poly Haven](https://polyhaven.com/a/shrub_04) | CC0-1.0 |
| Lythwood Terrace：阴天 HDRI，1K | Greg Zaal | [Poly Haven](https://polyhaven.com/a/lythwood_terrace) | CC0-1.0 |
| 文徵明《松阴飞瀑图》，约1540年 | The Metropolitan Museum of Art，1982.1.6 | [馆藏条目](https://www.metmuseum.org/art/collection/search/45778) | Public Domain / Open Access |

使用授权纹理、HDRI 与模型源资产或其离线处理结果，未分发网站预览渲染图。纹理位于 assets/textures，模型及其贴图位于 assets/models，环境位于 assets/environment；精确下载地址、字节数和 SHA-256 分别记录在 assets/textures/sources.json 与 assets/sources-rebuild.json。粉墙洗白、纹理尺寸调整、原色床帘与枕的麻布重新染色在材质着色器中完成，扫描织纹法线和粗糙度保留；闭合被褥保留蓝亚麻扫描颜色。床帘是写入深度的不透明麻布，不描述为透明纱帘。

[Poly Haven 授权](https://polyhaven.com/license)允许使用、修改和再分发其 CC0 资产。其网站内容、预览图和标志具有独立版权，未随作品分发。

木构使用 Rough Wood，程序陈设木件使用 Wood Table 001；主要椅子与桌案使用 Chinese Armchair / Chinese Tea Table 的原始颜色、法线与 ARM（环境遮蔽/粗糙度/金属度）贴图；长木件按最长轴排列木纹，圆柱侧面按周长和长度连续映射，端面保留独立年轮处理。构件位置相关磨损、木纹明度与粗糙度变化由源码着色器产生；程序木件粗糙度下限为 .60，完整家具模型使用自己的 PBR 贴图与运行时物理材质。瓦材质在单块实拍瓦面内部采样，保留实体弧瓦；主屋瓦的位置、倾斜、尺寸差异以及跨行连续风化与檐缘受湿乘色由确定性源码生成；砖底座使用完整砖纹，逐块砖地使用单块面采样并重新染为灰青。曲廊木板与潮湿地表分别使用风化木板、森林地表扫描，湿润材质响应由场景设置。

## 模型处理与再现

当前植物使用真实乔木、蕨类与 Shrub 04 灌木模型，作品不分发或引用 AI 枝叶图集。乔木资产是库中所列的 Tree Small 02，不将它误标为某个中国本土树种；植物组合是原创造景，没有植物考古复原的含义。

assets/models 保存原始 glTF 元数据、处理后的 model.gltf/model.bin 与原始材质贴图。scripts/prepare-flora.mjs 使用 Three.js 附带的 MIT Meshoptimizer 简化几何，锁住叶片轮廓边界，并采用位置、法线、UV 的量化。源 2,062,487 个三角形保留为 1,334,988 个，四株蕨类保留全部 6,232 个。运行时各株乔木整体弯曲、改变比例和朝向；枝叶与阴影使用同一真实几何。四株蕨类组成四个 InstancedMesh，以改变位置、比例和朝向的实例连接林下与池岸，保留石路动线。四株约 3.5–4.2 m 的中层小树复用相同授权乔木模型，与 Shrub 04 的一个 InstancedMesh 连接蕨床及高树冠，不是新物种资产。起伏地表、真实磨圆石板摆放和植物基底高度由 world.terrainHeight 决定。

Chinese Armchair、Chinese Tea Table 与 Shrub 04 不减面、不量化改写拓扑；保留原始 model.bin、accessors、mesh、UV 与原始 glTF 元数据，仅改写本地 URI 和 provenance。运行时木椅等比缩放、桌案按目标宽高深缩放；家具物理材质保留原始贴图并设置法线、粗糙度、环境遮蔽和清漆响应。确切来源和哈希见 assets/sources-rebuild.json。

原始乔木与蕨类大几何缓存放在根目录 .cache/garden-models，未提交。重做处理时，下载以下 CC0 原始缓冲到该缓存，随后从仓库根目录运行 node works/jiangnan-garden/scripts/prepare-flora.mjs：

- [乔木原始几何](https://dl.polyhaven.org/file/ph-assets/Models/gltf/8k/tree_small_02/tree_small_02.bin)
- [蕨类原始几何](https://dl.polyhaven.org/file/ph-assets/Models/gltf/8k/fern_02/fern_02.bin)

完整原始几何的 SHA-256、减面参数和三角形数量保留在 model.gltf 的 asset.extras。正常构建仅需已跟踪的处理结果，不下载素材。构建时将几何无损 gzip 内联；运行时本地解压，支持原生流解压并提供 fflate 回退，所有模型贴图内联，不依赖外部网络。

建筑、承重木构、其余小桌的三块拼板、织物体积、竹丛、藤、荷叶、苔与安静动态由作品源码生成。椅、主要桌案与灌木属于上表授权模型。被褥通过 settleQuilt 的重力、床垫与床架接触及横向摩擦、双向剪切与弯曲距离约束松弛，再经过填棉平滑并封闭上下层和侧边，使用已列出的蓝亚麻扫描材质，没有新增被褥扫描。床帘网格由 src/cloth.js 的重力 Verlet、距离弹簧、顶部悬挂与束带压缩约束计算并缓存，缝边和悬挂环由源码构建；它使用已列出的 Rough Linen 材质，没有新增布料扫描。釉陶瓷的颜色纹理与清漆响应由源码材质生成，没有新增外部陶瓷素材。Three.js、Meshoptimizer 与 fflate 使用 MIT 许可证；内联构建保留依赖授权注释。
