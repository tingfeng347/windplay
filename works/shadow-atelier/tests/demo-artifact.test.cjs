const test=require('node:test');
const assert=require('node:assert/strict');
const {readFile}=require('node:fs/promises');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
test('tracked demo equals the generated build and all scripts parse',async()=>{
  const [demo,dist]=await Promise.all(['demo','dist'].map(dir=>readFile(path.join(root,dir,'index.html'),'utf8')));
  assert.equal(demo,dist);assert.doesNotMatch(demo,/__[A-Z0-9_]+__/);
  assert.doesNotMatch(demo,/<(?:link|script)\b[^>]+(?:href|src)="(?!data:)/);
  for(const file of ['styles.css','core.js','render.js','app.js']){
    const source=await readFile(path.join(root,'src',file),'utf8');
    assert.ok(demo.includes(source),`${file} matches the standalone artifact`);
    if(file.endsWith('.js'))assert.doesNotThrow(()=>new vm.Script(source,{filename:file}));
  }
  assert.match(demo,/href="\.\.\/\.\.\/\.\.\/index\.html"/);
});
test('interface includes all controls, persistent progress and an accessible state',async()=>{
  const html=await readFile(path.join(root,'demo/index.html'),'utf8');
  for(const id of ['scene','reference','level-select','score','play-status','angle-x','angle-y','angle-z','shuffle','hint','previous','next','freeze-stamp'])assert.match(html,new RegExp(`id="${id}"`));
  assert.match(html,/aria-live="polite"/);assert.match(html,/prefers-reduced-motion/);
  assert.match(html,/visibilitychange/);assert.match(html,/pointercancel/);assert.match(html,/localStorage\.setItem/);
  assert.match(html,/Object\.defineProperty\(window,'ShadowAtelier'/);
  assert.doesNotMatch(html,/solve:\s*\(/);
});
