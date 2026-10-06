const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');const root=path.resolve(__dirname,'..');
test('独立成品包含最新全部源码，无远程资源或构建占位符',async()=>{
 const [demo,dist]=await Promise.all(['demo/index.html','dist/index.html'].map(p=>fs.readFile(path.join(root,p),'utf8')));assert.equal(demo,dist);assert.doesNotMatch(demo,/__[A-Z0-9_]+__/);assert.doesNotMatch(demo,/<(?:script|link)\b[^>]+(?:src|href)="(?!data:)/);assert.doesNotMatch(demo,/https?:\/\/[^<\s'"]+/);
 for(const file of['core.js','renderer.js','game.js','styles.css'])assert.ok(demo.includes(await fs.readFile(path.join(root,'src',file),'utf8')));assert.match(demo,/href="\.\.\/\.\.\/\.\.\/index\.html"/);
});
test('可发现的难度/开始/换弹/触屏/暂停/设置/结果及安全退化界面齐全',async()=>{
 const html=await fs.readFile(path.join(root,'demo/index.html'),'utf8');for(const id of['start','pause','help','scoreboard','result','touch-fire','touch-aim','touch-reload','sensitivity','quality','fov','sound','unavailable'])assert.ok(html.includes(`id="${id}"`));assert.match(html,/root\.StrikeArena=Object\.freeze/);assert.match(html,/#hud\{[^}]+pointer-events:none/);assert.match(html,/pointerFallback=true;shooting=false/);
});
