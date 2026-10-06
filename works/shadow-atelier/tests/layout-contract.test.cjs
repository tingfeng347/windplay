const test=require('node:test');
const assert=require('node:assert/strict');
const {readFile}=require('node:fs/promises');
const path=require('node:path');
const vm=require('node:vm');
const C=require('../src/core.js');
const root=path.resolve(__dirname,'..');

test('renderer keeps CSS dimensions independent while updating DPR and resizing',async()=>{
  const source=await readFile(path.join(root,'src/render.js'),'utf8');
  const sandbox={ShadowCore:C,devicePixelRatio:2};vm.runInNewContext(source,sandbox);
  let bounds={width:960,height:650},width=300,height=150,writes=0;
  const canvas={getContext:()=>({}),getBoundingClientRect:()=>bounds};
  Object.defineProperties(canvas,{width:{get:()=>width,set:value=>{width=value;writes++;}},height:{get:()=>height,set:value=>{height=value;writes++;}}});
  const renderer=new sandbox.ShadowRender.Renderer(canvas);
  for(const [cssWidth,cssHeight,ratio] of [[960,650,2],[640,440,1],[320,345,3],[960,650,1]]){
    bounds={width:cssWidth,height:cssHeight};sandbox.devicePixelRatio=ratio;renderer.resize();
    assert.equal(width,cssWidth*Math.min(ratio,2));assert.equal(height,cssHeight*Math.min(ratio,2));
    const previousWrites=writes;
    for(let frame=0;frame<30;frame++)renderer.resize();
    assert.equal(writes,previousWrites,'unchanged CSS dimensions must not trigger another bitmap resize');
    assert.equal(renderer.height,cssHeight);
  }
});
