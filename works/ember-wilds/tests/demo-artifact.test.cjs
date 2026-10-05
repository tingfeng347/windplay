const test = require('node:test');
const assert = require('node:assert/strict');
const {readFile} = require('node:fs/promises');
const path = require('node:path');
const root=path.resolve(__dirname,'..');
test('tracked demo is current, standalone and free of unresolved build tokens',async()=>{
  const [demo,dist]=await Promise.all(['demo','dist'].map(d=>readFile(path.join(root,d,'index.html'),'utf8')));assert.equal(demo,dist);assert.doesNotMatch(demo,/__[A-Z0-9_]+__/);assert.doesNotMatch(demo,/<(?:link|script)\b[^>]+(?:href|src)="(?!data:)/);for(const file of ['styles.css','engine.js','render.js','game.js'])assert.ok(demo.includes(await readFile(path.join(root,'src',file),'utf8')),`${file} must match demo`);assert.match(demo,/href="\.\.\/\.\.\/\.\.\/index\.html"/);
});
test('the interface includes playable mobile controls, accessible state and pause/save actions',async()=>{
  const demo=await readFile(path.join(root,'demo/index.html'),'utf8');for(const control of ['start','continue','pause','resume','save','restart','interact','cook','touch-attack'])assert.match(demo,new RegExp(`id="${control}"`));assert.match(demo,/aria-live="polite"/);for(const direction of ['up','down','left','right'])assert.match(demo,new RegExp(`data-dir="${direction}"`));assert.match(demo,/Object\.defineProperty\(E,'game'/);
});
