(function (root) {
  'use strict';
  const THEMES = [
    ['#e7efea','#faf4df','#c6d8ca','#8bb5ac','#d15e48'],
    ['#e9e3ee','#f8edf0','#d7bed4','#aa97bf','#b55c70'],
    ['#e2edf0','#f1f4e1','#bed5d7','#7ba7b6','#cb6749'],
    ['#f0e6d7','#fff2d8','#e3c6a2','#b99d77','#b75840'],
    ['#dde9e5','#eef0d6','#b6c9bb','#789e91','#c75d49']
  ];
  const CHAPTERS = [
    ['初见','世界并没有断开，只是你还没有换一个方向。','转动视角，让两段金色断桥在画面中相接。',[0],false,false],
    ['回廊','走过的路，也会成为另一条路的起点。','先取回支路上的光，再穿过折叠桥。',[1],false,true],
    ['双生塔','两座相望的塔，藏着同一段阶梯。','两座折叠桥分别在不同视角连通。',[0,2],false,false],
    ['潮汐机关','石头记得每一次轻轻的叩击。','走到铜色机关上，按空格开启门。',[3,1],false,true],
    ['星盘','只有安静站立时，世界才愿意转动。','从本关起，只能站在圆环星盘上旋转。',[1,0],true,false],
    ['沉默的庭院','绕远一点，才能带走所有的星光。','在支路寻找星光，再返回星盘。',[2,3],true,true],
    ['错位长阶','向上的路，有时要先向后走。','连续穿过三次折叠，留意桥头的星盘。',[0,2,1],true,false],
    ['月之门','月光穿过打开的门，也穿过漫长的等待。','机关控制通路；开门后返回主路。',[3,0,2],true,true],
    ['无尽之环','重叠并非终点。记住你最初的方向。','每次旋转都改变空间，星光却留在原处。',[2,1,3,0],true,true],
    ['归光','把散落的光，送回世界的中心。','综合星盘、机关与四次空间折叠。',[1,3,0,2],true,true]
  ];
  function inverse(x,z,view) { for(let i=0;i<view;i++) [x,z]=[z,-x]; return [x,z]; }
  function makeLevel(index) {
    const [name,story,help,folds,restricted,branch] = CHAPTERS[index];
    const nodes=[], edges=[];
    function node(x,y,z,kind='stone') { const n={id:nodes.length,x,y,z,kind}; nodes.push(n); return n; }
    function link(a,b,extra={}) { edges.push({a:a.id,b:b.id,...extra}); }
    let current=node(-2,0,-1,'start'); current.dial=true;
    let token=0, switchIndex=0;
    const add=(dx,dz,kind='stone')=>{ const n=node(current.x+dx,current.y,current.z+dz,kind);link(current,n);current=n;return n; };
    add(1,0); add(1,0,'light').bit=1<<token++;
    for(let i=0;i<folds.length;i++) {
      current.dial=true;
      if(branch && (i===0 || (index>=7 && i===2))) {
        const origin=current;
        const [bx,bz]=inverse(0,-1,folds[i]);
        const a=node(origin.x+bx,origin.y,origin.z+bz);link(origin,a);
        const b=node(a.x+bx,a.y,a.z+bz,index>=3?'switch':'light');link(a,b);
        if(index>=3) { b.bit=1<<switchIndex++; b.dial=true; }
        else b.bit=1<<token++;
      }
      const view=folds[i];
      const [jx,jz]=inverse(3,2,view);
      const n=node(current.x+jx,current.y+2,current.z+jz,'stone');
      n.dial=true;
      link(current,n,{view,gate:(branch && index>=3 && (i===0 || (index>=7 && i===2)))?1<<(switchIndex-1):0});
      current=n;
      const [sx,sz]=inverse(1,0,view);
      add(sx,sz);
      const [tx,tz]=inverse(0,1,view);
      add(tx,tz,'light').bit=1<<token++;
      if(i<folds.length-1) add(tx,tz);
    }
    const [ex,ez]=inverse(1,0,folds.at(-1));
    add(ex,ez,'goal');
    return {id:index,name,story,help,nodes,edges,restricted,start:0,goal:current.id,allLights:(1<<token)-1,theme:THEMES[index%THEMES.length]};
  }
  const levels=CHAPTERS.map((_,i)=>makeLevel(i));
  const create=(id=0)=>({level:id,node:0,view:(levels[id].edges.find(e=>e.view!==undefined).view+1)%4,lights:0,switches:0,moves:0,won:false});
  function available(state) {
    const l=levels[state.level];
    return l.edges.filter(e=>(e.a===state.node || e.b===state.node) && (e.view===undefined || e.view===state.view) && (!e.gate || (state.switches&e.gate)===e.gate)).map(e=>e.a===state.node?e.b:e.a);
  }
  function canRotate(state) { const l=levels[state.level]; return !l.restricted || !!l.nodes[state.node].dial; }
  function apply(state,action) {
    if(state.won) return state;
    const l=levels[state.level], next={...state};
    if(action.type==='move') {
      if(!available(state).includes(action.node)) return state;
      next.node=action.node;
      const n=l.nodes[next.node];
      if(n.kind==='light') next.lights|=n.bit;
    } else if(action.type==='rotate') {
      if(!canRotate(state) || ![-1,1].includes(action.direction)) return state;
      next.view=(state.view+action.direction+4)%4;
    } else if(action.type==='switch') {
      const n=l.nodes[state.node];
      if(n.kind!=='switch') return state;
      next.switches^=n.bit;
    } else return state;
    next.moves++;
    next.won=next.node===l.goal && next.lights===l.allLights;
    return next;
  }
  function actions(state) {
    const list=available(state).map(node=>({type:'move',node}));
    if(canRotate(state)) list.push({type:'rotate',direction:-1},{type:'rotate',direction:1});
    if(levels[state.level].nodes[state.node].kind==='switch') list.push({type:'switch'});
    return list;
  }
  function solve(state) {
    const key=s=>[s.node,s.view,s.lights,s.switches].join(',');
    const seen=new Set([key(state)]), queue=[{s:state,parent:-1,action:null}];
    for(let cursor=0;cursor<queue.length && cursor<100000;cursor++) {
      const entry=queue[cursor];
      if(entry.s.won) { const path=[];let i=cursor;while(queue[i].parent!==-1){path.push(queue[i].action);i=queue[i].parent;}return path.reverse(); }
      for(const action of actions(entry.s)) {
        const s=apply(entry.s,action), k=key(s);
        if(seen.has(k)) continue;seen.add(k);queue.push({s,parent:cursor,action});
      }
    }
    return null;
  }
  function route(state,target) {
    const queue=[{s:state,path:[]}],seen=new Set([state.node]);
    for(let i=0;i<queue.length;i++) {
      const {s,path}=queue[i];if(s.node===target)return path;
      for(const n of available(s))if(!seen.has(n)){seen.add(n);queue.push({s:apply(s,{type:'move',node:n}),path:[...path,n]});}
    }
    return null;
  }
  function restoreProgress(raw) {
    const result={completed:{},selected:0};
    try { const data=JSON.parse(raw);if(data?.version!==1)return result;
      if(Number.isInteger(data.selected)&&data.selected>=0&&data.selected<10)result.selected=data.selected;
      for(let i=0;i<10;i++){const r=data.completed?.[i];if(r&&Number.isInteger(r.moves)&&r.moves>0&&r.moves<10000&&Number.isInteger(r.stars)&&r.stars>=1&&r.stars<=3)result.completed[i]={moves:r.moves,stars:r.stars};}
    }catch(_){}return result;
  }
  const api={levels,create,available,canRotate,apply,actions,solve,route,restoreProgress,inverse};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PrismCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
