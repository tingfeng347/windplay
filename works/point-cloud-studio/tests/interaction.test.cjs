const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '../dist');
let model;
const PointCloud = require(root + '/point-cloud.js');

function target(object = {}) {
  const events = new Map();
  return Object.assign(object, {
    addEventListener(type, fn) { if (!events.has(type)) events.set(type,new Set()); events.get(type).add(fn); },
    removeEventListener(type, fn) { events.get(type)?.delete(fn); },
    emit(type, event = {}) { for (const fn of [...(events.get(type) || [])]) fn(event); }
  });
}
function environment() {
  const frames = new Map(), observers = [], elements = new Map(), downloads = [], blobs = new Map();
  let sequence = 0, clock = 0;
  const motion = target({matches:false});
  const storage = new Map();
  const win = target({ devicePixelRatio:2, matchMedia:()=>motion,
    localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,String(value))},
    requestAnimationFrame(fn) { frames.set(++sequence,fn); return sequence; },
    cancelAnimationFrame(id) { frames.delete(id); },
    ResizeObserver: class { constructor(fn) {this.fn=fn;observers.push(this);} observe(el) {this.el=el;} disconnect() {this.closed=true;} }
  });
  const doc = target({hidden:false,defaultView:win,documentElement:{dataset:{}}});
  function canvas() {
    const captures = new Set();
    const ctx = {arcs:[], fillRect(){this.arcs=[];},setTransform(){},beginPath(){},fill(){},
      arc(x,y,r){assert([x,y,r].every(Number.isFinite));assert(r>0);this.arcs.push([x,y,r,this.fillStyle]);}
    };
    return target({ownerDocument:doc,style:{},bounds:{width:800,height:800,left:20,top:30},
      getContext:()=>ctx,getBoundingClientRect(){return this.bounds;},focus(){},setAttribute(){},
      setPointerCapture(id){captures.add(id);},hasPointerCapture:id=>captures.has(id),
      releasePointerCapture(id){captures.delete(id);this.emit('lostpointercapture',{pointerId:id});},
      toBlob(fn){fn(new Blob(['png']));}
    });
  }
  function element(id) {
    if(elements.has(id))return elements.get(id);
    const el=target({id,value:'',checked:false,style:{},dataset:{},parentElement:{style:{}},
      replaceChildren(node){this.child=node;},querySelector(){return this.child;},setAttribute(){},remove(){},
      click(){this.emit('click');}
    });
    elements.set(id,el);return el;
  }
  doc.getElementById=element;
  doc.createElement=tag=>{
    if(tag==='canvas')return canvas();
    return {click(){downloads.push({name:this.download,blob:blobs.get(this.href)});},remove(){}};
  };
  doc.body={appendChild(){}};
  function settle(limit=500) {
    let count=0;
    while(frames.size && count<limit){const batch=[...frames.values()];frames.clear();clock+=16;batch.forEach(fn=>fn(clock));count++;}
    assert.equal(frames.size,0,'animation must stop when settled');return count;
  }
  return {win,doc,canvas,element,frames,observers,downloads,settle,
    globals:{window:win,document:doc,Blob,Image:class {},setTimeout:()=>1,
      requestAnimationFrame:win.requestAnimationFrame,cancelAnimationFrame:win.cancelAnimationFrame,
      URL:{createObjectURL(blob){const url='blob:test-'+(++sequence);blobs.set(url,blob);return url;},revokeObjectURL(url){blobs.delete(url);}}
    }
  };
}

