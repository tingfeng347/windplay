const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('进入和退出 ADS 时枪械横向位置连续插值，残余瞄准恢复肩射位置',()=>{
 const context={StrikeCore:require('../src/core.js'),Math,Float32Array};vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../src/renderer.js'),'utf8'),context);
 for(const weapon of ['rifle','pistol']){
  const model=aim=>context.StrikeRenderer.weaponMesh(weapon,aim,0,0,0,false);
  const hip=model(0),half=model(.5),ads=model(1),exit=model(.01);
  assert.ok(Math.abs(half.muzzle.x-(hip.muzzle.x+ads.muzzle.x)/2)<1e-9);
  assert.ok(Math.abs(half.muzzle.y-(hip.muzzle.y+ads.muzzle.y)/2)<1e-9);
  assert.ok(exit.muzzle.x>half.muzzle.x&&exit.muzzle.x<hip.muzzle.x);
  assert.ok(Math.abs(exit.muzzle.x-hip.muzzle.x)<.002);
  assert.ok(Math.abs(ads.muzzle.x)<1e-9);
 }
});
test('地图、人形角色、持枪/瞄准/换弹特效网格与相机矩阵均为有限值',()=>{
 let buffers=0,matrixCount=0;const noop=()=>{};
 const gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true,getAttribLocation:()=>1,getUniformLocation:()=>1,createShader:()=>({}),createProgram:()=>({}),createTexture:()=>({}),createBuffer:()=>({}),bufferData:(target,data)=>{assert.ok(data instanceof Float32Array);for(const v of data)assert.ok(Number.isFinite(v));buffers++;},uniformMatrix4fv:(target,transpose,data)=>{assert.equal(data.length,16);assert.ok([...data].every(Number.isFinite));matrixCount++;}}, {get:(o,k)=>k in o?o[k]:typeof k==='string'&&k===k.toUpperCase()?1:noop});
 const ctx=new Proxy({}, {get:()=>noop}),context={Float32Array,Math,Number,performance:{now:()=>1000},window:{devicePixelRatio:1},document:{createElement:()=>({width:0,height:0,getContext:()=>ctx})}};vm.createContext(context);
 vm.runInContext(fs.readFileSync(require.resolve('../src/core.js'),'utf8'),context);vm.runInContext(fs.readFileSync(require.resolve('../src/renderer.js'),'utf8'),context);
 const state=context.StrikeCore.createState('veteran'),renderer=new context.StrikeRenderer.Renderer({clientWidth:1280,clientHeight:720,getContext:()=>gl},state.map);assert.ok(renderer.staticCount>5000);
 renderer.render(state,.016,{showcase:true});renderer.event({type:'shot',origin:{x:8,y:1.58,z:49},dir:{x:1,y:0,z:0},end:{x:40,y:1.58,z:49}});
 renderer.render(state,.016,{aim:false});renderer.render(state,.016,{aim:true});state.weapon='pistol';state.reloading=1.2;state.player.recoil=.1;renderer.render(state,.016,{aim:true});
 assert.ok(buffers>=7);assert.equal(matrixCount,4);
});
