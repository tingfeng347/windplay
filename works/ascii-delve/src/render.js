(function(root){
'use strict';
const SYMBOLS={gold:['$','#e3b768'],potion:['!','#b9a1cd'],key:['k','#f2cf7b'],weapon:['/','#dcdfc5'],armor:[']','#abbcc0'],trap:['^','#c18b76'],shrine:['+','#a7c18e'],merchant:['&','#d2b679'],lore:['?','#94b7ba']};
class DelveRenderer{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.state=null;this.full=false;this.resize=new ResizeObserver(()=>this.draw());this.resize.observe(canvas);}
 set(state){this.state=state;this.draw();}
 draw(){const s=this.state;if(!s)return;const C=DelveCore,ctx=this.ctx,w=this.canvas.clientWidth,h=this.canvas.clientHeight,dpr=Math.min(devicePixelRatio||1,2);if(!w||!h)return;if(this.canvas.width!==Math.round(w*dpr)||this.canvas.height!==Math.round(h*dpr)){this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#111814';ctx.fillRect(0,0,w,h);
 const cols=this.full?C.WIDTH:w<450?19:31,rows=this.full?C.HEIGHT:w<450?17:23,cw=w/cols,ch=h/rows;
 const left=this.full?0:s.player.x-Math.floor(cols/2),top=this.full?0:s.player.y-Math.floor(rows/2);this.metrics={cols,rows,cw,ch,left,top};
 ctx.font=Math.floor(Math.min(ch*.8,cw*1.35))+'px "SFMono-Regular",Consolas,"Liberation Mono",monospace';ctx.textAlign='center';ctx.textBaseline='middle';
 for(let ry=0;ry<rows;ry++)for(let rx=0;rx<cols;rx++){
  const x=left+rx,y=top+ry,px=(rx+.5)*cw,py=(ry+.5)*ch,inside=x>=0&&x<C.WIDTH&&y>=0&&y<C.HEIGHT,k=C.pos(x,y);
  if(!inside||!s.seen[k]){ctx.fillStyle='#263129';ctx.fillText((rx+ry*3)%11===0?'·':' ',px,py);continue;}
  const visible=s.visible[k],tile=s.tiles[k];let char=tile==='.'?'·':tile,color=visible?(tile==='#'?'#687e66':tile==='>'?'#abd1ca':'#576348'):'#354034';
  if(visible&&tile!== '#'){ctx.fillStyle='#a7c18e06';ctx.fillRect(rx*cw,ry*ch,cw,ch);}
  if(visible){const item=s.items.find(i=>i.x===x&&i.y===y);if(item)[char,color]=SYMBOLS[item.type]||['?','#e3b768'];
   const enemy=s.enemies.find(e=>e.x===x&&e.y===y);if(enemy){char=enemy.char;color=enemy.boss?'#ef966b':'#de9480';if(enemy.hp<enemy.maxHp){ctx.fillStyle='#514438';ctx.fillRect(rx*cw+2,ry*ch+ch-3,cw-4,2);ctx.fillStyle='#de9480';ctx.fillRect(rx*cw+2,ry*ch+ch-3,(cw-4)*enemy.hp/enemy.maxHp,2);}}
  }
  if(x===s.player.x&&y===s.player.y){char='@';color='#f9d78c';ctx.fillStyle='#e3b76819';ctx.fillRect(rx*cw,ry*ch,cw,ch);}
  ctx.fillStyle=color;ctx.fillText(char,px,py);
 }
 ctx.font='10px "SFMono-Regular",Consolas,monospace';ctx.textAlign='left';ctx.fillStyle='#899c89';ctx.fillText('X '+String(s.player.x).padStart(2,'0')+' / Y '+String(s.player.y).padStart(2,'0'),12,h-10);ctx.textAlign='right';ctx.fillText(this.full?'M / 返回灯火视野':'M / 已探索地图',w-12,h-10);
 }
}
root.DelveRenderer=DelveRenderer;
})(window);
