# 加载与绘制优化

2026-10-10，本轮以已接受的第七轮画面为基线，缩小交付体积和首次进入成本。它不改变园林布局、操纵方式、界面令牌或材质来源，也不解决 [QUALITY.md](QUALITY.md) 已记录的电影级写实差距。

## 输出与发布

作品构建产生两份交付：`demo/index.html` 与 `dist/index.html` 为可通过 file:// 打开的自包含离线单文件；`dist/web/` 为同源在线文件，入口 HTML、脚本、纹理和几何分开缓存。在线资源使用内容哈希文件名，不加载外部 CDN。

`package.json` 的 `windplay.webOutput` 指向 `dist/web`。根目录 `npm run build` 将其复制到 `_site/works/jiangnan-garden/demo/`，保留原有公开路径。部署仓库根 `_site/`；不要把约 44 MiB 的离线 HTML 当作新的在线入口。作品开发命令仍服务离线单文件；检查在线输出可通过 `python3 -m http.server 4174 --directory works/jiangnan-garden/dist/web` 启动静态服务。

## 体积

MiB = 1,048,576 字节；gzip 为离线 HTML 的 level 9 文件压缩测量，不等同于服务器实际传输。在线数值来自 `dist/loading-report.json`。

| 项目 | 优化前 | 当前 |
| --- | ---: | ---: |
| 离线 HTML 原始体积 | 80.16 MiB | 46,328,380 B（44.18 MiB） |
| 离线 HTML gzip | 59.81 MiB | 34,381,460 B（32.79 MiB） |
| 在线 HTML 入口 | — | 10,785 B |
| 在线首批资源，不含 HTML | — | 11,724,127 B（11.18 MiB） |
| 全部在线资源，含延后细节，不含 HTML | — | 35,127,722 B（33.50 MiB） |
| 在线资源文件 | — | 216 个，其中 104 个 WebP 来源 JSON sidecar；另有入口 HTML |

首批资源是构建器对初始脚本、HDRI、模型和预览贴图的计数，不是浏览器瀑布实测。来源 JSON 随部署保留但不参与场景加载；全部资源总量包含它们。缓存、HTTP 压缩、请求调度及后续操作会改变实际传输量。此前参考页面的 HTML 为 159,925 B，但外链 Three.js、Tailwind 与字体不在该数值内；不能以两个 HTML 大小推断完整页面成本，仓库没有复制该参考源码。

## 实现与取舍

- 原始 JPEG、glTF、model.bin 和授权清单保持。构建生成 quality 90 WebP 派生文件，先加载最长边不超过 512px 的远景贴图；进入漫游或相机距环绕目标小于 32 m 时，以四路并发升级到原始 1K/2K 分辨率的派生贴图。替换保留翻转、色彩空间、UV、wrap 和材质设置。较小原图在 WebP 无节省时保持 JPEG。104 个 WebP sidecar 与内嵌来源元数据追溯原资产。
- 几何采用 Meshopt 编码后 gzip。完整细节乔木仍为 1,334,988 个三角形；位置、UV 与完整拓扑保留，整数法线使用 12-bit 八面体编码，存在小幅方向量化损失，不能称为全部无损。其他模型不删除完整细节三角形。
- 首次环绕使用约 452,464 个三角形的乔木远景版本，仅简化叶片细分，误差阈值 .001，关闭 Prune，不随机稀疏树叶；近看异步恢复完整网格并保留，返回环绕不会再次降级。细节加载失败时保留可用的远景网格或预览纹理。
- 乔木共用实例几何，弯曲、法线变换和实例位置在 GPU 执行；深度与距离阴影使用同一弯曲。它替代逐株复制和 CPU 顶点变形，保留原造景位置和形状规则。
- 静态帘形与被褥在构建时计算，成品携带与重力求解器完全相同的 Float32 顶点，不在首次进入时运行迭代。继续保留原有接触、摩擦与填棉结果。
- 静态阴影停止逐帧重绘；连续时辰变化、揭顶或恢复屋顶、画质调整和高细节树网格替换会使阴影缓存失效。雨、水面、涟漪与漫游仍实时更新。

处理器为 `scripts/optimize-assets.mjs`；可重建缓存位于根 `.cache/garden-optimized`，不跟踪。正常构建从本地授权源素材生成派生资源，不需重新下载。

## 单次本机样本

本机浏览器 1280×720、未限速的一次在线样本：优化前 init 18.274 s、ready 19.917 s；优化后 init 7.795 s、ready 7.909 s。init 从应用初始化开始计时，ready 是应用记录的首帧完成/隐藏加载层状态；两者都不是近景全部资源就绪时间，也不是 Core Web Vitals。

优化后的离线页面另一次 ready 为 26.401 s，当时另一个 GPU 页面仍活跃。不能据此声称离线更快，或把不同条件的样本合并为稳定提速比例。本轮没有重复统计、公网或限速移动网络保证；真实设备、缓存、服务器和 GPU 负载仍会影响载入和帧率。

## 验证与画面证据

本轮根目录构建成功，204 项测试通过；园林原 18 项加 6 项优化检查，共 24 项。新增检查覆盖布料 Float32 等价、完整与远景网格、GPU 变形及阴影、离线 gzip 上限、在线入口/首批资源预算，以及贴图延后升级和状态保留。预算通过不代表所有设备帧率达标。

已打开并比较 [日景前](../../../.impeccable/review/garden-performance/before-day.png)/[后](../../../.impeccable/review/garden-performance/after-day.png)、[夜景前](../../../.impeccable/review/garden-performance/before-night.png)/[后](../../../.impeccable/review/garden-performance/after-night.png)、[堂屋前](../../../.impeccable/review/garden-performance/before-hall.png)/[后](../../../.impeccable/review/garden-performance/after-hall.png)、[卧房前](../../../.impeccable/review/garden-performance/before-bedroom.png)/[后](../../../.impeccable/review/garden-performance/after-bedroom.png)，以及当前 [书房](../../../.impeccable/review/garden-performance/after-study.png)、[揭顶](../../../.impeccable/review/garden-performance/after-roof.png)、[390×844 手机](../../../.impeccable/review/garden-performance/after-mobile.png)与[810×1082](../../../.impeccable/review/garden-performance/after-user-810.png)。所见布局、界面、近景陈设和床具延续接受基线，远景树网格有上述明确取舍；截图不证明全像素相同。DESIGN.md 与 schemaVersion 2 sidecar 保持原文件。这些截图为本地复核证据，不随部署发布。

离线成品另经浏览器验证，进入堂屋后完整纹理和树网格均就绪，无控制台错误。13 个 `_site` 作品入口与各自配置的交付目录逐字节一致；园林发布入口引用的脚本存在。移除临时复核文件后，整个 `_site` 为 43,379,681 B（41.37 MiB）。在线 WebP 来源扫描为 104 个文件、0 个缺失。

独立复核结论为 `ship`，限于这次性能优化对已接受画面的保留，没有待修复的新退化；详见 [QUALITY.md](QUALITY.md)。原电影级品质差距仍然保留。
