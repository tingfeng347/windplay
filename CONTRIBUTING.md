# 为 WindPlay 添加作品

## 新作品清单

1. 在 `works/<kebab-case-name>/` 中创建作品。
2. 为 Node.js 作品使用 `@windplay/<kebab-case-name>` 作为包名，并设置 `private: true`。
3. 在作品 README 中写明用途、运行方式、构建方式、操作方法和浏览器要求。
4. 将可编辑源码放进 `src/`，原始素材放进 `assets/`，自动化检查放进 `tests/`。
5. 生成并提交可直接打开的单文件成品 `demo/index.html`；它不能依赖本地服务器或外部文件。
6. 将其他生成结果输出到 `dist/`，不要把依赖、缓存或临时导出提交到仓库。
7. 在根 README 的作品表中链接成品入口，并运行 `npm run build` 和 `npm test`。

作品可以使用不同技术栈，但应保持独立运行。跨作品复用达到两个明确使用方后，再讨论
提取 `packages/` 或公共站点层；在此之前，局部实现留在各自作品中。

## 推荐结构

```text
works/example-work/
├── assets/       # 原始且可再生成的素材
├── demo/
│   └── index.html # 提交到 Git 的完整单文件成品
├── docs/         # 作品专属说明
├── scripts/      # 构建和开发脚本
├── src/          # 唯一源码
├── tests/        # 自动化检查
├── package.json
└── README.md
```

并非所有作品都必须包含每个目录。没有真实内容时不要创建空目录。
