const assert=require('node:assert/strict');const test=require('node:test');const fs=require('node:fs/promises');const path=require('node:path');const root=path.resolve(__dirname,'..');
test('独立成品与最新源码一致，无联网资源和未解决构建标记',async()=>{
 const [demo,dist]=await Promise.all(['demo/index.html','dist/index.html'].map(p=>fs.readFile(path.join(root,p),'utf8')));assert.equal(demo,dist);assert.doesNotMatch(demo,/__[A-Z0-9_]+__/);assert.doesNotMatch(demo,/<(?:script|link)\b[^>]+(?:src|href)="(?!data:)/);
 for(const p of ['core.js','renderer.js','game.js','styles.css'])assert.ok(demo.includes(await fs.readFile(path.join(root,'src',p),'utf8')),`${p} 源码未同步到成品`);
 assert.doesNotMatch(demo,/https?:\/\/[^<\s'"]+/);assert.match(demo,/href="\.\.\/\.\.\/\.\.\/index\.html"/);
});
test('游戏提供可发现的开始/背包/合成/存档/触屏入口和 WebGL 错误界面',async()=>{
 const html=await fs.readFile(path.join(root,'demo/index.html'),'utf8');for(const id of ['start','inventory-button','recipes','save','export','import','touch-controls','unavailable','respawn','help','sound'])assert.ok(html.includes(`id="${id}"`));assert.match(html,/aria-label="游戏模式"/);assert.match(html,/root\.VoxelFrontier=Object\.freeze/);
});
