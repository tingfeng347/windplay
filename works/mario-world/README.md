# 超级马里奥 · 像素冒险

FC/NES 初代风格平台游戏，8 个世界、32 关。

[开始游戏](demo/index.html) · [游戏说明](docs/GUIDE.md)

## 开发

Node.js 22+；在仓库根目录执行：

```bash
npm ci
npm run dev:mario
npm run build --workspace @windplay/mario-world
npm test --workspace @windplay/mario-world
```

开发地址：`http://localhost:5184`。构建输出：`dist/`、`demo/index.html`。

## 操作

| 按键 | 动作 |
| --- | --- |
| ← → / A D | 移动 |
| Space / Z / W / ↑ | 跳跃 / 游泳 |
| Shift / X | 加速 / 火球 |
| ↓ / S | 进入管道 |
| P / Escape | 暂停 |

支持现代 Chrome、Edge、Firefox、Safari，以及触屏操作。

## 文档

- [规则、存档与还原范围](docs/GUIDE.md)
- [界面设计](docs/DESIGN.md)
