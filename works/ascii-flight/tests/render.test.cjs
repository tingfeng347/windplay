const test=require('node:test'),assert=require('node:assert/strict');
test('flight view remains an orthonormal camera frame at both angle limits',async()=>{
 const {basis}=await import('../src/render.js'),c=require('../src/core.cjs');
 for(const pitch of [-c.LIMIT,0,c.LIMIT])for(const roll of [-c.LIMIT,0,c.LIMIT])for(const yaw of [0,1,4]){
  const axes=basis({pitch,roll,yaw});for(const a of Object.values(axes))assert.ok(Math.abs(Math.hypot(...a)-1)<1e-10);
  for(const [a,b] of [[axes.f,axes.r],[axes.f,axes.u],[axes.r,axes.u]])assert.ok(Math.abs(a.reduce((v,n,i)=>v+n*b[i],0))<1e-10);
 }
});
test('world output uses only coloured printable ASCII glyphs on a black 2D canvas',async()=>{
 const {render}=await import('../src/render.js'),c=require('../src/core.cjs'),glyphs=[],backgrounds=[];
 const ctx={globalAlpha:1,fillStyle:'',fillRect(){backgrounds.push(this.fillStyle);},fillText(char,x,y){glyphs.push({char,color:this.fillStyle,x,y});}};
 const canvas={width:360,height:280,getContext(type){assert.equal(type,'2d');return ctx;}};
 render(canvas,c.createState(),c.city(),c.gates(c.ROUTES[0]),0);assert.deepEqual(backgrounds,['#000']);assert.ok(glyphs.length>200);
 for(const g of glyphs){assert.match(g.char,/^[\x20-\x7e]$/);assert.equal(g.x%9,0);assert.equal(g.y%14,0);}
 assert.ok(glyphs.some(g=>g.char==='O'));assert.ok(glyphs.some(g=>g.char==='H'));assert.ok(glyphs.some(g=>g.char==='.'||g.char==='='));
});
