# WindPlay Product
<!-- impeccable:product-schema 1 -->

## Platform
web

## Product Purpose
WindPlay 收集可独立游玩的浏览器实验。新增两个完整游戏：至少 10 关的纪念碑谷玩法启发的原创空间解谜，以及 ASCII 地牢探索。用户明确要求玩法完整、内容丰富。

## Operating Context
现有启动台进入独立作品；每个作品 src 为源文件，构建生成可通过 file:// 打开的自包含 demo/index.html。沿用已有原生 HTML/CSS/JavaScript 与 Node workspace 工具。

## Capabilities and Constraints
新作品独立维护源码、构建、测试与说明，接入根目录构建和首页。保留既有作品及视觉系统。游戏要有通关条件、失败/重玩、教程、键盘和触屏操作、本地进度。所有素材原创或源自游戏真实截图。

## Product Principles
- 内容与可玩性优先；交互规则应能被玩家理解。
- 源码与离线成品保持一致。
- 新作品各有自己的表现方式，启动台保留既有风格。
