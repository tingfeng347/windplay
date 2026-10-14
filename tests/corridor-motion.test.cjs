const test = require('node:test'), assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
function harness() {
  const frames = new Map(), mutations = [], observers = []; let time = 0, sequence = 0;
  function element() {
    const handlers = new Map(), values = new Map(), classes = new Set();
    return {dataset:{}, values, classes, offsetWidth:900,
      style:{setProperty:(key,value)=>values.set(key,value)},
      classList:{toggle:(key,on)=>on?classes.add(key):classes.delete(key),remove:(...keys)=>keys.forEach(key=>classes.delete(key))},
      addEventListener:(key,handler)=>handlers.set(key,handler), emit:(key,event)=>handlers.get(key)?.(event),
      setAttribute(key,value){if(key.startsWith('data-'))this.dataset[key.slice(5)]=value;},removeAttribute(key){delete this.dataset[key.slice(5)];},
      getBoundingClientRect:()=>({width:1200,height:800,top:0,bottom:800}),prepend(){},remove(){}};
  }
  const cards=Array.from({length:12},(_,i)=>Object.assign(element(),{t:i/11})),grid=element(),catalog=element(),root=element(),document=element(),window=element();root.dataset.motion='active';root.clientWidth=1280;
  grid.querySelectorAll=()=>cards;
  Object.assign(document,{documentElement:root,hidden:false,querySelector:s=>s==='.catalog'?catalog:s==='.work-grid'?grid:null,createElement:element,dispatchEvent(){}});
  Object.assign(window,{innerHeight:800,matchMedia:()=>Object.assign(element(),{matches:false}),requestAnimationFrame:fn=>{frames.set(++sequence,fn);return sequence;},cancelAnimationFrame:id=>frames.delete(id)});
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../scripts/corridor-motion.js'),'utf8'),{document,window,getComputedStyle:card=>({getPropertyValue:()=>String(card.t)}),CustomEvent:class{},IntersectionObserver:class{constructor(fn){observers.push(fn);}observe(){}},MutationObserver:class{constructor(fn){mutations.push(fn);}observe(){}}});
  observers[0]([{isIntersecting:true}]);
  const frame=()=>{time+=16;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(time));};
  return {cards,grid,frame,mode(value){root.dataset.motion=value;mutations.forEach(fn=>fn());},wheel(delta){grid.emit('wheel',{deltaY:delta,deltaX:0,deltaMode:0,preventDefault(){}});},settle(){for(let i=0;i<200&&frames.size;i++)frame();assert.equal(frames.size,0);},blur(i){return parseFloat(cards[i].values.get('--preview-blur')||0);}};
}
test('每张卡片切入时失焦，停稳后清晰；反向与快速切换可以中断',()=>{
 const app=harness();app.settle();
 for(let index=1;index<12;index++){
  app.wheel(300);let peak=0;for(let i=0;i<10;i++){app.frame();peak=Math.max(peak,app.blur(index));}
  assert.ok(peak>0&&peak<=8,`card ${index} must arrive blurred`);app.settle();assert.equal(app.blur(index),0);
 }
 app.wheel(-300);app.frame();app.wheel(-300);app.frame();app.wheel(300);app.settle();assert.ok(app.cards.every((_,i)=>app.blur(i)===0));
});
test('暂停和减弱动态清除失焦，暂停时仍能切换作品',()=>{
 const app=harness();app.wheel(300);app.frame();app.mode('paused');app.settle();assert.ok(app.cards.every((_,i)=>app.blur(i)===0));
 app.wheel(300);app.settle();assert.ok(app.cards[2].classes.has('is-live'));assert.equal(app.blur(2),0);
 app.mode('reduced');assert.ok(app.cards.every((_,i)=>app.blur(i)===0));
});
