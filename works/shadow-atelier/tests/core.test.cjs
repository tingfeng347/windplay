const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../src/core.js');
const near=(a,b,epsilon=1e-10)=>assert.ok(Math.abs(a-b)<epsilon,`${a} should equal ${b}`);

test('Euler matrix preserves length and its transpose reverses the rotation',()=>{
  for(const angles of [[0,0,0],[90,0,0],[17,-63,28],[-149,166,179]]){
    const m=C.rotationMatrix(angles),p=[1.4,-2.1,.7],result=C.transform(m,p);
    near(Math.hypot(...result),Math.hypot(...p));
    C.transform(C.transpose(m),result).forEach((value,i)=>near(value,p[i]));
  }
  C.transform(C.rotationMatrix([0,0,90]),[1,0,0]).forEach((value,i)=>near(value,[0,1,0][i]));
  assert.equal(C.wrapAngle(360),0);assert.equal(C.wrapAngle(-181),179);assert.equal(C.wrapAngle(NaN),0);
});
test('each of the six real sculptures is solvable and starts with a different shadow',()=>{
  assert.equal(C.LEVELS.length,6);
  for(const level of C.LEVELS){
    assert.ok(level.blocks.length>40&&level.blocks.length<200);
    assert.ok(new Set(level.blocks.flatMap(b=>b.vertices.map(p=>p[2].toFixed(3)))).size>30,'sculpture has depth');
    assert.ok(C.evaluate(level,level.solution).score>=.98,`${level.id} solution`);
    assert.ok(C.evaluate(level,C.initialAngles(level)).score<.7,`${level.id} initial should be visibly different`);
    for(let attempt=1;attempt<5;attempt++)assert.ok(C.evaluate(level,C.initialAngles(level,attempt)).score<.7,`${level.id} reset`);
    for(let axis=0;axis<level.axes;axis++){
      const nearby=level.solution.slice();nearby[axis]+=1;
      assert.ok(C.evaluate(level,nearby).score>=.9,`${level.id} permits a one-degree adjustment on axis ${axis}`);
    }
  }
});
test('projected boxes and raster masks use the same union silhouette',()=>{
  const vertices=C.boxVertices(-1,-1,1,1,-2,2),hull=C.hull(vertices);
  assert.equal(hull.length,4);
  const a=C.rasterize([hull],20,2),b=C.rasterize([hull,hull],20,2);
  assert.deepEqual(a,b,'overlapping boxes do not darken or double-count their silhouette');
  assert.equal(a.reduce((sum,v)=>sum+v,0),100);
  const shifted=C.rasterize([hull.map(([x,y])=>[x+1,y])],20,2);
  near(C.maskIoU(a,shifted),1/3);
  assert.equal(C.maskIoU(a,a),1);assert.equal(C.maskIoU(new Uint8Array(4),new Uint8Array(4)),0);
  assert.throws(()=>C.maskIoU(a,new Uint8Array(4)),RangeError);
  const rect=C.rasterize([[[-20,-20],[20,-20],[20,20],[-20,20]]],10,2);
  assert.equal(rect.reduce((sum,v)=>sum+v,0),100,'a polygon crossing the edge is clipped');
});
test('success depends on continuously matching actual shadows for 600ms',()=>{
  let held=0;
  for(let i=0;i<5;i++){const s=C.advanceStability(held,.95,100);held=s.held;assert.equal(s.complete,false);}
  const finished=C.advanceStability(held,.95,100);assert.equal(finished.held,600);assert.equal(finished.complete,true);
  assert.equal(C.advanceStability(500,.899,100).held,0);
  assert.equal(C.advanceStability(500,1,100,true).held,0);
  assert.equal(C.advanceStability(0,1,5000).held,100,'a suspended frame cannot immediately solve a puzzle');
  assert.equal(C.advanceStability(0,NaN,100).held,0);
});
test('untrusted local progress is bounded, validated, and safe to discard',()=>{
  for(const raw of [null,'{','null','[]','{"version":2,"completed":["cat"]}','x'.repeat(4097)])assert.deepEqual(C.parseProgress(raw),{version:1,completed:[],lastLevel:'cat'});
  assert.deepEqual(C.parseProgress(JSON.stringify({version:1,completed:['cat','cat','bird','fake',2,null,{}],lastLevel:'key'})),{version:1,completed:['cat','bird'],lastLevel:'key'});
  assert.equal(C.parseProgress('{"version":1,"completed":[],"lastLevel":"constructor"}').lastLevel,'cat');
});
