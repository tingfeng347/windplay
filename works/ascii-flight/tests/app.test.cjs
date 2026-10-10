const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function harness(search=''){
 const html=fs.readFileSync(path.join(root,'demo/index.html'),'utf8'),events=new Map(),frames=[],elements=new Map(),classes=new Set();let time=0,draws=0;
 for(const [,id] of html.matchAll(/\bid="([^"]+)"/g))elements.set(id,{hidden:false,value:id==='route'?'0':'',textContent:'',disabled:false,setAttribute(){},matches(){return false;}});
 const canvas=elements.get('view');Object.assign(canvas,{width:300,height:150,getBoundingClientRect(){return{width:800,height:500};},getContext(type){assert.equal(type,'2d');return{fillRect(){draws++;},fillText(){}};}});
 const document={getElementById:id=>elements.get(id),querySelectorAll:()=>[],addEventListener:(name,fn)=>events.set(name,fn),hidden:false,body:{classList:{toggle(name,enabled){enabled?classes.add(name):classes.delete(name);}}}};
 const window={addEventListener:(name,fn)=>events.set(name,fn)};
 const context={document,window,location:{search},URLSearchParams,performance:{now:()=>time},requestAnimationFrame:fn=>frames.push(fn),ResizeObserver:class{observe(){}},localStorage:{getItem(){return null;},setItem(){}}};
 for(const [,script] of html.matchAll(/<script>([\s\S]*?)<\/script>/g))vm.runInNewContext(script,context);
 return{elements,frames,classes,get draws(){return draws;},key(key,type='keydown',tag='BUTTON'){events.get(type)({key,repeat:false,target:{matches(selector){return selector.split(',').includes(tag.toLowerCase());}},preventDefault(){}});},event(name){events.get(name)();},tick(ms=40){time+=ms;const frame=frames.shift();assert.ok(frame);frame(time);}};
}
test('keyboard controls work after clicking start, even with the start button focused',()=>{
 const h=harness();h.elements.get('start').onclick();h.tick();h.key('s');h.tick();assert.match(h.elements.get('pitch').textContent,/俯仰 -[1-9]\d*°/);h.key('s','keyup');const pitch=h.elements.get('pitch').textContent;h.tick();assert.equal(h.elements.get('pitch').textContent,pitch);
 h.elements.get('reset').onclick();h.key('w');h.tick();assert.match(h.elements.get('pitch').textContent,/俯仰 \+[1-9]\d*°/);h.key('w','keyup');
 h.key('d');h.tick(50);assert.notEqual(h.elements.get('roll').textContent,'滚转 +0°');h.key('d','keyup');
});
test('losing focus pauses and clears held keys before resuming',()=>{
 const h=harness();h.elements.get('start').onclick();h.tick();h.key('d');h.tick();const roll=h.elements.get('roll').textContent;h.event('blur');assert.equal(h.elements.get('pause').textContent,'继续');h.tick();assert.equal(h.elements.get('roll').textContent,roll);h.elements.get('pause').onclick();h.tick();assert.equal(h.elements.get('roll').textContent,roll);
});
test('launcher preview paints from the same world without scheduling a flight loop',()=>{
 const h=harness('?preview=1');assert.ok(h.classes.has('preview'));assert.ok(h.draws>0);assert.equal(h.frames.length,0);
});

test('slow frames preserve control rates instead of truncating elapsed flight time',()=>{
 const h=harness();h.elements.get('start').onclick();h.tick();h.key('d');h.tick(150);assert.equal(h.elements.get('roll').textContent,'滚转 +9°');
});
test('paused frames keep the last picture without repeatedly tracing the city',()=>{
 const h=harness();h.elements.get('start').onclick();h.tick();h.tick();h.elements.get('pause').onclick();const count=h.draws;h.tick(100);h.tick(100);assert.equal(h.draws,count);
});
test('industrial route selection uses its own gate count and supports returning to free flight',()=>{
 const h=harness();h.elements.get('route').value='3';h.elements.get('route').onchange();
 assert.equal(h.elements.get('route-name').textContent,'工业远征');assert.equal(h.elements.get('gate-count').textContent,'航门 0 / 14');
 h.elements.get('route').value='free';h.elements.get('route').onchange();assert.equal(h.elements.get('gate-count').textContent,'自由航线');
});
