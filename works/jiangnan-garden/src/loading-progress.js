import {onResourceProgress} from './resource-loader.js';

// Logical asset bytes, not total network traffic: a CDN race or retry must not
// count the same file twice. Only verified/cached completion marks a file ready.
export function resourceProgress(files={}){
 const entries=new Map(Object.entries(files).map(([name,total])=>[name,{total,loaded:0,complete:false}]));
 return {
  update({url,loaded,complete=false}){
   const name='assets/'+new URL(url,'https://local.invalid/').pathname.split('/assets/').pop(),entry=entries.get(name);
   if(!entry)return;
   entry.loaded=complete?entry.total:Math.max(entry.loaded,Math.min(entry.total,Math.max(0,loaded)));
   entry.complete||=complete;
  },
  snapshot(){const values=[...entries.values()];return {loaded:values.reduce((sum,e)=>sum+e.loaded,0),total:values.reduce((sum,e)=>sum+e.total,0),complete:values.filter(e=>e.complete).length,count:values.length};}
 };
}

export function createLoadingProgress(){
 const $=id=>document.getElementById(id),bar=$('loading-progress'),label=$('loading-stage'),value=$('loading-value'),detail=$('loading-detail');
 const stages=['resources','environment','scene','render'],labels=['读取资源','准备光照','搭建园林','首次渲染'];
 const tasks=new Map([['environment','环境'],['materials','材质'],['flora','植被'],['furniture','家具']]),done=new Set();
 const content=document.querySelector('meta[name="windplay-loading-files"]')?.content;
 const resources=resourceProgress(content?JSON.parse(content):{});
 let stage='resources',frame=null,stopped=false;
 const mib=bytes=>(bytes/1048576).toFixed(1);
 function render(){
  if(frame!==null)cancelAnimationFrame(frame);frame=null;if(stopped)return;
  const index=stages.indexOf(stage);label.textContent=labels[index];
  document.querySelectorAll('[data-loading-stage]').forEach((element,i)=>{element.dataset.state=i<index?'done':i===index?'current':'pending';if(i===index)element.setAttribute('aria-current','step');else element.removeAttribute('aria-current');});
  const bytes=resources.snapshot(),pending=[...tasks].filter(([key])=>!done.has(key)).map(([,name])=>name).join('、');
  if(stage==='resources'&&bytes.total){
   const percent=Math.floor(bytes.loaded/bytes.total*100);bar.value=percent;value.textContent=`${percent}%`;
   detail.textContent=bytes.complete<bytes.count?`${mib(bytes.loaded)} / ${mib(bytes.total)} MiB · ${bytes.complete} / ${bytes.count} 份资源就绪`:`资源读取完成 · 正在处理${pending||'场景数据'}`;
   bar.setAttribute('aria-valuetext',`初始资源已读取 ${percent}%`);
  }else{
   bar.removeAttribute('value');bar.removeAttribute('aria-valuetext');value.textContent='';
   detail.textContent=stage==='resources'?`离线资源解析中 · ${done.size} / ${tasks.size} 项就绪`:
    stage==='environment'?'正在生成天空光照与水面反射':stage==='scene'?'正在搭建木构、山石与室内陈设':'正在编译材质并绘制第一帧，首次打开可能需要稍候';
  }
 }
 const unsubscribe=content?onResourceProgress(event=>{resources.update(event);if(frame===null&&!stopped)frame=requestAnimationFrame(render);}):()=>{};
 return {
  get label(){return labels[stages.indexOf(stage)];},
  taskDone(name){done.add(name);render();},
  async stage(name){stage=name;render();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));},
  stop(){stopped=true;unsubscribe();if(frame!==null)cancelAnimationFrame(frame);frame=null;}
 };
}