(async()=>{
  const sharp = require('sharp');
  const Halftone = require('../src/halftone.js');
  const {data,info} = await sharp(path.resolve(__dirname,'../assets/sample-portrait.jpg')).rotate()
    .resize({width:1200,height:1200,fit:'inside',withoutEnlargement:true})
    .ensureAlpha().raw().toBuffer({resolveWithObject:true});
  model = Halftone.fromPixels(data,info.width,info.height);
  // 运行实际导出的 HTML 脚本，只提供 Canvas/DOM 环境，不提供 PointCloud 全局。
  const exported=fs.readFileSync(root+'/test-point-cloud.html','utf8');
  const solo=environment(), node=solo.canvas();
  solo.doc.getElementById=()=>node;
  vm.runInNewContext(exported.match(/<script>([\s\S]*?)<\/script>/)[1],solo.globals);
  solo.settle();
  const context=node.getContext('2d');
  const baseline=JSON.stringify(context.arcs);
  assert(context.arcs.length>model.dots.length*.9);
  assert(new Set(context.arcs.map(p=>p[3])).size>100, "standalone HTML draws per-point colors");
  node.emit('pointermove',{clientX:520,clientY:370,pointerId:1});solo.settle();
  assert.notEqual(JSON.stringify(context.arcs),baseline,'hover must change the point cloud');
  node.emit('pointerleave');solo.settle();assert.equal(JSON.stringify(context.arcs),baseline);
  node.emit('pointerdown',{button:0,pointerId:1,clientX:350,clientY:300});
  node.emit('pointermove',{pointerId:1,clientX:480,clientY:340});
  node.emit('pointerup',{pointerId:1});solo.settle();
  const rotated=JSON.stringify(context.arcs);assert.notEqual(rotated,baseline);
  let prevented=false;
  node.emit('wheel',{deltaY:-220,deltaMode:0,preventDefault(){prevented=true;}});solo.settle();
  assert(prevented);assert.notEqual(JSON.stringify(context.arcs),rotated);
  node.emit('dblclick');solo.settle();assert.equal(JSON.stringify(context.arcs),baseline);
  node.bounds={width:500,height:300,left:20,top:30};solo.observers[0].fn();solo.settle();
  assert.equal(node.width,1000);assert.equal(node.height,600);

  // 运行生成器实际脚本：3D 开关默认开启，改变纵深后点击 HTML 导出。
  const editor=environment();
  const defaults={spacing:9,radius:.52,contrast:1,gamma:1,threshold:.06,depth:.38,foreground:'#f4f3ef',background:'#100f0b'};
  for(const [key,value] of Object.entries(defaults))editor.element(key).value=String(value);
  for(const key of ['autoLevels','motion','threeD','sourceColors'])editor.element(key).checked=true;
  const sandbox=vm.createContext({...editor.globals,injectedModel:model});
  const html=fs.readFileSync(root+'/index.html','utf8');
  [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach(m=>vm.runInContext(m[1],sandbox));
  vm.runInContext('currentModel=injectedModel;showModel();',sandbox);editor.settle();
  editor.element('depth').value='.73';editor.element('depth').emit('input');editor.settle();
  const preview=editor.element('preview').child;
  preview.emit('pointerdown',{button:0,pointerId:2,clientX:300,clientY:300});
  preview.emit('pointermove',{pointerId:2,clientX:350,clientY:310});
  preview.emit('pointerup',{pointerId:2});editor.settle();
  editor.element('exportHtml').emit('click');
  assert.equal(editor.downloads.length,1);assert.equal(editor.downloads[0].name,'point-cloud.html');
  const generated=await editor.downloads[0].blob.text();
  assert(!/<(?:input|button|aside|header|footer|img)\b/.test(generated));
  assert(!/data:image|SAMPLE|__POINT_CLOUD/.test(generated));
  const scene=JSON.parse(generated.match(/document.getElementById\("cloud"\),(\{[\s\S]*?\}),function project/)[1]);
  assert.equal(scene.depth,.73);assert.equal(scene.interactive,true);assert.equal(scene.threeD,true);
  assert(scene.view.yaw>.4,'export must retain dragged camera angle');
  assert.equal(scene.points.length,model.dots.length);
  assert.deepEqual(scene.points.map(p=>p[4]),model.dots.map(p=>p.color));
  assert(scene.view.pitch < -.04, "downward drag must decrease pitch");
  editor.element('exportPng').emit('click');
  assert.equal(editor.downloads[1].name,'point-cloud.png');
  editor.element('exportSvg').emit('click');
  assert((await editor.downloads[2].blob.text()).includes('application/ecmascript'));

  // 主题切换后，导出跟随配色并保留几何与视角；手动配色不被覆盖。
  editor.element('themeLight').emit('click');editor.settle();
  assert.equal(editor.doc.documentElement.dataset.theme,'light');
  editor.element('exportHtml').emit('click');
  const lightExport=await editor.downloads[3].blob.text();
  const lightScene=JSON.parse(lightExport.match(/document.getElementById\("cloud"\),(\{[\s\S]*?\}),function project/)[1]);
  assert.equal(lightScene.foreground,'#252a33');assert.equal(lightScene.background,'#ffffff');
  assert.deepEqual(lightScene.points,scene.points);assert.deepEqual(lightScene.view,scene.view);
  editor.element('foreground').value='#ff8844';editor.element('foreground').emit('input');editor.settle();
  editor.element('themeDark').emit('click');editor.settle();
  assert.equal(editor.doc.documentElement.dataset.theme,'dark');
  assert.equal(editor.element('foreground').value,'#ff8844');assert.equal(editor.element('background').value,'#ffffff');
  editor.element('resetColors').emit('click');editor.settle();
  assert.equal(editor.element('foreground').value,'#f4f3ef');assert.equal(editor.element('background').value,'#100f0b');
  assert.equal(editor.win.localStorage.getItem('point-cloud-editor-theme'),'dark');

  // 模式开关同步到 SVG、HTML 和 PNG 绘制，恢复原色不丢失采样值。
  assert.equal(editor.element('foreground').disabled,true);
  editor.element('sourceColors').checked=false;editor.element('sourceColors').emit('change');editor.settle();
  assert.equal(editor.element('foreground').disabled,false);
  const monoCanvas=editor.element('preview').child;
  assert(monoCanvas.getContext('2d').arcs.every(p=>p[3]==='#f4f3ef'));
  editor.element('sourceColors').checked=true;editor.element('sourceColors').emit('change');editor.settle();
  assert(new Set(editor.element('preview').child.getContext('2d').arcs.map(p=>p[3])).size>100);
  const snapshot=vm.runInContext('cloud.snapshot(2)',sandbox);
  assert(new Set(snapshot.getContext('2d').arcs.map(p=>p[3])).size>100,'PNG snapshot retains RGB');
  assert(!html.includes('<footer>')&&!html.includes('示例照片来自该站')&&!html.includes('参考网站示例人像'));

  // 新照片模型和二维选项也必须导出正确的内容，而非固定示例。
  const smaller={...model,dots:model.dots.slice(0,31)};
  const custom=PointCloud.prepare(smaller,{threeD:false,depth:.6,view:{yaw:0,pitch:0,zoom:1}});
  assert.equal(custom.points.length,31);assert(custom.points.every(p=>p[2]===0));
  const env=environment(), control=PointCloud.mount(env.canvas(),PointCloud.prepare(model));
  env.settle();control.destroy();assert.equal(env.frames.size,0);assert(env.observers[0].closed);
  console.log(JSON.stringify({pass:true,checks:['standalone HTML bootstrap without module globals','hover and restore','drag rotation','wheel zoom','double click reset','resize and device pixels','actual editor export click','depth and camera persistence','only point cloud in exported HTML','3D PNG export','interactive SVG preserved','light and dark themes','export follows theme colors','theme preserves points and camera','manual colors preserved','restore theme palette','theme preference persisted','custom model and flat mode','animation cleanup']}));
})().catch(error=>{console.error(error);process.exitCode=1;});
